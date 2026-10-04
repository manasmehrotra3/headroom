/**
 * Pure helpers for the Sunday weekly review.
 */
import type { DateKey } from './dates';
import { estimatedOneRepMaxKg } from './strength/progression';

export interface SetRecord {
  exerciseId: string;
  date: DateKey;
  weightKg: number;
  reps: number;
}

export interface Pr {
  exerciseId: string;
  date: DateKey;
  weightKg: number;
  reps: number;
  e1rmKg: number;
  /** Previous best e1RM, or null if this was the first time. */
  previousE1rmKg: number | null;
}

/** Sets in [from, to] whose estimated 1RM beats every earlier set of the same exercise. */
export function strengthPrs(sets: SetRecord[], from: DateKey, to: DateKey): Pr[] {
  const best = new Map<string, number>();
  const prs: Pr[] = [];
  const sorted = [...sets].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  for (const set of sorted) {
    if (set.weightKg <= 0) continue;
    const e1rm = estimatedOneRepMaxKg(set);
    const previous = best.get(set.exerciseId) ?? null;
    if (previous === null || e1rm > previous + 0.01) {
      if (set.date >= from && set.date <= to && previous !== null) prs.push({ ...set, e1rmKg: e1rm, previousE1rmKg: previous });
      if (set.date >= from && set.date <= to && previous === null) prs.push({ ...set, e1rmKg: e1rm, previousE1rmKg: null });
      best.set(set.exerciseId, e1rm);
    }
  }
  // Keep only the best PR per exercise in the window.
  const byExercise = new Map<string, Pr>();
  for (const pr of prs) {
    const current = byExercise.get(pr.exerciseId);
    if (!current || pr.e1rmKg > current.e1rmKg) byExercise.set(pr.exerciseId, { ...pr, previousE1rmKg: current?.previousE1rmKg ?? pr.previousE1rmKg });
  }
  return [...byExercise.values()];
}

export interface RunPoint {
  date: DateKey;
  paceSecPerMile: number;
  avgHr: number;
}

/**
 * Pace at a similar heart rate: runs within ±hrBand of the reference HR, so the trend shows
 * fitness rather than effort. Returns the points plus a simple first-vs-last comparison.
 */
export function paceAtSimilarHr(runs: RunPoint[], referenceHr: number, hrBand = 6): { points: RunPoint[]; changeSecPerMile: number | null } {
  const points = runs.filter((r) => Math.abs(r.avgHr - referenceHr) <= hrBand).sort((a, b) => (a.date < b.date ? -1 : 1));
  if (points.length < 2) return { points, changeSecPerMile: null };
  const first = points.slice(0, Math.ceil(points.length / 3));
  const last = points.slice(-Math.ceil(points.length / 3));
  const mean = (xs: RunPoint[]) => xs.reduce((s, x) => s + x.paceSecPerMile, 0) / xs.length;
  return { points, changeSecPerMile: mean(last) - mean(first) };
}

/** Median average HR of the runs, used as the reference for the pace trend. */
export function typicalRunHr(runs: { avgHr: number | null }[]): number | null {
  const hrs = runs.map((r) => r.avgHr).filter((h): h is number => h !== null).sort((a, b) => a - b);
  if (hrs.length === 0) return null;
  return hrs[Math.floor(hrs.length / 2)];
}

export interface Adherence {
  planned: number;
  done: number;
  skipped: number;
  /** 0–1 */
  rate: number;
}

export function adherence(sessions: { status: string; sessionType: string }[]): Adherence {
  const counted = sessions.filter((s) => s.sessionType !== 'rest');
  const done = counted.filter((s) => s.status === 'done').length;
  const skipped = counted.filter((s) => s.status === 'skipped' || s.status === 'dropped').length;
  return { planned: counted.length, done, skipped, rate: counted.length ? done / counted.length : 0 };
}
