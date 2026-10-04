import { TUNABLES } from '../config/tunables';

export interface ReadinessInput {
  sleepScore: number | null;
  restingHr: number | null;
  /** Median resting HR over the last 28 days, excluding today. */
  restingHrBaseline: number | null;
  hrvRmssd: number | null;
  /** Mean HRV over the last 7 days, excluding today. */
  hrvBaseline: number | null;
  checkin: { energy: number; soreness: number } | null;
}

export interface ReadinessComponent {
  points: number;
  weight: number;
  detail: string;
}

export type ReadinessBand = 'good' | 'moderate' | 'low' | 'unknown';

export interface Readiness {
  score: number | null;
  band: ReadinessBand;
  components: {
    sleep: ReadinessComponent | null;
    restingHr: ReadinessComponent | null;
    hrv: ReadinessComponent | null;
    checkin: ReadinessComponent | null;
  };
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/**
 * Readiness 0–100:
 *   sleep       35 pts  last night's sleep score
 *   resting HR  25 pts  vs 28-day baseline: at or below baseline full; +8 bpm zero
 *   HRV         20 pts  vs 7-day baseline: at or above full; 70 % of baseline zero
 *   check-in    20 pts  energy and soreness from the 3-tap morning check-in
 * Missing components are dropped and the rest re-weighted. Pain is handled separately
 * by the plan rules; it never lowers this number.
 */
export function readiness(input: ReadinessInput): Readiness {
  const t = TUNABLES.readiness;

  const sleep: ReadinessComponent | null =
    input.sleepScore === null
      ? null
      : { points: Math.round((input.sleepScore / 100) * t.weights.sleep), weight: t.weights.sleep, detail: `sleep score ${input.sleepScore}` };

  let restingHr: ReadinessComponent | null = null;
  if (input.restingHr !== null && input.restingHrBaseline !== null) {
    const above = input.restingHr - input.restingHrBaseline;
    const ratio = 1 - clamp01(above / t.restingHrZeroAboveBpm);
    restingHr = {
      points: Math.round(ratio * t.weights.restingHr),
      weight: t.weights.restingHr,
      detail: `resting HR ${input.restingHr} vs ${Math.round(input.restingHrBaseline)} baseline (${above >= 0 ? '+' : ''}${Math.round(above)})`,
    };
  }

  let hrv: ReadinessComponent | null = null;
  if (input.hrvRmssd !== null && input.hrvBaseline !== null && input.hrvBaseline > 0) {
    const frac = input.hrvRmssd / input.hrvBaseline;
    const ratio = clamp01((frac - t.hrvZeroFraction) / (1 - t.hrvZeroFraction));
    hrv = { points: Math.round(ratio * t.weights.hrv), weight: t.weights.hrv, detail: `HRV ${Math.round(input.hrvRmssd)} ms vs ${Math.round(input.hrvBaseline)} baseline` };
  }

  let checkin: ReadinessComponent | null = null;
  if (input.checkin) {
    // energy 1–3 (higher better), soreness 1–3 (lower better) → 0..1 each, averaged.
    const energy = (input.checkin.energy - 1) / 2;
    const freshness = (3 - input.checkin.soreness) / 2;
    const ratio = (energy + freshness) / 2;
    checkin = { points: Math.round(ratio * t.weights.checkin), weight: t.weights.checkin, detail: `energy ${input.checkin.energy}/3, soreness ${input.checkin.soreness}/3` };
  }

  const present = [sleep, restingHr, hrv, checkin].filter((c): c is ReadinessComponent => c !== null);
  if (present.length === 0) return { score: null, band: 'unknown', components: { sleep, restingHr, hrv, checkin } };

  const weight = present.reduce((s, c) => s + c.weight, 0);
  const points = present.reduce((s, c) => s + c.points, 0);
  const score = Math.round((points / weight) * 100);
  const band: ReadinessBand = score >= t.good ? 'good' : score >= t.moderate ? 'moderate' : 'low';
  return { score, band, components: { sleep, restingHr, hrv, checkin } };
}

export const READINESS_LABELS: Record<ReadinessBand, string> = {
  good: 'Good',
  moderate: 'Moderate',
  low: 'Low',
  unknown: 'No data yet',
};

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}
