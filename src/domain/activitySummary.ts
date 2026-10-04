/**
 * Describing what you actually did, for the "done today" list. Pure so the wording is testable;
 * the clock time arrives already formatted, since that depends on the phone's locale.
 */
import { metersToMiles } from './units';

/** "7:12 AM · 3.4 mi · avg HR 148", leaving out whatever the watch didn't record. */
export function activityDetailLine(parts: { time: string; distanceM: number | null; avgHr: number | null }): string {
  const bits = [parts.time];
  if (parts.distanceM !== null && parts.distanceM > 0) bits.push(`${metersToMiles(parts.distanceM).toFixed(2)} mi`);
  if (parts.avgHr !== null && parts.avgHr > 0) bits.push(`avg HR ${parts.avgHr}`);
  return bits.join(' · ');
}

/** "2 sessions · 1 h 12 min" under the list, so the day adds up at a glance. */
export function doneSummary(durationsSec: readonly number[]): string {
  const count = durationsSec.length;
  const minutes = Math.round(durationsSec.reduce((sum, s) => sum + s, 0) / 60);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const time = hours === 0 ? `${rest} min` : rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
  return `${count} ${count === 1 ? 'session' : 'sessions'} · ${time}`;
}

/** "RPE 7", or "RPE 7*" while that rating is still only a guess from heart rate. */
export function rpeLabel(rpe: number | null, estimated: boolean): string | undefined {
  if (rpe === null) return undefined;
  return `RPE ${Math.round(rpe)}${estimated ? '*' : ''}`;
}
