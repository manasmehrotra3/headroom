/**
 * Shaping daily numbers for the trend charts: picking a range, and averaging noisy daily values
 * (steps swing wildly day to day) into weeks so a three- or six-month line stays readable.
 */
import { addDays, daysBetween, startOfWeek, type DateKey } from './dates';

export type TrendRange = '1M' | '3M' | '6M';

export const TREND_RANGES: readonly { id: TrendRange; label: string }[] = [
  { id: '1M', label: '1M' },
  { id: '3M', label: '3M' },
  { id: '6M', label: '6M' },
];

export const RANGE_DAYS: Record<TrendRange, number> = { '1M': 30, '3M': 91, '6M': 182 };

export interface DatedValue {
  date: DateKey;
  value: number;
}

/** Values on or after the start of the range, up to and including today, oldest first. */
export function inRange(values: readonly DatedValue[], today: DateKey, range: TrendRange): DatedValue[] {
  const from = addDays(today, -RANGE_DAYS[range]);
  return values.filter((v) => v.date >= from && v.date <= today).sort((a, b) => (a.date < b.date ? -1 : 1));
}

/**
 * Averages values into Monday-start weeks. Each week is dated by its Monday and averages only the
 * days that have a value, so a week with two recorded days is not dragged down by five blanks.
 */
export function weeklyAverages(values: readonly DatedValue[]): DatedValue[] {
  const weeks = new Map<DateKey, { sum: number; count: number }>();
  for (const { date, value } of values) {
    const week = startOfWeek(date);
    const bucket = weeks.get(week) ?? { sum: 0, count: 0 };
    bucket.sum += value;
    bucket.count += 1;
    weeks.set(week, bucket);
  }
  return [...weeks.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, { sum, count }]) => ({ date, value: sum / count }));
}

/** Daily for a month, weekly beyond that: enough detail without a scribble. */
export function stepsSeries(values: readonly DatedValue[], today: DateKey, range: TrendRange): DatedValue[] {
  const picked = inRange(values, today, range);
  return range === '1M' ? picked : weeklyAverages(picked);
}

/** A stable x position for a date: whole days since an anchor. */
export function dayIndex(anchor: DateKey, date: DateKey): number {
  return daysBetween(anchor, date);
}
