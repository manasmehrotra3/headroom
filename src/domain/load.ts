import { TUNABLES } from '../config/tunables';
import { addDays, daysBetween, type DateKey } from './dates';

export type ActivityKind = 'run' | 'tennis' | 'strength' | 'walk' | 'yoga' | 'cycling' | 'other';

/**
 * Session RPE load (Foster):  load = RPE (CR-10, 1–10) × duration in minutes.
 * Works for strength, tennis and runs alike, so it drives the acute:chronic ratio.
 */
export function sessionRpeLoad(rpe: number, durationSec: number): number {
  return rpe * (durationSec / 60);
}

/**
 * Estimated RPE from average heart rate when you didn't rate a synced session.
 * HRR fraction = (avg − resting) / (max − resting); mapped through TUNABLES.load.rpeFromHrr.
 * Returns null when there isn't enough heart-rate information.
 */
export function estimateRpeFromHr(avgHr: number | null, restingHr: number | null, maxHr: number): number | null {
  if (avgHr === null || restingHr === null || maxHr <= restingHr) return null;
  const hrr = (avgHr - restingHr) / (maxHr - restingHr);
  for (const band of TUNABLES.load.rpeFromHrr) {
    if (hrr <= band.maxHrr) return band.rpe;
  }
  return 10;
}

/**
 * Banister TRIMP for a run with heart rate:
 *   TRIMP = minutes × HRr × 0.64 × e^(1.92 × HRr)        (men)
 *   TRIMP = minutes × HRr × 0.86 × e^(1.67 × HRr)        (women)
 * where HRr = (avg − resting) / (max − resting).
 * Shown per run; not mixed into the ACWR because its units differ from sRPE.
 */
export function trimp(durationSec: number, avgHr: number, restingHr: number, maxHr: number, sex: 'male' | 'female'): number | null {
  if (maxHr <= restingHr) return null;
  const hrr = Math.min(1, Math.max(0, (avgHr - restingHr) / (maxHr - restingHr)));
  const [a, b] = sex === 'female' ? [0.86, 1.67] : [0.64, 1.92];
  return (durationSec / 60) * hrr * a * Math.exp(b * hrr);
}

/** Tanaka: HRmax ≈ 208 − 0.7 × age. Used when no max HR was entered. */
export function estimateMaxHr(age: number): number {
  return Math.round(208 - 0.7 * age);
}

export type AcwrLabel = 'low' | 'sweet_spot' | 'caution' | 'high' | 'insufficient';

export const ACWR_LABELS: Record<AcwrLabel, string> = {
  low: 'Low',
  sweet_spot: 'Sweet spot',
  caution: 'Caution',
  high: 'High',
  insufficient: 'Not enough data yet',
};

export interface LoadSummary {
  /** Sum of sRPE load over the last 7 days. */
  acute: number;
  /** Average weekly load over the last 28 days (sum ÷ 4). */
  chronic: number;
  acwr: number | null;
  label: AcwrLabel;
  /** Days of history available up to `date`. */
  historyDays: number;
}

export interface DailyLoad {
  date: DateKey;
  load: number;
}

/**
 * Acute:chronic workload ratio on `date`:
 *   acute   = Σ load over the previous 7 days (including today)
 *   chronic = Σ load over the previous 28 days ÷ 4   (average week)
 *   ACWR    = acute / chronic
 * Labels: < 0.8 low, 0.8–1.3 sweet spot, 1.3–1.5 caution, > 1.5 high.
 * `firstDataDate` is the first day data exists for, so early days don't show a meaningless ratio.
 */
export function loadSummary(loads: DailyLoad[], date: DateKey, firstDataDate: DateKey | null): LoadSummary {
  const t = TUNABLES.load;
  const acuteStart = addDays(date, -(t.acuteDays - 1));
  const chronicStart = addDays(date, -(t.chronicDays - 1));

  let acute = 0;
  let chronicSum = 0;
  for (const { date: d, load } of loads) {
    if (d > date) continue;
    if (d >= chronicStart) chronicSum += load;
    if (d >= acuteStart) acute += load;
  }
  const chronic = chronicSum / (t.chronicDays / t.acuteDays);
  const historyDays = firstDataDate ? Math.max(0, daysBetween(firstDataDate, date) + 1) : 0;

  if (historyDays < t.minHistoryDays || chronic <= 0) {
    return { acute, chronic, acwr: null, label: 'insufficient', historyDays };
  }
  const acwr = acute / chronic;
  const label: AcwrLabel = acwr < t.acwrLow ? 'low' : acwr <= t.acwrHigh ? 'sweet_spot' : acwr <= t.acwrDanger ? 'caution' : 'high';
  return { acute, chronic, acwr, label, historyDays };
}

/** Sums per-activity loads into one number per day. */
export function dailyLoads(activities: { date: DateKey; srpeLoad: number; duplicateOf?: number | null }[]): DailyLoad[] {
  const byDay = new Map<DateKey, number>();
  for (const a of activities) {
    if (a.duplicateOf) continue;
    byDay.set(a.date, (byDay.get(a.date) ?? 0) + a.srpeLoad);
  }
  return [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, load]) => ({ date, load }));
}
