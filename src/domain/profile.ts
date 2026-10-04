import type { BodyArea } from './bodyAreas';
import { ageInYear } from './dates';

export type Sex = 'male' | 'female';
export type DailyActivity = 'sedentary' | 'light' | 'active';

export const DAILY_ACTIVITY_LABELS: Record<DailyActivity, string> = {
  sedentary: 'Mostly sitting (desk job)',
  light: 'On my feet some of the day',
  active: 'On my feet most of the day',
};

export interface Injury {
  area: BodyArea;
  note: string;
}

/** Everything about you that the plan and nutrition maths need. SI units. */
export interface Profile {
  /** First name for the greeting on Today. Optional: empty means "Good morning" on its own. */
  name: string;
  sex: Sex;
  birthYear: number;
  heightCm: number;
  startWeightKg: number;
  goalWeightKg: number;
  dailyActivity: DailyActivity;
  fiveKTimeSec: number | null;
  easyPaceSecPerMile: number | null;
  maxHr: number | null;
  garminModel: string;
  eatsEggs: boolean;
  wheyOk: boolean;
  dislikedFoods: string[];
  injuries: Injury[];
  sleepTargetMin: number;
}

/** A profile being filled in: the body basics may still be blank. */
export type ProfileDraft = Omit<Profile, 'sex' | 'birthYear' | 'heightCm' | 'startWeightKg' | 'goalWeightKg'> & {
  sex: Sex | null;
  birthYear: number | null;
  heightCm: number | null;
  startWeightKg: number | null;
  goalWeightKg: number | null;
};

export function validateBody(p: ProfileDraft, today: Date = new Date()): string[] {
  const errors: string[] = [];
  if (p.sex === null) errors.push('Choose a sex (used by the calorie and heart-rate formulas).');
  if (p.birthYear === null) {
    errors.push('Enter your age.');
  } else {
    const age = ageInYear(p.birthYear, today);
    if (age < 14 || age > 90) errors.push('Age should be between 14 and 90.');
  }
  if (p.heightCm === null || p.heightCm < 120 || p.heightCm > 230) {
    errors.push('Enter your height in feet and inches.');
  }
  if (p.startWeightKg === null || p.startWeightKg < 35 || p.startWeightKg > 250) {
    errors.push('Enter your current weight.');
  }
  if (p.goalWeightKg === null || p.goalWeightKg < 35 || p.goalWeightKg > 250) {
    errors.push('Enter your goal weight.');
  }
  return errors;
}

export function validateRunning(p: ProfileDraft): string[] {
  const errors: string[] = [];
  if (p.fiveKTimeSec !== null && (p.fiveKTimeSec < 12 * 60 || p.fiveKTimeSec > 60 * 60)) {
    errors.push('5K time should be between 12:00 and 60:00.');
  }
  if (p.easyPaceSecPerMile !== null && (p.easyPaceSecPerMile < 5 * 60 || p.easyPaceSecPerMile > 20 * 60)) {
    errors.push('Easy pace should be between 5:00 and 20:00 per mile.');
  }
  if (p.maxHr !== null && (p.maxHr < 120 || p.maxHr > 230)) {
    errors.push('Max heart rate should be between 120 and 230.');
  }
  return errors;
}

export function validateRoutine(p: ProfileDraft): string[] {
  if (p.sleepTargetMin < 5 * 60 || p.sleepTargetMin > 11 * 60) {
    return ['Sleep target should be between 5 and 11 hours.'];
  }
  return [];
}

/** Returns a complete Profile, or null while anything required is missing or invalid. */
export function draftToProfile(p: ProfileDraft, today: Date = new Date()): Profile | null {
  const errors = [...validateBody(p, today), ...validateRunning(p), ...validateRoutine(p)];
  if (errors.length > 0) return null;
  return {
    ...p,
    sex: p.sex!,
    birthYear: p.birthYear!,
    heightCm: p.heightCm!,
    startWeightKg: p.startWeightKg!,
    goalWeightKg: p.goalWeightKg!,
  };
}
