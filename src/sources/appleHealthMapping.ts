/**
 * Pure translation from Apple Health (HealthKit) shapes to this app's own, with no native imports
 * so it can be unit tested. The HealthKit reader in appleHealth.ts does the querying and hands
 * the raw values here.
 *
 * The numeric codes below are Apple's raw enum values, which are part of the HealthKit ABI and do
 * not change between iOS releases. They are copied rather than imported because importing the
 * library would load its native module.
 */
import type { ActivityType } from '@/db/schema';
import { SLEEP_STAGE } from '@/domain/sleepScore';

import type { SourceSleep } from './types';

/** HKWorkoutActivityType raw values for the sports this app cares about. */
export const HK_WORKOUT = {
  badminton: 4,
  cycling: 13,
  functionalStrengthTraining: 20,
  hiking: 24,
  racquetball: 34,
  running: 37,
  squash: 43,
  swimming: 46,
  tableTennis: 47,
  tennis: 48,
  traditionalStrengthTraining: 50,
  walking: 52,
  yoga: 57,
  coreTraining: 59,
  flexibility: 62,
  highIntensityIntervalTraining: 63,
  pilates: 66,
  handCycling: 74,
  pickleball: 79,
  cooldown: 80,
} as const;

/** Apple workout type → our coarse activity type. Mirrors mapExerciseType for Health Connect. */
export function mapWorkoutType(code: number): ActivityType {
  switch (code) {
    case HK_WORKOUT.running:
      return 'run';
    case HK_WORKOUT.tennis:
    case HK_WORKOUT.tableTennis:
    case HK_WORKOUT.racquetball:
    case HK_WORKOUT.squash:
    case HK_WORKOUT.badminton:
    case HK_WORKOUT.pickleball:
      return 'tennis';
    case HK_WORKOUT.traditionalStrengthTraining:
    case HK_WORKOUT.functionalStrengthTraining:
    case HK_WORKOUT.coreTraining:
    case HK_WORKOUT.highIntensityIntervalTraining:
      return 'strength';
    case HK_WORKOUT.walking:
    case HK_WORKOUT.hiking:
      return 'walk';
    case HK_WORKOUT.yoga:
    case HK_WORKOUT.pilates:
    case HK_WORKOUT.flexibility:
    case HK_WORKOUT.cooldown:
      return 'yoga';
    case HK_WORKOUT.cycling:
    case HK_WORKOUT.handCycling:
      return 'cycling';
    case HK_WORKOUT.swimming:
      return 'swim';
    default:
      return 'other';
  }
}

/** HKCategoryValueSleepAnalysis raw values. */
export const HK_SLEEP = { inBed: 0, asleepUnspecified: 1, awake: 2, asleepCore: 3, asleepDeep: 4, asleepREM: 5 } as const;

/**
 * Apple sleep value → the stage codes the sleep score uses (Health Connect's numbering).
 * "In bed" returns null: Apple records it as one span covering the whole night underneath the real
 * stages, so counting it as a stage would count the night twice.
 */
export function mapSleepValue(value: number): number | null {
  switch (value) {
    case HK_SLEEP.asleepUnspecified:
      return SLEEP_STAGE.SLEEPING;
    case HK_SLEEP.awake:
      return SLEEP_STAGE.AWAKE;
    case HK_SLEEP.asleepCore:
      return SLEEP_STAGE.LIGHT;
    case HK_SLEEP.asleepDeep:
      return SLEEP_STAGE.DEEP;
    case HK_SLEEP.asleepREM:
      return SLEEP_STAGE.REM;
    default:
      return null;
  }
}

export interface RawSleepSample {
  startMs: number;
  endMs: number;
  value: number;
  /** Which app wrote it, e.g. Garmin Connect's bundle id. */
  sourceId: string;
}

/** A gap longer than this between sleep samples starts a new night (or a separate nap). */
const NEW_SESSION_GAP_MS = 90 * 60000;

function asleepMinutes(samples: RawSleepSample[]): number {
  return samples.reduce((sum, s) => {
    const stage = mapSleepValue(s.value);
    const asleep = stage !== null && stage !== SLEEP_STAGE.AWAKE;
    return asleep ? sum + (s.endMs - s.startMs) / 60000 : sum;
  }, 0);
}

/**
 * Turns Apple's loose sleep samples into nights.
 *
 * Apple Health stores sleep as many short samples, possibly from more than one app: an iPhone's
 * sleep schedule can record "in bed" while the Garmin records stages. Samples are first grouped
 * into sessions wherever there is a long gap, then each session keeps only the samples from the
 * one source with the most time asleep, so two apps describing the same night never double up.
 */
export function groupSleepSessions(samples: readonly RawSleepSample[]): SourceSleep[] {
  const sorted = [...samples].filter((s) => s.endMs > s.startMs).sort((a, b) => a.startMs - b.startMs);

  const clusters: RawSleepSample[][] = [];
  let current: RawSleepSample[] = [];
  let clusterEnd = -Infinity;
  for (const sample of sorted) {
    if (current.length > 0 && sample.startMs - clusterEnd > NEW_SESSION_GAP_MS) {
      clusters.push(current);
      current = [];
      clusterEnd = -Infinity;
    }
    current.push(sample);
    clusterEnd = Math.max(clusterEnd, sample.endMs);
  }
  if (current.length > 0) clusters.push(current);

  return clusters.flatMap((cluster) => {
    const bySource = new Map<string, RawSleepSample[]>();
    for (const s of cluster) bySource.set(s.sourceId, [...(bySource.get(s.sourceId) ?? []), s]);

    // Most time asleep wins; on a tie, the source with more stage detail.
    const [sourceId, chosen] = [...bySource.entries()].reduce((best, entry) => {
      const diff = asleepMinutes(entry[1]) - asleepMinutes(best[1]);
      if (diff !== 0) return diff > 0 ? entry : best;
      return entry[1].length > best[1].length ? entry : best;
    });

    const stages = chosen.flatMap((s) => {
      const stage = mapSleepValue(s.value);
      return stage === null ? [] : [{ start: s.startMs, end: s.endMs, stage }];
    });
    if (stages.length === 0) return [];

    const startMs = Math.min(...chosen.map((s) => s.startMs));
    const endMs = Math.max(...chosen.map((s) => s.endMs));
    return [{ externalId: `hk:sleep:${sourceId}:${startMs}`, startMs, endMs, stages, score: null }];
  });
}
