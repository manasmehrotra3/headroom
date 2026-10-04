import { TUNABLES } from '../../config/tunables';
import { METERS_PER_MILE } from '../units';

/**
 * Jack Daniels' VDOT model.
 *
 *   VO2 cost of running at v (m/min):  VO2(v) = −4.60 + 0.182258·v + 0.000104·v²
 *   Fraction of VO2max sustainable for t minutes:
 *     pct(t) = 0.8 + 0.1894393·e^(−0.012778·t) + 0.2989558·e^(−0.1932605·t)
 *   VDOT = VO2(v_race) / pct(t_race)
 *
 * Training paces come from running at a fixed fraction of VDOT (TUNABLES.running.intensity).
 */
export function oxygenCost(metersPerMin: number): number {
  return -4.6 + 0.182258 * metersPerMin + 0.000104 * metersPerMin * metersPerMin;
}

export function sustainableFraction(minutes: number): number {
  return 0.8 + 0.1894393 * Math.exp(-0.012778 * minutes) + 0.2989558 * Math.exp(-0.1932605 * minutes);
}

export function vdotFromRace(distanceM: number, timeSec: number): number {
  const minutes = timeSec / 60;
  return oxygenCost(distanceM / minutes) / sustainableFraction(minutes);
}

/** Velocity (m/min) that costs `vo2`, by solving the quadratic. */
export function velocityForOxygenCost(vo2: number): number {
  const a = 0.000104;
  const b = 0.182258;
  const c = -(4.6 + vo2);
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
}

/** Seconds per mile at a fraction of VDOT. */
export function paceForFraction(vdot: number, fraction: number): number {
  const v = velocityForOxygenCost(vdot * fraction);
  return (METERS_PER_MILE / v) * 60;
}

export type PaceZone = 'easy' | 'marathon' | 'tempo' | 'interval' | 'repetition';

export type Paces = Record<PaceZone, number>;

export function trainingPaces(vdot: number): Paces {
  const i = TUNABLES.running.intensity;
  return {
    easy: paceForFraction(vdot, i.easy),
    marathon: paceForFraction(vdot, i.marathon),
    tempo: paceForFraction(vdot, i.tempo),
    interval: paceForFraction(vdot, i.interval),
    repetition: paceForFraction(vdot, i.repetition),
  };
}

/** VDOT implied by an easy pace, assuming easy runs sit at the easy intensity fraction. */
export function vdotFromEasyPace(secPerMile: number): number {
  const v = (METERS_PER_MILE / secPerMile) * 60;
  return oxygenCost(v) / TUNABLES.running.intensity.easy;
}

/** Riegel: t2 = t1 × (d2 / d1)^1.06 */
export function riegel(timeSec: number, fromM: number, toM: number): number {
  return timeSec * Math.pow(toM / fromM, TUNABLES.running.riegelExponent);
}

export function predictedRaceSec(vdot: number, distanceM: number): number {
  // Iterate: guess a time, compute pace at the sustainable fraction, repeat.
  let minutes = distanceM / 200;
  for (let i = 0; i < 20; i += 1) {
    const v = velocityForOxygenCost(vdot * sustainableFraction(minutes));
    minutes = distanceM / v;
  }
  return minutes * 60;
}

export interface RunEffort {
  distanceM: number;
  durationSec: number;
  avgHr: number | null;
}

/**
 * Re-estimates VDOT from recent runs. Each run's oxygen cost is divided by the intensity
 * implied by heart rate (% heart-rate reserve ≈ % VO2max), so easy runs don't drag the
 * estimate down. Takes the 75th percentile of the estimates and moves at most
 * ±vdotMaxStepPerUpdate from the current value.
 */
export function reestimateVdot(current: number | null, runs: RunEffort[], restingHr: number | null, maxHr: number): { vdot: number; basis: string } | null {
  const estimates: number[] = [];
  for (const run of runs) {
    if (run.distanceM < 2500 || run.durationSec < 10 * 60) continue;
    const v = run.distanceM / (run.durationSec / 60);
    let fraction: number;
    if (run.avgHr !== null && restingHr !== null && maxHr > restingHr) {
      fraction = Math.min(1, Math.max(0.6, (run.avgHr - restingHr) / (maxHr - restingHr)));
    } else {
      fraction = TUNABLES.running.intensity.easy + 0.05;
    }
    estimates.push(oxygenCost(v) / fraction);
  }
  if (estimates.length === 0) return null;

  const sorted = [...estimates].sort((a, b) => a - b);
  const p75 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.75))];
  const step = TUNABLES.plan.vdotMaxStepPerUpdate;
  const next = current === null ? p75 : Math.max(current - step, Math.min(current + step, p75));
  return { vdot: Math.round(next * 10) / 10, basis: `${estimates.length} runs in the last ${TUNABLES.plan.vdotLookbackDays} days (estimate ${p75.toFixed(1)})` };
}
