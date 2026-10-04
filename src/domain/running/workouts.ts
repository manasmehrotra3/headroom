import { TUNABLES } from '../../config/tunables';
import { METERS_PER_MILE } from '../units';
import type { Paces } from './vdot';

export type RunFocus = 'tempo' | 'intervals' | 'strides' | 'easy';

export interface RunStep {
  label: string;
  kind: 'warmup' | 'work' | 'recovery' | 'cooldown' | 'stride' | 'easy';
  minutes: number;
  /** Seconds per mile; null = walk or "by feel". */
  paceSecPerMile: number | null;
  /** How many times this step repeats (e.g. 6 × 3 min). Steps with reps > 1 alternate with the next recovery step. */
  reps?: number;
}

export interface RunPlan {
  kind: 'run';
  focus: RunFocus;
  title: string;
  /** One line, e.g. "10 min warmup · 3 × 5 min tempo, 2 min jog · 5 min cooldown". */
  summary: string;
  steps: RunStep[];
  totalMin: number;
  estimatedMiles: number;
}

const round5 = (x: number) => Math.max(5, Math.round(x / 5) * 5);

/** The quality session rotates so each 3-week block has tempo, intervals and strides. */
export function qualityFocusForWeek(weekIndex: number): RunFocus {
  return (['tempo', 'intervals', 'strides'] as const)[((weekIndex % 3) + 3) % 3];
}

function totalMinutes(steps: RunStep[]): number {
  return steps.reduce((sum, s) => sum + s.minutes * (s.reps ?? 1), 0);
}

function estimateMiles(steps: RunStep[]): number {
  return steps.reduce((sum, s) => {
    const pace = s.paceSecPerMile ?? 12 * 60;
    return sum + ((s.minutes * 60) / pace) * (s.reps ?? 1);
  }, 0);
}

function finish(focus: RunFocus, title: string, steps: RunStep[]): RunPlan {
  const parts = steps.map((s) => (s.reps && s.reps > 1 ? `${s.reps} × ${s.minutes} min ${s.label}` : `${s.minutes} min ${s.label}`));
  return { kind: 'run', focus, title, summary: parts.join(' · '), steps, totalMin: totalMinutes(steps), estimatedMiles: estimateMiles(steps) };
}

/**
 * Wednesday quality run that fits `targetMin` including warmup and cooldown.
 * Main-set size scales with the time available; paces come from VDOT.
 */
export function buildQualityRun(focus: RunFocus, targetMin: number, paces: Paces | null): RunPlan {
  const r = TUNABLES.running;
  const warmup: RunStep = { label: 'easy warmup', kind: 'warmup', minutes: r.warmupMin, paceSecPerMile: paces?.easy ?? null };
  const cooldown: RunStep = { label: 'easy cooldown', kind: 'cooldown', minutes: r.cooldownMin, paceSecPerMile: paces?.easy ?? null };
  const mainMin = Math.max(10, targetMin - r.warmupMin - r.cooldownMin);

  if (focus === 'tempo') {
    // 2–3 tempo blocks with a 2-min jog between them, e.g. 3 × 5 min for a 30-min session.
    const blocks = mainMin >= 24 ? 3 : 2;
    const blockMin = Math.max(4, Math.floor((mainMin - (blocks - 1) * 2) / blocks));
    return finish('tempo', 'Tempo run', [
      warmup,
      { label: 'tempo', kind: 'work', minutes: blockMin, paceSecPerMile: paces?.tempo ?? null, reps: blocks },
      { label: 'jog', kind: 'recovery', minutes: 2, paceSecPerMile: paces?.easy ?? null, reps: blocks - 1 },
      cooldown,
    ]);
  }

  if (focus === 'intervals') {
    // 3-min intervals at I pace with 2-min jogs: 4 reps in 20 min, 6 in 30.
    const reps = Math.max(3, Math.floor((mainMin + 2) / 5));
    return finish('intervals', 'Intervals', [
      warmup,
      { label: 'hard', kind: 'work', minutes: 3, paceSecPerMile: paces?.interval ?? null, reps },
      { label: 'jog', kind: 'recovery', minutes: 2, paceSecPerMile: paces?.easy ?? null, reps: reps - 1 },
      cooldown,
    ]);
  }

  // Strides / fartlek: easy running with 20-second surges.
  const strides = Math.max(4, Math.min(8, Math.floor(mainMin / 3)));
  const easyMin = Math.max(5, mainMin - Math.ceil((strides * (r.strideSec + 60)) / 60));
  return finish('strides', 'Easy run + strides', [
    warmup,
    { label: 'easy', kind: 'easy', minutes: easyMin, paceSecPerMile: paces?.easy ?? null },
    { label: `strides (${r.strideSec} s fast, walk back)`, kind: 'stride', minutes: 1.5, paceSecPerMile: paces?.repetition ?? null, reps: strides },
    cooldown,
  ]);
}

/** Saturday easy aerobic run. Strides every other week keep the legs turning over. */
export function buildEasyRun(targetMin: number, paces: Paces | null, withStrides: boolean): RunPlan {
  const steps: RunStep[] = [{ label: 'easy', kind: 'easy', minutes: round5(targetMin) - (withStrides ? 5 : 0), paceSecPerMile: paces?.easy ?? null }];
  if (withStrides) {
    steps.push({ label: 'strides (20 s fast, walk back)', kind: 'stride', minutes: 1.25, paceSecPerMile: paces?.repetition ?? null, reps: TUNABLES.running.stridesCount });
  }
  return finish('easy', 'Easy run', steps);
}

/** A short easy jog used when a quality session is downgraded (low readiness, deload). */
export function easiedRun(plan: RunPlan, paces: Paces | null): RunPlan {
  return buildEasyRun(plan.totalMin, paces, false);
}

export interface RunComparison {
  plannedMin: number;
  actualMin: number;
  plannedMiles: number;
  actualMiles: number | null;
  plannedPaceSecPerMile: number | null;
  actualPaceSecPerMile: number | null;
  avgHr: number | null;
  /** e.g. "Ran 3.4 mi in 33 min (planned ≈3.1 mi in 30). Pace 9:42, about 15 s/mi faster than planned." */
  verdict: string;
}

export function compareRun(plan: RunPlan, actual: { durationSec: number; distanceM: number | null; avgHr: number | null }): RunComparison {
  const actualMin = actual.durationSec / 60;
  const actualMiles = actual.distanceM === null ? null : actual.distanceM / METERS_PER_MILE;
  const plannedPace = plan.estimatedMiles > 0 ? (plan.totalMin * 60) / plan.estimatedMiles : null;
  const actualPace = actualMiles && actualMiles > 0 ? actual.durationSec / actualMiles : null;

  let verdict = `Ran ${actualMiles === null ? '' : `${actualMiles.toFixed(1)} mi in `}${Math.round(actualMin)} min (planned ≈${plan.estimatedMiles.toFixed(1)} mi in ${plan.totalMin}).`;
  if (plannedPace !== null && actualPace !== null) {
    const diff = Math.round(actualPace - plannedPace);
    verdict += ` Average pace ${Math.floor(actualPace / 60)}:${String(Math.round(actualPace % 60)).padStart(2, '0')}, ${Math.abs(diff)} s/mi ${diff <= 0 ? 'faster' : 'slower'} than the planned average.`;
  }
  if (actualMin > plan.totalMin * 1.2) verdict += ' Longer than planned; the extra counts toward this week\'s volume.';
  return { plannedMin: plan.totalMin, actualMin, plannedMiles: plan.estimatedMiles, actualMiles, plannedPaceSecPerMile: plannedPace, actualPaceSecPerMile: actualPace, avgHr: actual.avgHr, verdict };
}
