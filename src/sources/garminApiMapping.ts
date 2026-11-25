/**
 * Pure translation from Garmin Personal API JSON to this app's own shapes, with no native or
 * network imports so it can be unit tested against the saved responses in __fixtures__/garmin.
 * The reader in garminApi.ts makes the requests and hands the parsed JSON here.
 *
 * Garmin does not document these responses. The shapes below were read off real ones captured
 * with scripts/capture-garmin-fixtures.js in November 2026, and list only the fields this app
 * uses. Every field is treated as possibly missing, so a change on Garmin's side loses a number
 * rather than crashing the sync.
 */
import type { ActivityType } from '@/db/schema';
import { addDays, daysBetween, toDateKey, type DateKey } from '@/domain/dates';
import { SLEEP_STAGE } from '@/domain/sleepScore';

import type { SourceActivity, SourceDaily, SourceSleep, SourceWeight } from './types';

// ───────────────────────────── activities ─────────────────────────────

/** Garmin activity type keys, grouped into our coarse types. Anything not listed is "other". */
export const GARMIN_TYPE_KEYS: Record<Exclude<ActivityType, 'other'>, readonly string[]> = {
  run: ['running', 'indoor_running', 'obstacle_run', 'street_running', 'track_running', 'trail_running', 'treadmill_running', 'ultra_run', 'virtual_run'],
  cycling: [
    'cycling', 'bmx', 'cyclocross', 'downhill_biking', 'e_bike_fitness', 'e_bike_mountain', 'e_enduro_mtb', 'enduro_mtb', 'gravel_cycling',
    'hand_cycling', 'indoor_cycling', 'indoor_hand_cycling', 'mountain_biking', 'recumbent_cycling', 'road_biking', 'track_cycling', 'virtual_ride',
  ],
  swim: ['swimming', 'lap_swimming', 'open_water_swimming'],
  tennis: ['racket_sports', 'tennis', 'tennis_v2', 'badminton', 'paddelball', 'pickleball', 'platform_tennis', 'racquetball', 'squash', 'table_tennis'],
  strength: ['strength_training', 'hiit'],
  walk: ['walking', 'casual_walking', 'speed_walking', 'hiking', 'rucking'],
  yoga: ['yoga', 'pilates', 'mobility'],
};

const TYPE_BY_KEY = new Map<string, ActivityType>(
  (Object.entries(GARMIN_TYPE_KEYS) as [ActivityType, readonly string[]][]).flatMap(([type, keys]) => keys.map((key) => [key, type] as const)),
);

/** Garmin activity type key → our coarse activity type. Mirrors mapExerciseType for Health Connect. */
export function mapActivityType(typeKey: string | null | undefined): ActivityType {
  return TYPE_BY_KEY.get(typeKey ?? '') ?? 'other';
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

/** One entry from `/activitylist-service/activities/search/activities`. */
export interface GarminActivity {
  activityId?: number | null;
  activityName?: string | null;
  activityType?: { typeKey?: string | null } | null;
  /** Start, epoch ms. */
  beginTimestamp?: number | null;
  /** Start as "2026-11-14 12:23:16", UTC. Used when beginTimestamp is missing. */
  startTimeGMT?: string | null;
  /** Timer time in seconds, which leaves out pauses. */
  duration?: number | null;
  /** Start to finish in seconds, pauses included. */
  elapsedDuration?: number | null;
  /** Metres. */
  distance?: number | null;
  averageHR?: number | null;
  maxHR?: number | null;
  /** Everything burned during the activity, including what you would have burned at rest. */
  calories?: number | null;
  /** The at-rest part of `calories`. */
  bmrCalories?: number | null;
}

function positive(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function rounded(value: number | null | undefined): number | null {
  const n = positive(value);
  return n === null ? null : Math.round(n);
}

/** "2026-11-14 12:23:16" (UTC) → epoch ms. */
function parseGmt(text: string | null | undefined): number | null {
  if (!text) return null;
  const ms = Date.parse(`${text.replace(' ', 'T')}Z`);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Garmin's activity list → our activities. Entries without an id, a start or a duration are
 * skipped, since nothing useful can be stored for them.
 *
 * The end is the start plus elapsed time, pauses included. That is the real time you finished,
 * and it matches what Garmin writes into Health Connect and Apple Health for the same activity,
 * so the duplicate check recognises the two copies after a change of source.
 *
 * Active calories are total minus the at-rest part, to match the phone health store's figure.
 */
export function mapActivities(list: readonly GarminActivity[] | null | undefined): SourceActivity[] {
  if (!Array.isArray(list)) return [];
  return list.flatMap((a: GarminActivity) => {
    const startMs = positive(a.beginTimestamp) ?? parseGmt(a.startTimeGMT);
    const seconds = positive(a.elapsedDuration) ?? positive(a.duration);
    if (typeof a.activityId !== 'number' || startMs === null || seconds === null) return [];

    const type = mapActivityType(a.activityType?.typeKey);
    const total = positive(a.calories);
    return [
      {
        externalId: `garmin:${a.activityId}`,
        type,
        title: a.activityName?.trim() || TYPE_TITLES[type],
        startMs,
        endMs: startMs + Math.round(seconds * 1000),
        distanceM: positive(a.distance),
        avgHr: rounded(a.averageHR),
        maxHr: rounded(a.maxHR),
        activeKcal: total === null ? null : Math.max(0, total - (positive(a.bmrCalories) ?? 0)),
      },
    ];
  });
}

// ───────────────────────────── sleep ─────────────────────────────

/** One night from `/sleep-service/sleep/dailySleepSummariesByDate`. */
export interface GarminSleepSummary {
  /** The morning you woke up. */
  calendarDate?: string | null;
  /** Epoch ms. The "Local" twins of these are shifted by the UTC offset and are not real instants. */
  sleepStartTimestampGMT?: number | null;
  sleepEndTimestampGMT?: number | null;
  deepSleepSeconds?: number | null;
  lightSleepSeconds?: number | null;
  remSleepSeconds?: number | null;
  awakeSleepSeconds?: number | null;
}

/**
 * Garmin's nightly summaries → our sleep sessions.
 *
 * The Personal API gives the total time in each stage but not when each stage happened. The sleep
 * score only needs the totals, so each night is stored as one block per stage laid end to end
 * (deep, light, REM, awake). The minutes are Garmin's; the order inside the night is made up.
 * Garmin's totals can differ from the night's length by a minute or so, and are kept as given.
 *
 * The id is the wake-up date, so when Garmin later revises a night it replaces the same row.
 */
export function mapSleep(list: readonly GarminSleepSummary[] | null | undefined): SourceSleep[] {
  if (!Array.isArray(list)) return [];
  return list.flatMap((night: GarminSleepSummary) => {
    const startMs = positive(night.sleepStartTimestampGMT);
    const endMs = positive(night.sleepEndTimestampGMT);
    if (startMs === null || endMs === null || endMs <= startMs) return [];

    const totals: [number, number | null | undefined][] = [
      [SLEEP_STAGE.DEEP, night.deepSleepSeconds],
      [SLEEP_STAGE.LIGHT, night.lightSleepSeconds],
      [SLEEP_STAGE.REM, night.remSleepSeconds],
      [SLEEP_STAGE.AWAKE, night.awakeSleepSeconds],
    ];
    const stages: SourceSleep['stages'] = [];
    let cursor = startMs;
    for (const [stage, seconds] of totals) {
      const ms = (positive(seconds) ?? 0) * 1000;
      if (ms === 0) continue;
      stages.push({ start: cursor, end: cursor + ms, stage });
      cursor += ms;
    }

    return [{ externalId: `garmin:sleep:${night.calendarDate ?? startMs}`, startMs, endMs, stages }];
  });
}

// ───────────────────────────── daily numbers ─────────────────────────────

/** `/usersummary-service/v2/dailysummaries`. */
export interface GarminDailySummaries {
  data?:
    | {
        calendarDate?: string | null;
        movement?: { steps?: { value?: number | null } | null } | null;
        calories?: { burnedActive?: number | null } | null;
        heartRate?: { restingValue?: number | null } | null;
      }[]
    | null;
}

/** `/hrv-service/hrv/daily/{start}/{end}`. */
export interface GarminHrvSummaries {
  hrvSummaries?: { calendarDate?: string | null; lastNightAvg?: number | null }[] | null;
}

interface GarminVo2Reading {
  calendarDate?: string | null;
  vo2MaxPreciseValue?: number | null;
  vo2MaxValue?: number | null;
}

/** One entry from `/metrics-service/metrics/maxmet/daily/{start}/{end}`. Only days with a new estimate appear. */
export interface GarminVo2Entry {
  /** The running and walking estimate. */
  generic?: GarminVo2Reading | null;
  cycling?: GarminVo2Reading | null;
}

export interface GarminDailyInput {
  summaries?: GarminDailySummaries | null;
  hrv?: GarminHrvSummaries | null;
  vo2?: readonly GarminVo2Entry[] | null;
}

/**
 * Joins Garmin's three per-day responses into one row per date, oldest first.
 *
 * HRV is Garmin's overnight average. VO2 max prefers the running estimate, because that is the
 * number Garmin Connect shows as "VO2 Max", and falls back to the cycling one.
 */
export function mapDaily(input: GarminDailyInput): SourceDaily[] {
  const days = new Map<DateKey, SourceDaily>();
  const day = (date: DateKey): SourceDaily => {
    let row = days.get(date);
    if (!row) {
      row = { date, restingHr: null, hrvRmssd: null, steps: null, activeKcal: null, vo2Max: null };
      days.set(date, row);
    }
    return row;
  };

  for (const s of input.summaries?.data ?? []) {
    if (!s.calendarDate) continue;
    const row = day(s.calendarDate);
    row.restingHr = rounded(s.heartRate?.restingValue);
    row.steps = typeof s.movement?.steps?.value === 'number' ? s.movement.steps.value : null;
    row.activeKcal = typeof s.calories?.burnedActive === 'number' ? s.calories.burnedActive : null;
  }

  for (const h of input.hrv?.hrvSummaries ?? []) {
    if (h.calendarDate) day(h.calendarDate).hrvRmssd = positive(h.lastNightAvg);
  }

  for (const entry of input.vo2 ?? []) {
    const reading = entry.generic ?? entry.cycling;
    if (reading?.calendarDate) day(reading.calendarDate).vo2Max = positive(reading.vo2MaxPreciseValue) ?? positive(reading.vo2MaxValue);
  }

  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

// ───────────────────────────── weight ─────────────────────────────

interface GarminWeighIn {
  samplePk?: number | null;
  /** Epoch ms. */
  timestampGMT?: number | null;
  /** Grams. */
  weight?: number | null;
}

/** `/weight-service/weight/range/{start}/{end}?includeAll=true`. */
export interface GarminWeightRange {
  dailyWeightSummaries?: { latestWeight?: GarminWeighIn | null; allWeightMetrics?: GarminWeighIn[] | null }[] | null;
}

/** Garmin's weigh-ins → ours, oldest first. Garmin stores grams. */
export function mapWeights(range: GarminWeightRange | null | undefined): SourceWeight[] {
  const byId = new Map<string, SourceWeight>();
  for (const summary of range?.dailyWeightSummaries ?? []) {
    const entries = summary.allWeightMetrics?.length ? summary.allWeightMetrics : summary.latestWeight ? [summary.latestWeight] : [];
    for (const w of entries) {
      const ms = positive(w.timestampGMT);
      const grams = positive(w.weight);
      if (ms === null || grams === null) continue;
      const externalId = `garmin:weight:${w.samplePk ?? ms}`;
      byId.set(externalId, { externalId, ms, kg: grams / 1000 });
    }
  }
  return [...byId.values()].sort((a, b) => a.ms - b.ms);
}

// ───────────────────────────── request plumbing ─────────────────────────────

export interface DateWindow {
  /** First and last day, both included, as Garmin's date parameters expect. */
  start: DateKey;
  end: DateKey;
}

/**
 * Splits a time range into runs of at most `maxDays` calendar days, oldest first, with no day
 * in two windows. Garmin's range endpoints refuse long ranges (sleep stops at 31 days).
 */
export function dateWindows(fromMs: number, toMs: number, maxDays: number): DateWindow[] {
  if (maxDays <= 0) throw new Error('maxDays must be positive');
  const last = toDateKey(new Date(toMs));
  const windows: DateWindow[] = [];
  for (let start = toDateKey(new Date(fromMs)); start <= last; start = addDays(start, maxDays)) {
    const end = addDays(start, maxDays - 1);
    windows.push({ start, end: end > last ? last : end });
  }
  return windows;
}

/**
 * When a bearer token stops working, epoch ms, read from the `exp` claim inside it. Null when the
 * text is not a readable JWT. The signature is not checked: this only decides when to ask for a
 * new token, and Garmin checks the token itself on every request.
 */
export function tokenExpiryMs(token: string): number | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims: unknown = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')));
    const exp = (claims as { exp?: unknown }).exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

export interface KeyNotice {
  /** True once the date has passed, false while it is only close. */
  expired: boolean;
  message: string;
}

/**
 * What to tell the user about the key's expiry date, or null when there is nothing to say yet.
 * Garmin does not report when a key expires, so the date is the one entered with the key.
 */
export function keyExpiryNotice(expires: DateKey | null, today: DateKey, warnDays: number): KeyNotice | null {
  if (!expires || !/^\d{4}-\d{2}-\d{2}$/.test(expires)) return null;
  const days = daysBetween(today, expires);
  const renew = 'Create a new one in Garmin Connect and paste it in Settings → Garmin';
  if (days < 0) return { expired: true, message: `Your Garmin key expired on ${expires}. ${renew}.` };
  if (days > warnDays) return null;
  const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
  return { expired: false, message: `Your Garmin key expires ${when}, on ${expires}. ${renew} before then.` };
}
