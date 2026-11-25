/**
 * Reads Garmin data that Garmin Connect has written into Android Health Connect.
 * One-way read only; this app never writes to Health Connect.
 */
import {
  aggregateGroupByPeriod,
  ExerciseType,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
  type Permission,
  type ReadRecordsOptions,
  type RecordType,
} from 'react-native-health-connect';

import { TUNABLES } from '@/config/tunables';
import type { ActivityType } from '@/db/schema';
import { startOfLocalDay, toDateKey, type DateKey } from '@/domain/dates';

import type { ActivitySource, SourceActivity, SourceDaily, SourceData, SourceSleep, SourceWeight } from './types';
import { addHrSample, averageHr, chunks, covering, longestSpanMs, sumWithoutOverlap, type HrTotals, type Measured, type Span } from './windowing';

export const READ_TYPES = [
  'ExerciseSession',
  'HeartRate',
  'RestingHeartRate',
  'HeartRateVariabilityRmssd',
  'SleepSession',
  'Steps',
  'ActiveCaloriesBurned',
  'Distance',
  'Weight',
  'Vo2Max',
] as const satisfies readonly RecordType[];

const PERMISSIONS: Permission[] = READ_TYPES.map((recordType) => ({ accessType: 'read', recordType }));

export type HealthConnectStatus = 'available' | 'needs_update' | 'unavailable';

export async function healthConnectStatus(): Promise<HealthConnectStatus> {
  const status = await getSdkStatus();
  if (status === SdkAvailabilityStatus.SDK_AVAILABLE) return 'available';
  if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'needs_update';
  return 'unavailable';
}

/** Asks for every read permission plus history (older than 30 days) and background reads. */
export async function connectHealthConnect(): Promise<{ granted: string[]; missing: string[] }> {
  await initialize();
  await requestPermission([
    ...PERMISSIONS,
    { accessType: 'read', recordType: 'ReadHealthDataHistory' },
    { accessType: 'read', recordType: 'BackgroundAccessPermission' },
  ]);
  return grantedSummary();
}

export async function grantedSummary(): Promise<{ granted: string[]; missing: string[] }> {
  await initialize();
  const granted = (await getGrantedPermissions()).map((p) => p.recordType as string);
  const missing = READ_TYPES.filter((t) => !granted.includes(t));
  return { granted, missing };
}

export { openHealthConnectSettings };

async function readAll<T extends RecordType>(recordType: T, options: Omit<ReadRecordsOptions, 'pageToken'>) {
  const records = [];
  let pageToken: string | undefined;
  do {
    const page = await readRecords(recordType, { ...options, pageSize: 1000, pageToken });
    records.push(...page.records);
    pageToken = page.pageToken;
  } while (pageToken);
  return records;
}

/**
 * Limits a read to records Garmin Connect wrote. Used for steps, calories, distance and workouts,
 * which the phone also records on its own (Samsung Health counts steps and auto-detects walks);
 * mixing those in makes the numbers disagree with Garmin Connect. Heart rate, sleep, HRV, weight
 * and VO2 max are read from every app, since the phone cannot measure those.
 */
const GARMIN_ONLY = { dataOriginFilter: [TUNABLES.sync.watchApp] };

const between = (fromMs: number, toMs: number) =>
  ({ operator: 'between', startTime: new Date(fromMs).toISOString(), endTime: new Date(toMs).toISOString() }) as const;

/** Health Connect exercise type → our coarse activity type. */
export function mapExerciseType(code: number): ActivityType {
  switch (code) {
    case ExerciseType.RUNNING:
    case ExerciseType.RUNNING_TREADMILL:
      return 'run';
    case ExerciseType.TENNIS:
    case ExerciseType.TABLE_TENNIS:
    case ExerciseType.RACQUETBALL:
    case ExerciseType.SQUASH:
    case ExerciseType.BADMINTON:
      return 'tennis';
    case ExerciseType.STRENGTH_TRAINING:
    case ExerciseType.WEIGHTLIFTING:
    case ExerciseType.CALISTHENICS:
    case ExerciseType.HIGH_INTENSITY_INTERVAL_TRAINING:
      return 'strength';
    case ExerciseType.WALKING:
    case ExerciseType.HIKING:
      return 'walk';
    case ExerciseType.YOGA:
    case ExerciseType.PILATES:
    case ExerciseType.STRETCHING:
      return 'yoga';
    case ExerciseType.BIKING:
    case ExerciseType.BIKING_STATIONARY:
      return 'cycling';
    case ExerciseType.SWIMMING_POOL:
    case ExerciseType.SWIMMING_OPEN_WATER:
      return 'swim';
    default:
      return 'other';
  }
}

const TYPE_TITLES: Record<ActivityType, string> = {
  run: 'Run',
  tennis: 'Tennis',
  strength: 'Strength',
  walk: 'Walk',
  yoga: 'Yoga',
  cycling: 'Ride',
  swim: 'Swim',
  other: 'Workout',
};

/**
 * One activity being built up as records stream past, so heart-rate samples never all sit in
 * memory at once. Only the running totals are kept. startMs/endMs are on the accumulator itself
 * so `covering` can binary-search it directly.
 */
interface SessionAccumulator extends Span {
  session: SourceActivity;
  hr: HrTotals;
  /** Kept as records rather than a running total so overlapping ones can be skipped at the end. */
  distances: Measured[];
  kcals: Measured[];
}

/**
 * Steps and active calories per day, as Health Connect itself totals them for the watch app.
 *
 * Not by adding up the raw records: the store can hold the same stretch of time twice when the
 * watch re-sends it, and adding every record up counts those minutes twice. That is what pushed
 * a 5,006-step day to 5,726. Health Connect's aggregation removes the overlap.
 *
 * Only the watch app's records count (`TUNABLES.sync.watchApp`), so the numbers match Garmin
 * Connect. Across all apps, Health Connect fills gaps in the watch's record with steps the phone
 * counted (Samsung Health, for one), which read 9,673 on a day Garmin Connect showed 9,087. The
 * iOS reader uses Apple's daily statistics instead.
 *
 * A day with no records aggregates to zero, which is stored as "no data" rather than a real zero,
 * matching how the rest of the app treats a missing day.
 */
async function dailyTotals(fromMs: number, toMs: number): Promise<Map<DateKey, { steps: number | null; activeKcal: number | null }>> {
  // Anchored at local midnight. Health Connect starts its day-long buckets at the beginning of the
  // range, so asking from the time of the last sync would slice days at, say, 18:40, and today's
  // steps would be filed under yesterday.
  const timeRangeFilter = between(startOfLocalDay(fromMs), toMs);
  const timeRangeSlicer = { period: 'DAYS', length: 1 } as const;
  const byDay = new Map<DateKey, { steps: number | null; activeKcal: number | null }>();
  const forDay = (date: DateKey) => {
    const existing = byDay.get(date);
    if (existing) return existing;
    const fresh = { steps: null as number | null, activeKcal: null as number | null };
    byDay.set(date, fresh);
    return fresh;
  };

  const [steps, calories] = await Promise.all([
    aggregateGroupByPeriod({ recordType: 'Steps', timeRangeFilter, timeRangeSlicer, ...GARMIN_ONLY }),
    aggregateGroupByPeriod({ recordType: 'ActiveCaloriesBurned', timeRangeFilter, timeRangeSlicer, ...GARMIN_ONLY }),
  ]);

  for (const group of steps) {
    const total = group.result.COUNT_TOTAL;
    if (total > 0) forDay(toDateKey(new Date(group.startTime))).steps = total;
  }
  for (const group of calories) {
    const total = group.result.ACTIVE_CALORIES_TOTAL.inKilocalories;
    if (total > 0) forDay(toDateKey(new Date(group.startTime))).activeKcal = total;
  }
  return byDay;
}

export const healthConnectSource: ActivitySource = {
  id: 'health_connect',

  async read(fromMs, toMs): Promise<SourceData> {
    await initialize();

    // Sessions first, over the whole window. There are only a handful a day, and having them all
    // up front means a record from any chunk can be attributed to the session it belongs to even
    // when that session straddles a chunk boundary.
    const sessions = await readAll('ExerciseSession', { timeRangeFilter: between(fromMs, toMs), ascendingOrder: true, ...GARMIN_ONLY });
    const accumulators: SessionAccumulator[] = sessions
      .map((s) => {
        const startMs = Date.parse(s.startTime);
        const endMs = Date.parse(s.endTime);
        const type = mapExerciseType(s.exerciseType);
        return {
          startMs,
          endMs,
          session: {
            externalId: `hc:${s.metadata?.id ?? `${s.startTime}-${s.endTime}`}`,
            type,
            title: s.title?.trim() || TYPE_TITLES[type],
            startMs,
            endMs,
            distanceM: null,
            avgHr: null,
            maxHr: null,
            activeKcal: null,
          } as SourceActivity,
          hr: { sum: 0, count: 0, max: null } as HrTotals,
          distances: [] as Measured[],
          kcals: [] as Measured[],
        };
      })
      .sort((a, b) => a.startMs - b.startMs);
    const longestSessionMs = longestSpanMs(accumulators);

    const sleep: SourceSleep[] = [];
    const weightRows: SourceWeight[] = [];
    const daily = new Map<DateKey, SourceDaily>();
    const day = (date: DateKey) => {
      const existing = daily.get(date);
      if (existing) return existing;
      const fresh: SourceDaily = { date, restingHr: null, hrvRmssd: null, steps: null, activeKcal: null, vo2Max: null };
      daily.set(date, fresh);
      return fresh;
    };
    const hrvByDay = new Map<DateKey, number[]>();

    // Everything else a month at a time, folded into totals as it arrives and then dropped.
    for (const chunk of chunks(fromMs, toMs, TUNABLES.sync.chunkDays)) {
      const filter = { timeRangeFilter: between(chunk.startMs, chunk.endMs), ascendingOrder: true };
      const [hrRecords, distances, restingHr, hrv, sleeps, calories, weights, vo2Max] = await Promise.all([
        readAll('HeartRate', filter),
        readAll('Distance', { ...filter, ...GARMIN_ONLY }),
        readAll('RestingHeartRate', filter),
        readAll('HeartRateVariabilityRmssd', filter),
        readAll('SleepSession', filter),
        readAll('ActiveCaloriesBurned', { ...filter, ...GARMIN_ONLY }),
        readAll('Weight', filter),
        readAll('Vo2Max', filter),
      ]);

      for (const record of hrRecords) {
        for (const sample of record.samples) {
          const ms = Date.parse(sample.time);
          for (const match of covering(accumulators, ms, longestSessionMs)) addHrSample(match.hr, sample.beatsPerMinute);
        }
      }

      // Distance and calorie records are intervals: they count toward a session only if they sit
      // entirely inside it, which is what the old whole-window pass did too.
      // Collected per session first, then added up ignoring overlaps, for the same reason as the
      // daily totals: a re-sent stretch would otherwise be counted twice, and an inflated run
      // distance would quietly corrupt the paces the plan is built from.
      for (const record of distances) {
        const startMs = Date.parse(record.startTime);
        const endMs = Date.parse(record.endTime);
        for (const match of covering(accumulators, startMs, longestSessionMs)) {
          if (endMs <= match.endMs) match.distances.push({ startMs, endMs, value: record.distance.inMeters });
        }
      }

      for (const record of calories) {
        const startMs = Date.parse(record.startTime);
        const endMs = Date.parse(record.endTime);
        for (const match of covering(accumulators, startMs, longestSessionMs)) {
          if (endMs <= match.endMs) match.kcals.push({ startMs, endMs, value: record.energy.inKilocalories });
        }
      }

      for (const r of restingHr) day(toDateKey(new Date(r.time))).restingHr = r.beatsPerMinute;
      for (const r of hrv) {
        const key = toDateKey(new Date(r.time));
        hrvByDay.set(key, [...(hrvByDay.get(key) ?? []), r.heartRateVariabilityMillis]);
      }
      // Garmin updates VO2 max occasionally, not daily; the last reading of a day wins.
      for (const r of vo2Max) day(toDateKey(new Date(r.time))).vo2Max = r.vo2MillilitersPerMinuteKilogram;

      for (const s of sleeps) {
        sleep.push({
          externalId: `hc:${s.metadata?.id ?? `${s.startTime}-${s.endTime}`}`,
          startMs: Date.parse(s.startTime),
          endMs: Date.parse(s.endTime),
          stages: (s.stages ?? []).map((st) => ({ start: Date.parse(st.startTime), end: Date.parse(st.endTime), stage: st.stage })),
        });
      }
      for (const w of weights) {
        weightRows.push({ externalId: `hc:${w.metadata?.id ?? w.time}`, ms: Date.parse(w.time), kg: w.weight.inKilograms });
      }
    }

    for (const [key, values] of hrvByDay) day(key).hrvRmssd = values.reduce((a, b) => a + b, 0) / values.length;

    for (const [key, totals] of await dailyTotals(fromMs, toMs)) {
      const d = day(key);
      d.steps = totals.steps;
      d.activeKcal = totals.activeKcal;
    }

    const activities: SourceActivity[] = accumulators.map(({ session, hr, distances, kcals }) => {
      const distanceM = sumWithoutOverlap(distances);
      const kcal = sumWithoutOverlap(kcals);
      return { ...session, avgHr: averageHr(hr), maxHr: hr.max, distanceM: distanceM > 0 ? distanceM : null, activeKcal: kcal > 0 ? kcal : null };
    });

    return { activities, sleep, daily: [...daily.values()], weights: weightRows };
  },
};

export interface RecordProbe {
  type: string;
  /** Records in the recent window, or -1 when the read failed (message in `error`). */
  count: number;
  latest: string | null;
  /** Oldest record Health Connect will hand over, which is the real limit on history. */
  earliest: string | null;
  error: string | null;
}

/** How far back the "oldest record" probe looks. Nothing is read, only the first record's time. */
const PROBE_YEARS = 10;

/**
 * What Health Connect actually holds, for the Data Inspector.
 *
 * `count` and `latest` cover the recent window so you can see Garmin is still writing. `earliest`
 * is the one that answers "how much history can this app ever see": it asks for a single record
 * from as far back as ten years and reports its timestamp. Reading older than 30 days needs the
 * history permission, so a failure here usually means that permission was not granted.
 */
export async function inspectRecordCounts(fromMs: number, toMs: number): Promise<RecordProbe[]> {
  await initialize();
  const probeFromMs = toMs - PROBE_YEARS * 365 * 86400000;
  const results: RecordProbe[] = [];

  for (const type of READ_TYPES) {
    try {
      const records = await readAll(type, { timeRangeFilter: between(fromMs, toMs), ascendingOrder: false });
      const newest = records[0] as { time?: string; startTime?: string; endTime?: string } | undefined;

      let earliest: string | null = null;
      try {
        // One record, oldest first: cheap however much history exists.
        const page = await readRecords(type, { timeRangeFilter: between(probeFromMs, toMs), ascendingOrder: true, pageSize: 1 });
        const oldest = page.records[0] as { time?: string; startTime?: string } | undefined;
        earliest = oldest?.startTime ?? oldest?.time ?? null;
      } catch {
        // Leave earliest null; the count above still succeeded, so this is a history-permission
        // problem rather than the type being unreadable.
        earliest = null;
      }

      results.push({ type, count: records.length, latest: newest?.endTime ?? newest?.time ?? null, earliest, error: null });
    } catch (error) {
      results.push({ type, count: -1, latest: null, earliest: null, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return results;
}
