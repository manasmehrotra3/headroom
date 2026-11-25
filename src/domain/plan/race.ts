/**
 * Race goal mode: what phase you're in, how long the weekend sessions should be, and what
 * the week looks like when you're training for a race rather than just staying fit.
 *
 * Phases count backwards from race day:
 *   base → build → peak → taper → race week
 * The long ride and long run ramp from a starting point up to what the race needs, then
 * come down during the taper.
 */
import { TUNABLES } from '../../config/tunables';
import { daysBetween, WEEKDAYS, type DateKey, type Weekday } from '../dates';
import { predictedRaceSec } from '../running/vdot';
import { DEFAULT_SCHEDULE, type SessionType, type WeekSchedule } from '../schedule';
import { swimmingStarted } from '../swimming/workouts';
import { formatDuration } from '../units';

export const RACE_TYPE_IDS = ['five_k', 'ten_k', 'half_marathon', 'marathon', 'sprint_tri', 'olympic_tri', 'ironman_70_3'] as const;
export type RaceType = (typeof RACE_TYPE_IDS)[number];

export type RacePhase = 'base' | 'build' | 'peak' | 'taper' | 'race_week' | 'off_season';

export const PHASE_LABELS: Record<RacePhase, string> = {
  base: 'Base',
  build: 'Build',
  peak: 'Peak',
  taper: 'Taper',
  race_week: 'Race week',
  off_season: 'No race booked',
};

export const PHASE_NOTES: Record<RacePhase, string> = {
  base: 'Aerobic volume and strength. Long sessions grow slowly; intensity stays modest.',
  build: 'Race-specific work appears: tempo blocks in the long ride, longer quality runs.',
  peak: 'The biggest weeks. Longest ride and run land here, then everything comes down.',
  taper: 'Volume drops, intensity stays. You should feel fresh and slightly restless.',
  race_week: 'Short and sharp. Nothing you do now makes you fitter; plenty can make you tired.',
  off_season: 'No race on the calendar. The plan keeps you fit and consistent.',
};

export interface RaceSpec {
  label: string;
  short: string;
  discipline: 'run' | 'tri';
  swimM: number;
  bikeM: number;
  runM: number;
  taperWeeks: number;
  peakWeeks: number;
  buildWeeks: number;
  /** Longest run and ride the plan builds toward, in minutes. */
  peakLongRunMin: number;
  peakLongRideMin: number;
}

export const RACE_TYPES: Record<RaceType, RaceSpec> = {
  five_k: { label: '5K', short: '5K', discipline: 'run', swimM: 0, bikeM: 0, runM: 5000, taperWeeks: 1, peakWeeks: 3, buildWeeks: 4, peakLongRunMin: 75, peakLongRideMin: 0 },
  ten_k: { label: '10K', short: '10K', discipline: 'run', swimM: 0, bikeM: 0, runM: 10000, taperWeeks: 1, peakWeeks: 3, buildWeeks: 5, peakLongRunMin: 90, peakLongRideMin: 0 },
  half_marathon: { label: 'Half marathon', short: 'Half', discipline: 'run', swimM: 0, bikeM: 0, runM: 21097, taperWeeks: 2, peakWeeks: 3, buildWeeks: 5, peakLongRunMin: 120, peakLongRideMin: 0 },
  marathon: { label: 'Marathon', short: 'Marathon', discipline: 'run', swimM: 0, bikeM: 0, runM: 42195, taperWeeks: 3, peakWeeks: 4, buildWeeks: 6, peakLongRunMin: 180, peakLongRideMin: 0 },
  sprint_tri: { label: 'Sprint triathlon', short: 'Sprint tri', discipline: 'tri', swimM: 750, bikeM: 20000, runM: 5000, taperWeeks: 1, peakWeeks: 3, buildWeeks: 4, peakLongRunMin: 60, peakLongRideMin: 90 },
  olympic_tri: { label: 'Olympic triathlon', short: 'Olympic tri', discipline: 'tri', swimM: 1500, bikeM: 40000, runM: 10000, taperWeeks: 2, peakWeeks: 3, buildWeeks: 5, peakLongRunMin: 75, peakLongRideMin: 120 },
  ironman_70_3: { label: 'Ironman 70.3', short: '70.3', discipline: 'tri', swimM: 1900, bikeM: 90000, runM: 21097, taperWeeks: 2, peakWeeks: 4, buildWeeks: 6, peakLongRunMin: 105, peakLongRideMin: 210 },
};

export interface Race {
  id?: number;
  name: string;
  type: RaceType;
  date: DateKey;
  priority: 'A' | 'B';
  goalTimeSec: number | null;
}

/** Whole weeks from `today` to race day. Negative once the race has passed. */
export function weeksToRace(race: Pick<Race, 'date'>, today: DateKey): number {
  return daysBetween(today, race.date) / 7;
}

export function racePhase(weeks: number, type: RaceType): RacePhase {
  const spec = RACE_TYPES[type];
  if (weeks < 0) return 'off_season';
  if (weeks < 1) return 'race_week';
  if (weeks <= spec.taperWeeks) return 'taper';
  if (weeks <= spec.taperWeeks + spec.peakWeeks) return 'peak';
  if (weeks <= spec.taperWeeks + spec.peakWeeks + spec.buildWeeks) return 'build';
  return 'base';
}

const round5 = (x: number) => Math.round(x / 5) * 5;

/**
 * Target minutes for the weekend long session.
 * Ramps from a starting duration up to what the race needs over the last `rampWeeks`,
 * then drops during the taper. Capped so a single session never runs away.
 */
export function longSessionMin(kind: 'run' | 'bike', weeks: number, type: RaceType): number {
  const spec = RACE_TYPES[type];
  const r = TUNABLES.race;
  const peak = kind === 'run' ? spec.peakLongRunMin : spec.peakLongRideMin;
  if (peak <= 0) return 0;

  const start = kind === 'run' ? r.startLongRunMin : r.startLongRideMin;
  const phase = racePhase(weeks, type);
  if (phase === 'off_season') return start;
  if (phase === 'race_week') return round5(peak * r.raceWeekFraction);
  if (phase === 'taper') return round5(peak * r.taperFraction);

  const weeksToTaper = Math.max(0, weeks - spec.taperWeeks);
  const progress = 1 - Math.min(1, weeksToTaper / r.rampWeeks);
  return Math.min(TUNABLES.schedule.weekendLongMaxMin, round5(start + (peak - start) * progress));
}

/** Short run straight off the long ride. Grows through the phases, eases off in the taper. */
export function brickRunMin(phase: RacePhase, type: RaceType): number {
  if (RACE_TYPES[type].discipline !== 'tri') return 0;
  return TUNABLES.race.brickRunMin[phase];
}

/** How much time a weekend day may take: the long session plus a buffer, within the ceiling. */
export function weekendCapMin(longMin: number): number {
  const s = TUNABLES.schedule;
  return Math.min(s.weekendLongMaxMin, Math.max(s.weekendCapMin, longMin + s.weekendBufferMin));
}

/**
 * The triathlon week: two strength days, one quality ride, one quality run, the long ride
 * with a brick run on Saturday, and tennis kept on Sunday.
 */
export const TRI_WEEK: WeekSchedule = {
  mon: 'strength_lower',
  tue: 'bike_quality',
  wed: 'run_quality',
  thu: 'strength_upper',
  fri: 'mobility',
  sat: 'bike_long',
  sun: 'tennis',
};

/**
 * The triathlon week once swimming has started. The plan holds one session a day, so each swim
 * takes a day: the endurance swim replaces Thursday's upper-body strength (swimming works the
 * same muscles), and an easy technique swim replaces Friday's mobility. Monday's leg strength
 * stays. There is no full rest day in this week; Friday's swim is the easy day.
 */
export const TRI_WEEK_WITH_SWIM: WeekSchedule = { ...TRI_WEEK, thu: 'swim_endurance', fri: 'swim_technique' };

/**
 * The weekly template for a race. Triathlons get the dedicated tri week, with swims from the
 * week swimming starts (pass `weekStart` to get them); running races keep your own schedule
 * with the weekend easy run promoted to a long run.
 */
export function raceWeekSchedule(type: RaceType, base: WeekSchedule = DEFAULT_SCHEDULE, weekStart?: DateKey): WeekSchedule {
  if (RACE_TYPES[type].discipline === 'tri') return weekStart && swimmingStarted(weekStart) ? { ...TRI_WEEK_WITH_SWIM } : { ...TRI_WEEK };

  const out: WeekSchedule = { ...base };
  const weekendRun = (['sat', 'sun'] as Weekday[]).find((day) => out[day] === 'run_easy');
  const anyRun = WEEKDAYS.find((day) => out[day] === 'run_easy');
  const target = weekendRun ?? anyRun;
  if (target) out[target] = 'run_long';
  return out;
}

export interface RaceContext {
  race: Race;
  weeks: number;
  phase: RacePhase;
  longRunMin: number;
  longRideMin: number;
  brickRunMin: number;
}

export function raceContext(race: Race, today: DateKey): RaceContext {
  const weeks = weeksToRace(race, today);
  const phase = racePhase(weeks, race.type);
  return {
    race,
    weeks,
    phase,
    longRunMin: longSessionMin('run', weeks, race.type),
    longRideMin: longSessionMin('bike', weeks, race.type),
    brickRunMin: brickRunMin(phase, race.type),
  };
}

/** The next A race on or after `today`; B races are trained through, not planned around. */
export function nextRace(races: Race[], today: DateKey): Race | null {
  const upcoming = races.filter((r) => r.date >= today).sort((a, b) => (a.date < b.date ? -1 : 1));
  return upcoming.find((r) => r.priority === 'A') ?? upcoming[0] ?? null;
}

export interface RaceEstimate {
  totalSec: number | null;
  splits: { label: string; sec: number | null; note: string }[];
  caveats: string[];
}

/**
 * A rough finish time. Running races come from VDOT. Triathlons add the bike leg at your
 * recent average speed and the run leg at easy-to-marathon pace with a fatigue penalty,
 * because nobody runs their open pace off the bike.
 */
export function estimateRaceTime(type: RaceType, input: { vdot: number | null; bikeSpeedKmh: number | null; swimPaceSecPer100m: number | null }): RaceEstimate {
  const spec = RACE_TYPES[type];
  const caveats: string[] = [];

  if (spec.discipline === 'run') {
    const sec = input.vdot === null ? null : predictedRaceSec(input.vdot, spec.runM);
    if (input.vdot === null) caveats.push('Add a recent 5K time in Settings → Running to get a prediction.');
    return { totalSec: sec, splits: [{ label: 'Run', sec, note: spec.label }], caveats };
  }

  const swimSec = input.swimPaceSecPer100m === null ? null : (spec.swimM / 100) * input.swimPaceSecPer100m;
  if (swimSec === null) caveats.push('Swim is not tracked yet, so the total leaves it out.');

  const bikeSec = input.bikeSpeedKmh === null ? null : (spec.bikeM / 1000 / input.bikeSpeedKmh) * 3600;
  if (bikeSec === null) caveats.push('Ride a few times with the watch on and the bike split becomes real.');

  // Off the bike you run roughly 8% slower than an open race of the same distance.
  const openRunSec = input.vdot === null ? null : predictedRaceSec(input.vdot, spec.runM);
  const runSec = openRunSec === null ? null : openRunSec * 1.08;
  if (openRunSec === null) caveats.push('Add a recent 5K time to estimate the run leg.');

  const transitionsSec = 8 * 60;
  const known = [swimSec, bikeSec, runSec].filter((v): v is number => v !== null);
  const totalSec = known.length === 3 ? known.reduce((a, b) => a + b, 0) + transitionsSec : null;

  return {
    totalSec,
    splits: [
      { label: 'Swim', sec: swimSec, note: `${spec.swimM} m` },
      { label: 'Bike', sec: bikeSec, note: `${Math.round(spec.bikeM / 1000)} km` },
      { label: 'Run', sec: runSec, note: `${(spec.runM / 1000).toFixed(1)} km, 8% slower off the bike` },
      { label: 'Transitions', sec: transitionsSec, note: 'rough allowance' },
    ],
    caveats,
  };
}

export interface ReadinessGap {
  ok: boolean;
  message: string;
}

/**
 * Honest check of whether the training so far matches what the race asks for: the longest
 * ride and run you've actually done against what the race needs.
 */
export function raceReadiness(context: RaceContext, longest: { rideMin: number; runMin: number; swimM?: number }): ReadinessGap[] {
  const spec = RACE_TYPES[context.race.type];
  const gaps: ReadinessGap[] = [];
  const shortfall = TUNABLES.race.readinessShortfall;

  if (spec.peakLongRideMin > 0) {
    const needed = spec.peakLongRideMin;
    const ok = longest.rideMin >= needed * shortfall;
    gaps.push({
      ok,
      message: ok
        ? `Longest ride ${Math.round(longest.rideMin)} min, on track for the ${Math.round(spec.bikeM / 1000)} km bike leg.`
        : `Longest ride so far is ${Math.round(longest.rideMin)} min; the bike leg needs around ${needed} min. The plan builds toward it, so keep the long rides.`,
    });
  }

  const neededRun = spec.peakLongRunMin;
  const runOk = longest.runMin >= neededRun * shortfall;
  gaps.push({
    ok: runOk,
    message: runOk
      ? `Longest run ${Math.round(longest.runMin)} min, enough for the ${(spec.runM / 1000).toFixed(1)} km run leg.`
      : `Longest run so far is ${Math.round(longest.runMin)} min; the run leg needs around ${neededRun} min. Consider swapping a Sunday tennis for a long run in the peak weeks.`,
  });

  if (spec.discipline === 'tri') {
    const swimM = Math.round(longest.swimM ?? 0);
    const swimOk = swimM >= spec.swimM * shortfall;
    gaps.push({
      ok: swimOk,
      message: swimOk
        ? `Longest swim ${swimM} m, on track for the ${spec.swimM} m swim leg. Get some open-water practice in before race day.`
        : swimM > 0
          ? `Longest swim so far is ${swimM} m; the swim leg is ${spec.swimM} m of open water. The two weekly swims build toward it.`
          : `No swims recorded yet. Swim sessions are in the plan from ${TUNABLES.swim.startDate}, building toward the ${spec.swimM} m swim leg.`,
    });
  }

  return gaps;
}

/** "9 weeks to go · Base" */
export function raceCountdown(context: RaceContext): string {
  const weeks = Math.floor(context.weeks);
  const label = PHASE_LABELS[context.phase];
  if (context.weeks < 0) return `${RACE_TYPES[context.race.type].short} done`;
  if (context.weeks < 1) return `Race week · ${label}`;
  return `${weeks} week${weeks === 1 ? '' : 's'} to go · ${label}`;
}

export function formatGoalTime(sec: number | null): string {
  return sec === null ? '—' : formatDuration(sec);
}

export const LONG_SESSION_FOR: Record<'run' | 'bike', SessionType> = { run: 'run_long', bike: 'bike_long' };
