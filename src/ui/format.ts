import { fromDateKey, type DateKey } from '@/domain/dates';
import { kgToLb } from '@/domain/units';

/** "Thu, Sep 10" */
export function formatShortDate(key: DateKey): string {
  return fromDateKey(key).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/** "Thursday, September 10" */
export function formatLongDate(key: DateKey): string {
  return fromDateKey(key).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

/** Body or gym weight for display: "182.4 lb" */
export function formatLb(kg: number, decimals = 1): string {
  return `${kgToLb(kg).toFixed(decimals)} lb`;
}

/** 450 -> "7 h 30 min" */
export function formatHoursMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

/** "Sep 4" */
export function formatMonthDay(key: DateKey): string {
  return fromDateKey(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** "Sep" */
export function formatMonth(key: DateKey): string {
  return fromDateKey(key).toLocaleDateString('en-US', { month: 'short' });
}

/** 9684 -> "9.7k", 8000 -> "8k", 812 -> "812" */
export function formatCompact(n: number): string {
  if (Math.abs(n) < 1000) return String(Math.round(n));
  return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k`;
}

/** "7:12 AM" in the phone's own format. */
export function formatClock(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
