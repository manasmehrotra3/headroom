import { TUNABLES } from '../../config/tunables';
import { kgToLb, lbToKg, roundTo } from '../units';
import type { Exercise, LoggedSet } from './types';

export interface SessionSets {
  /** Sets logged for one exercise in one workout, in order. */
  sets: LoggedSet[];
}

export interface Suggestion {
  weightKg: number | null;
  /** One line shown under the target, e.g. "Hit 12 reps on every set at RPE ≤ 8 last time: +5 lb." */
  reason: string;
  kind: 'start' | 'increase' | 'hold' | 'decrease';
}

/**
 * Double progression.
 *
 * Work within a rep range at a fixed weight. When every set of the last session reached the
 * TOP of the range at RPE <= progressMaxRpe, add the smallest step. When the BOTTOM of the range
 * was missed on any set in each of the last `missedSessionsBeforeDrop` sessions, drop the weight
 * by dropFraction (rounded to the step). Otherwise keep the weight and chase more reps.
 *
 * `history` is newest first. Bodyweight and time-based exercises have no weight to suggest.
 */
export function suggestWeight(exercise: Exercise, reps: [number, number], history: SessionSets[]): Suggestion {
  const s = TUNABLES.strength;

  if (exercise.loadType !== 'weight') {
    return { weightKg: null, reason: 'Bodyweight: aim for the top of the rep range, then add reps.', kind: 'hold' };
  }

  const last = history.find((session) => session.sets.length > 0);
  if (!last) {
    const startLb = exercise.family === 'none' ? 0 : s.startingWeightLb[exercise.family];
    return {
      weightKg: lbToKg(startLb),
      reason: `No history yet. Start light (about ${startLb} lb) and find a weight that makes ${reps[1]} reps hard.`,
      kind: 'start',
    };
  }

  const lastWeightKg = Math.max(...last.sets.map((set) => set.weightKg));
  const stepKg = lbToKg(exercise.incrementLb);
  const [minReps, maxReps] = reps;

  const hitTopEverywhere = last.sets.every((set) => set.reps >= maxReps && set.rpe <= s.progressMaxRpe);
  if (hitTopEverywhere) {
    const next = roundToStep(lastWeightKg + stepKg, exercise.incrementLb);
    return {
      weightKg: next,
      reason: `Hit ${maxReps} reps on every set at RPE ≤ ${s.progressMaxRpe} last time: +${exercise.incrementLb} lb.`,
      kind: 'increase',
    };
  }

  const missedSessions = history
    .filter((session) => session.sets.length > 0)
    .slice(0, s.missedSessionsBeforeDrop)
    .filter((session) => session.sets.some((set) => set.reps < minReps));
  if (missedSessions.length >= s.missedSessionsBeforeDrop) {
    const next = roundToStep(lastWeightKg * (1 - s.dropFraction), exercise.incrementLb);
    return {
      weightKg: next,
      reason: `Missed ${minReps} reps in each of the last ${s.missedSessionsBeforeDrop} sessions: dropping about ${Math.round(s.dropFraction * 100)}%.`,
      kind: 'decrease',
    };
  }

  const missedLast = last.sets.some((set) => set.reps < minReps);
  return {
    weightKg: roundToStep(lastWeightKg, exercise.incrementLb),
    reason: missedLast
      ? `Missed ${minReps} reps last time. Same weight, aim for ${minReps}+ on every set.`
      : `Same weight. Get every set to ${maxReps} reps at RPE ≤ ${s.progressMaxRpe} to move up.`,
    kind: 'hold',
  };
}

/** Rounds a kg weight to the gym's lb step and returns kg again, so the stack label is sensible. */
export function roundToStep(weightKg: number, incrementLb: number): number {
  if (incrementLb <= 0) return weightKg;
  return lbToKg(roundTo(kgToLb(weightKg), incrementLb));
}

/** RPE from reps in reserve, the scale some people prefer to log. */
export function rirToRpe(rir: number): number {
  return Math.max(1, Math.min(10, 10 - rir));
}

export function rpeToRir(rpe: number): number {
  return Math.max(0, Math.min(9, 10 - rpe));
}

/** Total volume (kg lifted), the summary number shown at the end of a session. */
export function totalVolumeKg(sets: LoggedSet[]): number {
  return sets.reduce((sum, set) => sum + set.weightKg * set.reps, 0);
}

/**
 * Best set of an exercise by estimated one-rep max (Epley), used for PR tracking.
 * e1RM = weight × (1 + reps / 30).
 */
export function estimatedOneRepMaxKg(set: Pick<LoggedSet, 'weightKg' | 'reps'>): number {
  return set.weightKg * (1 + set.reps / 30);
}
