/**
 * Unit conversions and formatting.
 *
 * The database stores SI units only (kg, cm, metres, seconds). Convert to
 * lb / miles / feet-inches at the edges: in forms and on screen.
 */

export const KG_PER_LB = 0.45359237;
export const METERS_PER_MILE = 1609.344;
export const CM_PER_INCH = 2.54;

export const lbToKg = (lb: number): number => lb * KG_PER_LB;
export const kgToLb = (kg: number): number => kg / KG_PER_LB;
export const milesToMeters = (miles: number): number => miles * METERS_PER_MILE;
export const metersToMiles = (meters: number): number => meters / METERS_PER_MILE;

export function feetInchesToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * CM_PER_INCH;
}

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = Math.round(cm / CM_PER_INCH);
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

/** Round to the nearest step, e.g. roundTo(47, 5) = 45. Avoids float noise like 12.500000001. */
export function roundTo(value: number, step: number): number {
  return Number((Math.round(value / step) * step).toFixed(6));
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Seconds -> "m:ss", or "h:mm:ss" from one hour up. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  return hours > 0 ? `${hours}:${pad2(minutes)}:${pad2(seconds)}` : `${minutes}:${pad2(seconds)}`;
}

/** "24:30" or "1:02:03" -> seconds. Returns null if it isn't a valid duration. */
export function parseDuration(text: string): number | null {
  const parts = text.trim().split(':');
  if (parts.length < 2 || parts.length > 3) return null;
  if (parts.some((part) => !/^\d+$/.test(part))) return null;
  if (parts[parts.length - 1].length !== 2) return null;

  const numbers = parts.map(Number);
  const [hours, minutes, seconds] = numbers.length === 3 ? numbers : [0, numbers[0], numbers[1]];
  if (seconds > 59) return null;
  if (numbers.length === 3 && minutes > 59) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

/** Running pace in seconds per mile. */
export function paceSecPerMile(distanceMeters: number, durationSeconds: number): number {
  return durationSeconds / metersToMiles(distanceMeters);
}

/** Seconds per mile -> "8:03 /mi". */
export function formatPace(secondsPerMile: number): string {
  return `${formatDuration(secondsPerMile)} /mi`;
}
