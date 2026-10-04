/**
 * Reads Garmin data that Garmin Connect has written into Apple Health, on iOS. One-way read only;
 * this app never writes to Apple Health.
 *
 * Mirrors healthConnect.ts: same output shape, same month-at-a-time reading so a long backfill
 * never holds every heart-rate sample in memory. Two Apple-specific choices are worth knowing:
 *
 * - Steps and active calories come from HealthKit's daily statistics, not by adding up raw
 *   samples. An iPhone counts steps too, and only the statistics query de-duplicates the phone
 *   against the watch. Summing samples would roughly double your steps.
 * - Heart-rate variability is SDNN, the only HRV Apple Health offers. It is stored in the same
 *   column as Health Connect's RMSSD. Readiness compares today with your own recent baseline, so
 *   it works either way, but the numbers are not comparable across the two phones.
 *
 * This module imports fine on Android (the library ships a stub there); it is only called on iOS.
 */
import {
  getRequestStatusForAuthorization,
  isHealthDataAvailableAsync,
  queryCategorySamples,
  queryQuantitySamples,
  queryStatisticsCollectionForQuantity,
  queryStatisticsForQuantity,
  queryWorkoutSamples,
  requestAuthorization,
  AuthorizationRequestStatus,
  type ObjectTypeIdentifier,
  type QuantityTypeIdentifier,
} from '@kingstinct/react-native-healthkit';

import { TUNABLES } from '@/config/tunables';
import { toDateKey, type DateKey } from '@/domain/dates';

import { groupSleepSessions, mapWorkoutType } from './appleHealthMapping';
import type { ActivitySource, SourceActivity, SourceDaily, SourceData, SourceWeight } from './types';
import { addHrSample, averageHr, chunks, covering, longestSpanMs, type HrTotals, type Span } from './windowing';

const WORKOUTS = 'HKWorkoutTypeIdentifier';
const HEART_RATE = 'HKQuantityTypeIdentifierHeartRate';
const RESTING_HR = 'HKQuantityTypeIdentifierRestingHeartRate';
const HRV = 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN';
const SLEEP = 'HKCategoryTypeIdentifierSleepAnalysis';
const STEPS = 'HKQuantityTypeIdentifierStepCount';
const ACTIVE_ENERGY = 'HKQuantityTypeIdentifierActiveEnergyBurned';
const DISTANCE_ON_FOOT = 'HKQuantityTypeIdentifierDistanceWalkingRunning';
const DISTANCE_CYCLING = 'HKQuantityTypeIdentifierDistanceCycling';
const BODY_MASS = 'HKQuantityTypeIdentifierBodyMass';
const VO2_MAX = 'HKQuantityTypeIdentifierVO2Max';

/** Everything this app reads, in the order the Data Inspector lists it. */
export const READ_TYPES: readonly ObjectTypeIdentifier[] = [WORKOUTS, HEART_RATE, RESTING_HR, HRV, SLEEP, STEPS, ACTIVE_ENERGY, DISTANCE_ON_FOOT, DISTANCE_CYCLING, BODY_MASS, VO2_MAX];

/** Friendly names for the inspector. */
const TYPE_NAMES: Record<string, string> = {
  [WORKOUTS]: 'Workouts',
  [HEART_RATE]: 'Heart rate',
  [RESTING_HR]: 'Resting heart rate',
  [HRV]: 'HRV (SDNN)',
  [SLEEP]: 'Sleep',
  [STEPS]: 'Steps',
  [ACTIVE_ENERGY]: 'Active energy',
  [DISTANCE_ON_FOOT]: 'Walking + running distance',
  [DISTANCE_CYCLING]: 'Cycling distance',
  [BODY_MASS]: 'Weight',
  [VO2_MAX]: 'VO2 max',
};

/**
 * Units are always passed explicitly. HealthKit's default for heart rate is beats per *second*,
 * so leaving it out would record a 150 bpm run as 2.5.
 */
const UNITS = {
  bpm: 'count/min',
  ms: 'ms',
  count: 'count',
  kcal: 'kcal',
  meters: 'm',
  kg: 'kg',
  vo2: 'ml/(kg*min)',
} as const;

const TITLES: Record<SourceActivity['type'], string> = {
  run: 'Run',
  tennis: 'Tennis',
  strength: 'Strength',
  walk: 'Walk',
  yoga: 'Yoga',
  cycling: 'Ride',
  swim: 'Swim',
  other: 'Workout',
};

const dateFilter = (fromMs: number, toMs: number) => ({ date: { startDate: new Date(fromMs), endDate: new Date(toMs) } });

export type AppleHealthStatus = 'available' | 'unavailable';

export async function appleHealthStatus(): Promise<AppleHealthStatus> {
  return (await isHealthDataAvailableAsync()) ? 'available' : 'unavailable';
}

/**
 * Shows Apple's permission sheet. Apple never tells an app whether you allowed reading, on
 * purpose, so "connected" here means the sheet has been answered. If a category was switched
 * off, its reads simply come back empty, which the Data Inspector makes visible.
 */
export async function connectAppleHealth(): Promise<{ asked: boolean }> {
  await requestAuthorization({ toRead: READ_TYPES });
  const status = await getRequestStatusForAuthorization({ toRead: READ_TYPES });
  return { asked: status === AuthorizationRequestStatus.unnecessary };
}

interface WorkoutAccumulator extends Span {
  session: SourceActivity;
  hr: HrTotals;
}

/** Daily cumulative totals (steps, active energy), with HealthKit's own de-duplication across devices. */
async function dailySums(identifier: QuantityTypeIdentifier, unit: string, fromMs: number, toMs: number): Promise<Map<DateKey, number>> {
  const from = new Date(fromMs);
  const anchor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const buckets = await queryStatisticsCollectionForQuantity(identifier, ['cumulativeSum'], anchor, { day: 1 }, { filter: dateFilter(anchor.getTime(), toMs), unit });
  const out = new Map<DateKey, number>();
  for (const bucket of buckets) {
    if (!bucket.startDate || bucket.sumQuantity === undefined) continue;
    out.set(toDateKey(new Date(bucket.startDate)), bucket.sumQuantity.quantity);
  }
  return out;
}

export const appleHealthSource: ActivitySource = {
  id: 'apple_health',

  async read(fromMs, toMs): Promise<SourceData> {
    const all = { filter: dateFilter(fromMs, toMs), limit: -1, ascending: true };

    // Workouts first, over the whole window: a handful a day, and knowing them all up front lets
    // heart-rate samples from any chunk find their workout.
    const workouts = await queryWorkoutSamples(all);
    const accumulators: WorkoutAccumulator[] = [];
    for (const w of workouts) {
      const startMs = new Date(w.startDate).getTime();
      const endMs = new Date(w.endDate).getTime();
      const type = mapWorkoutType(w.workoutActivityType);

      // Garmin normally includes the distance with the workout. If not, add up the distance
      // samples inside it, using the right kind of distance for the sport.
      let distanceM = w.totalDistance?.quantity ?? null;
      if ((distanceM === null || distanceM === 0) && (type === 'run' || type === 'walk' || type === 'cycling')) {
        const stats = await queryStatisticsForQuantity(type === 'cycling' ? DISTANCE_CYCLING : DISTANCE_ON_FOOT, ['cumulativeSum'], {
          filter: dateFilter(startMs, endMs),
          unit: UNITS.meters,
        });
        distanceM = stats.sumQuantity?.quantity ?? null;
      }

      accumulators.push({
        startMs,
        endMs,
        hr: { sum: 0, count: 0, max: null },
        session: {
          externalId: `hk:${w.uuid}`,
          type,
          title: TITLES[type],
          startMs,
          endMs,
          distanceM: distanceM && distanceM > 0 ? distanceM : null,
          avgHr: null,
          maxHr: null,
          activeKcal: w.totalEnergyBurned && w.totalEnergyBurned.quantity > 0 ? w.totalEnergyBurned.quantity : null,
        },
      });
    }
    accumulators.sort((a, b) => a.startMs - b.startMs);
    const longest = longestSpanMs(accumulators);

    // Heart rate a month at a time, folded straight into each workout's running totals.
    for (const chunk of chunks(fromMs, toMs, TUNABLES.sync.chunkDays)) {
      const samples = await queryQuantitySamples(HEART_RATE, { filter: dateFilter(chunk.startMs, chunk.endMs), limit: -1, ascending: true, unit: UNITS.bpm });
      for (const s of samples) {
        const ms = new Date(s.startDate).getTime();
        for (const match of covering(accumulators, ms, longest)) addHrSample(match.hr, s.quantity);
      }
    }

    const [restingHr, hrv, sleep, weights, vo2, steps, activeKcal] = await Promise.all([
      queryQuantitySamples(RESTING_HR, { ...all, unit: UNITS.bpm }),
      queryQuantitySamples(HRV, { ...all, unit: UNITS.ms }),
      queryCategorySamples(SLEEP, all),
      queryQuantitySamples(BODY_MASS, { ...all, unit: UNITS.kg }),
      queryQuantitySamples(VO2_MAX, { ...all, unit: UNITS.vo2 }),
      dailySums(STEPS, UNITS.count, fromMs, toMs),
      dailySums(ACTIVE_ENERGY, UNITS.kcal, fromMs, toMs),
    ]);

    const daily = new Map<DateKey, SourceDaily>();
    const day = (date: DateKey) => {
      const existing = daily.get(date);
      if (existing) return existing;
      const fresh: SourceDaily = { date, restingHr: null, hrvRmssd: null, steps: null, activeKcal: null, vo2Max: null };
      daily.set(date, fresh);
      return fresh;
    };

    // Resting HR and VO2 max: the last reading of each day wins, as on Android.
    for (const r of restingHr) day(toDateKey(new Date(r.startDate))).restingHr = Math.round(r.quantity);
    for (const r of vo2) day(toDateKey(new Date(r.startDate))).vo2Max = Math.round(r.quantity * 10) / 10;

    const hrvByDay = new Map<DateKey, number[]>();
    for (const r of hrv) {
      const key = toDateKey(new Date(r.startDate));
      hrvByDay.set(key, [...(hrvByDay.get(key) ?? []), r.quantity]);
    }
    for (const [key, values] of hrvByDay) day(key).hrvRmssd = values.reduce((a, b) => a + b, 0) / values.length;

    for (const [key, value] of steps) day(key).steps = Math.round(value);
    for (const [key, value] of activeKcal) day(key).activeKcal = value;

    const activities: SourceActivity[] = accumulators.map(({ session, hr }) => ({ ...session, avgHr: averageHr(hr), maxHr: hr.max }));

    const sleepSessions = groupSleepSessions(
      sleep.map((s) => ({
        startMs: new Date(s.startDate).getTime(),
        endMs: new Date(s.endDate).getTime(),
        value: Number(s.value),
        sourceId: s.sourceRevision?.source?.bundleIdentifier ?? 'unknown',
      })),
    );

    const weightRows: SourceWeight[] = weights.map((w) => ({ externalId: `hk:${w.uuid}`, ms: new Date(w.startDate).getTime(), kg: w.quantity }));

    return { activities, sleep: sleepSessions, daily: [...daily.values()], weights: weightRows };
  },
};

export interface AppleHealthProbe {
  type: string;
  count: number;
  latest: string | null;
  earliest: string | null;
  error: string | null;
}

/** How far back the oldest-record probe looks. */
const PROBE_YEARS = 10;

/**
 * What Apple Health holds for each type, for the Data Inspector: how many records in the recent
 * window, and the oldest one it will hand over. Apple hides whether reading was refused, so a
 * type you switched off shows as "none" rather than as an error.
 */
export async function inspectAppleHealth(fromMs: number, toMs: number): Promise<AppleHealthProbe[]> {
  const probeFrom = toMs - PROBE_YEARS * 365 * 86400000;
  const results: AppleHealthProbe[] = [];

  for (const type of READ_TYPES) {
    const name = TYPE_NAMES[type] ?? type;
    try {
      const recent = async (ascending: boolean, from: number, limit: number): Promise<{ startDate: Date; endDate: Date }[]> => {
        const options = { filter: dateFilter(from, toMs), limit, ascending };
        if (type === WORKOUTS) return [...(await queryWorkoutSamples(options))];
        if (type === SLEEP) return [...(await queryCategorySamples(SLEEP, options))];
        return [...(await queryQuantitySamples(type as QuantityTypeIdentifier, options))];
      };
      const inWindow = await recent(false, fromMs, -1);
      const oldest = (await recent(true, probeFrom, 1))[0];
      results.push({
        type: name,
        count: inWindow.length,
        latest: inWindow[0] ? new Date(inWindow[0].endDate).toISOString() : null,
        earliest: oldest ? new Date(oldest.startDate).toISOString() : null,
        error: null,
      });
    } catch (error) {
      results.push({ type: name, count: -1, latest: null, earliest: null, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return results;
}
