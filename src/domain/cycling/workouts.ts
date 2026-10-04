/**
 * Structured bike sessions for triathlon base training.
 *
 * Zones are heart-rate based, because power meters aren't assumed. Cycling max heart rate
 * runs a little lower than running (less muscle mass, seated position), so the zones are
 * built off (run max HR − 10). Each zone also carries an RPE, which is what you use on a
 * gym bike or when the strap is flat.
 */
import { TUNABLES } from '../../config/tunables';

export type BikeZone = 'z1' | 'z2' | 'z3' | 'z4' | 'z5';

export const ZONE_LABELS: Record<BikeZone, string> = {
  z1: 'recovery',
  z2: 'endurance',
  z3: 'tempo / sweet spot',
  z4: 'threshold',
  z5: 'VO2 max',
};

/** What each zone feels like when you have no heart-rate data. */
export const ZONE_RPE: Record<BikeZone, string> = {
  z1: 'RPE 2-3, spinning easy',
  z2: 'RPE 4-5, can hold a conversation',
  z3: 'RPE 6-7, comfortably hard',
  z4: 'RPE 8, hard but repeatable',
  z5: 'RPE 9, eyeballs out',
};

export interface BikeZones {
  /** Estimated cycling max heart rate. */
  maxHr: number;
  ranges: Record<BikeZone, [number, number]>;
}

export function bikeZones(runMaxHr: number | null): BikeZones | null {
  if (runMaxHr === null) return null;
  const maxHr = runMaxHr - TUNABLES.cycling.maxHrOffsetFromRun;
  const c = TUNABLES.cycling.zoneCeilings;
  const at = (fraction: number) => Math.round(maxHr * fraction);
  return {
    maxHr,
    ranges: {
      z1: [at(0.5), at(c.z1)],
      z2: [at(c.z1), at(c.z2)],
      z3: [at(c.z2), at(c.z3)],
      z4: [at(c.z3), at(c.z4)],
      z5: [at(c.z4), maxHr],
    },
  };
}

/** "endurance · 128-141 bpm" when zones are known, otherwise the RPE description. */
export function zoneTarget(zone: BikeZone, zones: BikeZones | null): string {
  if (!zones) return `${ZONE_LABELS[zone]} · ${ZONE_RPE[zone]}`;
  const [low, high] = zones.ranges[zone];
  return `${ZONE_LABELS[zone]} · ${low}-${high} bpm`;
}

export type BikeFocus = 'sweet_spot' | 'threshold' | 'vo2' | 'endurance' | 'recovery';

export interface BikeStep {
  label: string;
  kind: 'warmup' | 'work' | 'recovery' | 'cooldown' | 'endurance';
  minutes: number;
  zone: BikeZone;
  cadence: string;
  /** How many times this step repeats, alternating with the recovery step that follows. */
  reps?: number;
}

export interface BikePlan {
  kind: 'bike';
  focus: BikeFocus;
  title: string;
  /** One line, e.g. "10 min warmup · 3 × 10 min sweet spot, 4 min easy · 5 min cooldown". */
  summary: string;
  steps: BikeStep[];
  totalMin: number;
  /** Short run straight off the bike; 0 when there isn't one. */
  brickRunMin: number;
  /** Indoor sessions hold zones better; long rides are nicer outdoors. */
  indoor: boolean;
}

const round5 = (x: number) => Math.max(5, Math.round(x / 5) * 5);

function totalMinutes(steps: BikeStep[]): number {
  return steps.reduce((sum, s) => sum + s.minutes * (s.reps ?? 1), 0);
}

function finish(focus: BikeFocus, title: string, steps: BikeStep[], indoor: boolean, brickRunMin = 0): BikePlan {
  const parts = steps.map((s) => (s.reps && s.reps > 1 ? `${s.reps} × ${s.minutes} min ${s.label}` : `${s.minutes} min ${s.label}`));
  if (brickRunMin > 0) parts.push(`${brickRunMin} min brick run`);
  return { kind: 'bike', focus, title, summary: parts.join(' · '), steps, totalMin: totalMinutes(steps), brickRunMin, indoor };
}

/** The weekday quality ride rotates so each 3-week block covers sweet spot, threshold and VO2. */
export function bikeFocusForWeek(weekIndex: number): BikeFocus {
  return (['sweet_spot', 'threshold', 'vo2'] as const)[((weekIndex % 3) + 3) % 3];
}

const BLOCKS: Record<'sweet_spot' | 'threshold' | 'vo2', { zone: BikeZone; blockMin: number; restMin: number; cadence: string; title: string }> = {
  sweet_spot: { zone: 'z3', blockMin: 10, restMin: 4, cadence: TUNABLES.cycling.cadence.tempo, title: 'Sweet spot ride' },
  threshold: { zone: 'z4', blockMin: 6, restMin: 4, cadence: TUNABLES.cycling.cadence.threshold, title: 'Threshold intervals' },
  vo2: { zone: 'z5', blockMin: 3, restMin: 3, cadence: TUNABLES.cycling.cadence.vo2, title: 'VO2 intervals' },
};

/**
 * Weekday quality ride that fits `targetMin` including warmup and cooldown.
 * Best done indoors: the intervals need steady resistance and no traffic lights.
 */
export function buildBikeQuality(focus: BikeFocus, targetMin: number, indoor = true): BikePlan {
  const c = TUNABLES.cycling;
  const spec = BLOCKS[focus === 'endurance' || focus === 'recovery' ? 'sweet_spot' : focus];
  const warmup: BikeStep = { label: 'easy warmup, build cadence', kind: 'warmup', minutes: c.warmupMin, zone: 'z2', cadence: c.cadence.endurance };
  const cooldown: BikeStep = { label: 'easy spin down', kind: 'cooldown', minutes: c.cooldownMin, zone: 'z1', cadence: c.cadence.endurance };
  const mainMin = Math.max(spec.blockMin, targetMin - c.warmupMin - c.cooldownMin);
  const reps = Math.max(2, Math.floor((mainMin + spec.restMin) / (spec.blockMin + spec.restMin)));

  return finish(
    focus === 'endurance' || focus === 'recovery' ? 'sweet_spot' : focus,
    spec.title,
    [
      warmup,
      { label: ZONE_LABELS[spec.zone], kind: 'work', minutes: spec.blockMin, zone: spec.zone, cadence: spec.cadence, reps },
      { label: 'easy', kind: 'recovery', minutes: spec.restMin, zone: 'z1', cadence: c.cadence.endurance, reps: reps - 1 },
      cooldown,
    ],
    indoor,
  );
}

/**
 * The weekend long ride: mostly endurance, with tempo blocks added once you're past base
 * so the legs learn to work late in a ride. `brickRunMin` is run straight off the bike.
 */
export function buildLongRide(targetMin: number, brickRunMin: number, withTempo: boolean, indoor = false): BikePlan {
  const c = TUNABLES.cycling;
  const minutes = round5(targetMin);
  const steps: BikeStep[] = [{ label: 'easy warmup', kind: 'warmup', minutes: c.warmupMin, zone: 'z1', cadence: c.cadence.endurance }];

  if (withTempo && minutes >= 75) {
    const tempoBlocks = minutes >= 150 ? 3 : 2;
    const tempoMin = 15;
    const enduranceMin = Math.max(15, minutes - c.warmupMin - c.cooldownMin - tempoBlocks * tempoMin);
    steps.push({ label: 'steady endurance', kind: 'endurance', minutes: enduranceMin, zone: 'z2', cadence: c.cadence.endurance });
    steps.push({ label: 'tempo, late in the ride', kind: 'work', minutes: tempoMin, zone: 'z3', cadence: c.cadence.tempo, reps: tempoBlocks });
  } else {
    steps.push({ label: 'steady endurance', kind: 'endurance', minutes: Math.max(15, minutes - c.warmupMin - c.cooldownMin), zone: 'z2', cadence: c.cadence.endurance });
  }
  steps.push({ label: 'easy spin down', kind: 'cooldown', minutes: c.cooldownMin, zone: 'z1', cadence: c.cadence.endurance });

  return finish('endurance', 'Long ride', steps, indoor, brickRunMin);
}

export function buildEasySpin(targetMin: number, indoor = true): BikePlan {
  return finish(
    'recovery',
    'Easy spin',
    [{ label: 'easy, high cadence', kind: 'endurance', minutes: round5(targetMin), zone: 'z1', cadence: TUNABLES.cycling.cadence.endurance }],
    indoor,
  );
}

/** Average speed (km/h) of recent rides; used for the race-time estimate. */
export function averageSpeedKmh(rides: { distanceM: number | null; durationSec: number }[]): number | null {
  const usable = rides.filter((r) => r.distanceM !== null && r.distanceM > 5000 && r.durationSec > 600);
  if (usable.length === 0) return null;
  const distance = usable.reduce((sum, r) => sum + (r.distanceM ?? 0), 0);
  const seconds = usable.reduce((sum, r) => sum + r.durationSec, 0);
  return (distance / 1000 / seconds) * 3600;
}
