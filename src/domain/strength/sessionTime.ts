import { TUNABLES } from '../../config/tunables';
import type { ExerciseTier, PlannedExercise } from './types';

export interface RemainingWork {
  exerciseId: string;
  name: string;
  tier: ExerciseTier;
  setsLeft: number;
  /** Seconds one set takes, including its rest. */
  secPerSet: number;
}

/**
 * Seconds one set costs: the reps themselves (or the hold) plus the rest after it.
 * Reps are estimated at the top of the range, so the estimate is a little pessimistic.
 */
export function secondsPerSet(planned: Pick<PlannedExercise, 'exercise' | 'reps' | 'restSec'>): number {
  const work = planned.exercise.loadType === 'time' ? planned.reps[1] : planned.reps[1] * TUNABLES.strength.secPerRep;
  return work + planned.restSec;
}

/** Projected seconds for a full session: warmup + every set + a transition between exercises. */
export function estimateSessionSec(exercises: PlannedExercise[]): number {
  const s = TUNABLES.strength;
  const sets = exercises.reduce((sum, planned) => sum + planned.sets * secondsPerSet(planned), 0);
  return s.warmupMin * 60 + sets + Math.max(0, exercises.length - 1) * s.transitionSec;
}

export function estimateRemainingSec(remaining: RemainingWork[]): number {
  const s = TUNABLES.strength;
  const withSets = remaining.filter((r) => r.setsLeft > 0);
  return withSets.reduce((sum, r) => sum + r.setsLeft * r.secPerSet, 0) + Math.max(0, withSets.length - 1) * s.transitionSec;
}

export interface DropSuggestion {
  exerciseId: string;
  name: string;
  setsToDrop: number;
  savesSec: number;
}

const TIER_ORDER: ExerciseTier[] = ['accessory', 'secondary', 'primary'];

/**
 * Which remaining sets to drop so the session finishes by the cap.
 * Accessories go first, then secondaries; primaries are only trimmed as a last resort,
 * and each exercise keeps at least one set unless it hasn't been started.
 */
export function suggestDrops(remaining: RemainingWork[], elapsedSec: number, capSec: number): DropSuggestion[] {
  let overBy = elapsedSec + estimateRemainingSec(remaining) - capSec;
  if (overBy <= 0) return [];

  const setsLeft = new Map(remaining.map((r) => [r.exerciseId, r.setsLeft]));
  const drops = new Map<string, DropSuggestion>();

  const dropOne = (r: RemainingWork) => {
    const left = setsLeft.get(r.exerciseId)!;
    setsLeft.set(r.exerciseId, left - 1);
    const current = drops.get(r.exerciseId) ?? { exerciseId: r.exerciseId, name: r.name, setsToDrop: 0, savesSec: 0 };
    current.setsToDrop += 1;
    current.savesSec += r.secPerSet;
    drops.set(r.exerciseId, current);
    overBy -= r.secPerSet;
    // Dropping every set of an exercise also saves its transition.
    if (left - 1 === 0) overBy -= TUNABLES.strength.transitionSec;
  };

  // Pass 1: last sets of accessories, then secondaries, then primaries (keep one set each).
  for (const tier of TIER_ORDER) {
    let progress = true;
    while (overBy > 0 && progress) {
      progress = false;
      for (const r of [...remaining].reverse()) {
        if (overBy <= 0) break;
        if (r.tier === tier && setsLeft.get(r.exerciseId)! > 1) {
          dropOne(r);
          progress = true;
        }
      }
    }
  }
  // Pass 2: whole exercises, accessories first.
  for (const tier of TIER_ORDER) {
    for (const r of [...remaining].reverse()) {
      if (overBy <= 0) break;
      if (r.tier === tier && setsLeft.get(r.exerciseId)! === 1) dropOne(r);
    }
  }

  return [...drops.values()];
}
