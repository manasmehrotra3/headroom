/**
 * Structured pool swims for triathlon training.
 *
 * Two sessions a week: a technique swim built around drills, and an endurance swim whose repeats
 * get longer as the total distance grows, from 50s with a rest after each up to 400s. Distance
 * starts low and grows a little each week from the date swimming begins.
 *
 * The plan engine works in minutes, so a swim is stored with a target time like every other
 * session and its distance is worked out from that time at an assumed pace. That way a rule that
 * shortens a session (a deload week, a high training load) shortens the swim without any
 * special handling.
 */
import { TUNABLES } from '../../config/tunables';
import { daysBetween, type DateKey } from '../dates';

export type SwimFocus = 'technique' | 'endurance';

export interface SwimStep {
  label: string;
  kind: 'warmup' | 'drill' | 'main' | 'cooldown';
  reps: number;
  /** Metres in each repeat. */
  distanceM: number;
  /** Rest after each repeat, e.g. "30 s". */
  rest: string;
  note: string;
}

export interface SwimPlan {
  kind: 'swim';
  focus: SwimFocus;
  title: string;
  /** One line, e.g. "4 × 50 m warm-up · 10 × 50 m steady, 30 s rest · 2 × 50 m easy". */
  summary: string;
  steps: SwimStep[];
  totalM: number;
  totalMin: number;
}

/** Whole weeks since swimming started: 0 in the first week, and in any week before it. */
export function swimWeek(weekStart: DateKey): number {
  return Math.max(0, Math.floor(daysBetween(TUNABLES.swim.startDate, weekStart) / 7));
}

/** Whether the triathlon week includes swims yet. */
export function swimmingStarted(weekStart: DateKey): boolean {
  return weekStart >= TUNABLES.swim.startDate;
}

/** Session distance for a given week of swimming, to the nearest 100 m. */
export function swimDistanceForWeek(focus: SwimFocus, week: number): number {
  const t = TUNABLES.swim;
  const grown = Math.round((t.startDistanceM * (1 + t.weeklyGrowth) ** week) / 100) * 100;
  return Math.min(t.maxDistanceM[focus], grown);
}

/** Planned minutes for a distance, at the assumed pace. */
export function swimMinutes(distanceM: number): number {
  return Math.round((distanceM / 100) * TUNABLES.swim.minPer100m);
}

/** The reverse: how far a session of this many minutes goes, to the nearest 100 m. */
export function swimDistanceM(targetMin: number): number {
  const t = TUNABLES.swim;
  return Math.max(t.minDistanceM, Math.round(targetMin / t.minPer100m) * 100);
}

/** Minutes the plan sets aside for this week's swim of the given kind. */
export function swimTargetMin(focus: SwimFocus, weekStart: DateKey): number {
  return swimMinutes(swimDistanceForWeek(focus, swimWeek(weekStart)));
}

const WARMUP_NOTE = 'Easy freestyle. Long strokes, and breathe out under water.';
const COOLDOWN_NOTE = 'Very easy, any stroke.';

/** Drills for half the set, then plain swimming that tries to keep what the drills taught. */
function techniqueSets(mainM: number): SwimStep[] {
  const drillM = Math.max(100, Math.round((mainM * 0.5) / 100) * 100);
  const swimM = mainM - drillM;
  const steps: SwimStep[] = [
    {
      label: 'Drills',
      kind: 'drill',
      reps: drillM / 50,
      distanceM: 50,
      rest: '30 s',
      note: 'First half of each 50 as a drill, second half normal freestyle. Rotate through catch-up, side kick with one arm out in front, and fingertip drag.',
    },
  ];
  if (swimM > 0) {
    steps.push({ label: 'Smooth swim', kind: 'main', reps: swimM / 50, distanceM: 50, rest: '20 s', note: 'Relaxed freestyle. Count your strokes and try to hold the same number each 50.' });
  }
  return steps;
}

/** One set of equal repeats. The repeats get longer as the set does. */
function enduranceSets(mainM: number): SwimStep[] {
  const [repM, rest] = mainM <= 600 ? [50, '30 s'] : mainM <= 1000 ? [100, '30 s'] : mainM <= 1600 ? [200, '45 s'] : [400, '60 s'];
  return [
    {
      label: 'Main set',
      kind: 'main',
      reps: Math.max(1, Math.round(mainM / repM)),
      distanceM: repM,
      rest,
      note: 'Steady, RPE 5-6. Swim the last one at the same pace as the first. Take more rest if your stroke falls apart.',
    },
  ];
}

export function buildSwim(focus: SwimFocus, targetMin: number): SwimPlan {
  const target = swimDistanceM(targetMin);
  const warmM = target >= 1500 ? 300 : 200;
  const coolM = 100;
  const mainM = Math.max(100, target - warmM - coolM);

  const steps: SwimStep[] = [
    { label: 'Warm-up', kind: 'warmup', reps: warmM / 50, distanceM: 50, rest: '20 s', note: WARMUP_NOTE },
    ...(focus === 'technique' ? techniqueSets(mainM) : enduranceSets(mainM)),
    { label: 'Cool-down', kind: 'cooldown', reps: coolM / 50, distanceM: 50, rest: 'as needed', note: COOLDOWN_NOTE },
  ];
  const totalM = steps.reduce((sum, s) => sum + s.reps * s.distanceM, 0);

  const short: Record<SwimStep['kind'], string> = { warmup: 'warm-up', drill: 'drills', main: focus === 'technique' ? 'smooth' : 'steady', cooldown: 'easy' };
  const summary = steps.map((s) => `${s.reps} × ${s.distanceM} m ${short[s.kind]}${s.kind === 'main' ? `, ${s.rest} rest` : ''}`).join(' · ');

  return {
    kind: 'swim',
    focus,
    title: `${focus === 'technique' ? 'Technique swim' : 'Endurance swim'} · ${totalM.toLocaleString('en-US')} m`,
    summary,
    steps,
    totalM,
    totalMin: targetMin,
  };
}

/** How many lengths of the pool one repeat is, for the plan screen. */
export function lengthsOf(distanceM: number): number {
  return distanceM / TUNABLES.swim.poolLengthM;
}
