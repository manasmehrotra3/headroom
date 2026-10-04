/**
 * VO2 max, as reported by the watch through Health Connect.
 *
 * It moves slowly and only updates every few runs, so everything here works on sparse points
 * rather than a daily series. Our own VDOT (from how fast you actually run) is a separate
 * number and the two rarely match exactly; `vo2VsVdotNote` explains the gap rather than
 * pretending one of them is wrong.
 */
import { TUNABLES } from '@/config/tunables';

import { addDays, daysBetween, type DateKey } from './dates';

export interface Vo2Point {
  date: DateKey;
  vo2Max: number;
}

export type Vo2Trend = 'rising' | 'steady' | 'falling' | 'unknown';

export interface Vo2Summary {
  latest: Vo2Point | null;
  /** The oldest reading inside the window, which `change` is measured from. */
  from: Vo2Point | null;
  change: number | null;
  trend: Vo2Trend;
  best: Vo2Point | null;
  windowDays: number;
}

/** Readings inside the window, oldest first, one per day (the last reading of a day wins). */
export function vo2Series(points: Vo2Point[], today: DateKey, windowDays = TUNABLES.vo2.trendWindowDays): Vo2Point[] {
  const from = addDays(today, -windowDays);
  const byDay = new Map<DateKey, number>();
  for (const point of points) {
    if (point.date < from || point.date > today) continue;
    byDay.set(point.date, point.vo2Max);
  }
  return [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, vo2Max]) => ({ date, vo2Max }));
}

export function vo2Summary(points: Vo2Point[], today: DateKey, windowDays = TUNABLES.vo2.trendWindowDays): Vo2Summary {
  const series = vo2Series(points, today, windowDays);
  const latest = series.at(-1) ?? null;
  const from = series.length > 1 ? series[0] : null;
  const change = latest && from ? Math.round((latest.vo2Max - from.vo2Max) * 10) / 10 : null;
  const best = series.reduce<Vo2Point | null>((max, p) => (max === null || p.vo2Max > max.vo2Max ? p : max), null);

  const trend: Vo2Trend =
    change === null ? 'unknown' : change >= TUNABLES.vo2.meaningfulChange ? 'rising' : change <= -TUNABLES.vo2.meaningfulChange ? 'falling' : 'steady';

  return { latest, from, change, trend, best, windowDays };
}

export const TREND_LABELS: Record<Vo2Trend, string> = {
  rising: 'improving',
  steady: 'holding steady',
  falling: 'slipping',
  unknown: 'not enough readings',
};

export function trendArrow(trend: Vo2Trend): string {
  return trend === 'rising' ? '▲' : trend === 'falling' ? '▼' : trend === 'steady' ? '→' : '';
}

/**
 * "▲ +1.2 over 11 weeks", measured between the two readings we actually have rather than
 * across the whole window, which usually starts before your first reading.
 */
export function changeLabel(summary: Vo2Summary): string | null {
  if (summary.change === null || summary.from === null || summary.latest === null) return null;
  const days = daysBetween(summary.from.date, summary.latest.date);
  const span = days >= 14 ? `${Math.round(days / 7)} weeks` : `${days} day${days === 1 ? '' : 's'}`;
  return `${trendArrow(summary.trend)} ${summary.change > 0 ? '+' : ''}${summary.change.toFixed(1)} over ${span}`;
}

/** "Garmin says 48.2, your runs suggest 44.0." plus why the two differ. */
export function vo2VsVdotNote(vo2Max: number | null, vdot: number | null): string | null {
  if (vo2Max === null && vdot === null) return null;
  if (vo2Max === null) {
    return `No VO2 max from the watch yet. Your runs suggest a VDOT of ${vdot!.toFixed(1)}, which is the number the app uses for your paces.`;
  }
  if (vdot === null) return `The watch estimates ${vo2Max.toFixed(1)}. Add a recent 5K time and the app can compare it with what your runs say.`;

  const gap = Math.abs(vo2Max - vdot);
  const closeness = gap <= 2 ? 'They agree closely.' : gap <= 5 ? 'A gap of a few points is normal.' : 'That is a wide gap.';
  return (
    `The watch estimates ${vo2Max.toFixed(1)}; your runs suggest a VDOT of ${vdot.toFixed(1)}. ${closeness} ` +
    'The watch works from heart rate and pace, VDOT from how fast you actually race. Paces come from VDOT.'
  );
}

/** Rough context for an endurance race, deliberately vague because norms vary by age and sex. */
export function vo2RaceContext(vo2Max: number | null): string | null {
  if (vo2Max === null) return null;
  if (vo2Max >= 55) return 'Comfortably in the range where the limit is training time, not engine size.';
  if (vo2Max >= 45) return 'A typical range for age-group endurance racing.';
  if (vo2Max >= 38) return 'Plenty for finishing long races; consistent aerobic volume moves this most.';
  return 'Early days. Easy aerobic volume raises this fastest.';
}
