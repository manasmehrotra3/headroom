import { TUNABLES } from '../config/tunables';
import { addDays, type DateKey } from './dates';

export interface WeighIn {
  date: DateKey;
  weightKg: number;
}

export interface TrendPoint {
  date: DateKey;
  weightKg: number;
  averageKg: number;
}

/**
 * Trailing moving average of body weight, so the daily scale number doesn't drive decisions.
 *
 *   averageKg(day) = mean of weigh-ins dated (day - windowDays + 1) ... day
 *
 * The window counts calendar days, not entries: skipped weigh-ins shrink the sample
 * rather than pulling in older data. If you weigh in twice on one day, the later
 * entry (last in input order) is used.
 */
export function weightTrend(
  weighIns: WeighIn[],
  windowDays: number = TUNABLES.weight.movingAverageDays,
): TrendPoint[] {
  const weightByDay = new Map<DateKey, number>();
  for (const weighIn of weighIns) weightByDay.set(weighIn.date, weighIn.weightKg);

  // DateKeys sort chronologically as plain strings.
  const days = [...weightByDay.keys()].sort();

  return days.map((date) => {
    const windowStart = addDays(date, -(windowDays - 1));
    const inWindow = days
      .filter((day) => day >= windowStart && day <= date)
      .map((day) => weightByDay.get(day)!);
    const averageKg = inWindow.reduce((sum, kg) => sum + kg, 0) / inWindow.length;
    return { date, weightKg: weightByDay.get(date)!, averageKg };
  });
}
