/**
 * Calendar helpers.
 *
 * A day is identified by a local "YYYY-MM-DD" key (DateKey). Using local calendar
 * days instead of UTC timestamps keeps a late-evening workout on the day you did it,
 * and keeps week maths immune to daylight-saving shifts.
 */

export type DateKey = string;

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function toDateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Local midnight of the given day. */
export function fromDateKey(key: DateKey): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function todayKey(now: Date = new Date()): DateKey {
  return toDateKey(now);
}

export function addDays(key: DateKey, days: number): DateKey {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

/** Whole calendar days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: DateKey, to: DateKey): number {
  // Rounding absorbs the 23h / 25h days around daylight-saving changes.
  return Math.round((fromDateKey(to).getTime() - fromDateKey(from).getTime()) / MS_PER_DAY);
}

export function weekdayOf(key: DateKey): Weekday {
  // JS getDay() is 0 = Sunday; shift so index 0 = Monday.
  return WEEKDAYS[(fromDateKey(key).getDay() + 6) % 7];
}

/** Monday of the week containing `key`. Weeks run Monday to Sunday. */
export function startOfWeek(key: DateKey): DateKey {
  return addDays(key, -WEEKDAYS.indexOf(weekdayOf(key)));
}

export function weekDates(weekStart: DateKey): DateKey[] {
  return WEEKDAYS.map((_, i) => addDays(weekStart, i));
}

/** The weekday after `day`, wrapping Sunday to Monday. */
export function nextWeekday(day: Weekday): Weekday {
  return WEEKDAYS[(WEEKDAYS.indexOf(day) + 1) % WEEKDAYS.length];
}

/** "06:30" -> minutes after midnight (390). Returns null for anything invalid. */
export function parseTimeOfDay(text: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Minutes after midnight -> "06:30" (24h, used for storage). */
export function formatTimeOfDay(minutesAfterMidnight: number): string {
  const wrapped = ((minutesAfterMidnight % 1440) + 1440) % 1440;
  return `${pad2(Math.floor(wrapped / 60))}:${pad2(wrapped % 60)}`;
}

/** Minutes after midnight -> "6:30 AM" (for display). */
export function formatTimeOfDay12h(minutesAfterMidnight: number): string {
  const wrapped = ((minutesAfterMidnight % 1440) + 1440) % 1440;
  const hours24 = Math.floor(wrapped / 60);
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${pad2(wrapped % 60)} ${hours24 < 12 ? 'AM' : 'PM'}`;
}

export function ageInYear(birthYear: number, today: Date = new Date()): number {
  return today.getFullYear() - birthYear;
}

/** Midnight at the start of the local day containing `ms`, as epoch ms. */
export function startOfLocalDay(ms: number): number {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}
