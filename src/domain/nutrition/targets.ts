import { TUNABLES } from '../../config/tunables';
import type { DailyActivity, Sex } from '../profile';

export interface TargetInput {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  goalWeightKg: number;
  dailyActivity: DailyActivity;
}

export interface Targets {
  bmr: number;
  tdee: number;
  deficitKcal: number;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  reason: string;
}

/** Mifflin-St Jeor: 10·kg + 6.25·cm − 5·age + 5 (men) / − 161 (women). */
export function mifflinStJeor(input: Pick<TargetInput, 'sex' | 'age' | 'heightCm' | 'weightKg'>): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;
  return base + (input.sex === 'male' ? 5 : -161);
}

/**
 * Daily targets.
 *   TDEE    = BMR × activity factor (desk job 1.35 … on your feet 1.65; training is logged separately
 *             and already reflected in a moderate factor)
 *   deficit = weight × weekly loss fraction (0.6 %/wk) × 7700 kcal/kg ÷ 7, capped at 500 kcal
 *   kcal    = TDEE − deficit, never below BMR
 *   protein = 1.8 g/kg (priority on a vegetarian diet)
 *   fat     ≥ 0.8 g/kg
 *   carbs   = whatever calories remain
 * `adjustKcal` shifts the result when the fortnightly review says the trend is off.
 */
export function computeTargets(input: TargetInput, adjustKcal = 0): Targets {
  const n = TUNABLES.nutrition;
  const bmr = mifflinStJeor(input);
  const tdee = bmr * n.activityFactor[input.dailyActivity];
  const atGoal = input.weightKg <= input.goalWeightKg;
  const rawDeficit = atGoal ? 0 : (input.weightKg * n.weeklyLossFraction * n.kcalPerKgFat) / 7;
  const deficitKcal = Math.min(n.maxDeficitKcal, Math.round(rawDeficit));

  let kcal = Math.round(tdee - deficitKcal + adjustKcal);
  let reason = atGoal ? 'At goal weight: maintenance calories.' : `${Math.round(deficitKcal)} kcal/day deficit for about ${(n.weeklyLossFraction * 100).toFixed(1)}% of body weight per week.`;
  if (kcal < bmr) {
    kcal = Math.round(bmr);
    reason += ' Held at BMR as a floor.';
  }
  if (adjustKcal !== 0) reason += ` Adjusted ${adjustKcal > 0 ? '+' : ''}${adjustKcal} kcal from the weight trend.`;

  const proteinG = Math.round(input.weightKg * n.proteinGPerKg);
  const fatG = Math.round(input.weightKg * n.fatMinGPerKg);
  const carbsG = Math.max(0, Math.round((kcal - proteinG * 4 - fatG * 9) / 4));
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), deficitKcal, kcal, proteinG, fatG, carbsG, reason };
}

export type DayType = 'training' | 'rest' | 'normal';

/** Carbs go up a bit on run and tennis days and down on rest days; protein and fat stay put. */
export function targetsForDay(base: Targets, dayType: DayType): Targets {
  const n = TUNABLES.nutrition;
  const shift = dayType === 'training' ? n.carbShiftTraining : dayType === 'rest' ? n.carbShiftRest : 0;
  const carbsG = Math.round(base.carbsG * (1 + shift));
  const kcal = base.kcal + (carbsG - base.carbsG) * 4;
  return { ...base, carbsG, kcal, reason: shift === 0 ? base.reason : `${base.reason} ${shift > 0 ? 'Extra' : 'Fewer'} carbs today (${dayType} day).` };
}

/**
 * Fortnightly check: compare the actual weight trend against the target rate and nudge
 * calories by one step. Returns the adjustment to add to the base calories.
 *   trend faster than 0.75 %/wk → +step (losing too fast)
 *   trend slower than 0.5 %/wk  → −step
 */
export function recalcAdjustment(trendStartKg: number, trendEndKg: number, days: number, currentAdjust: number): { adjustKcal: number; reason: string } {
  const n = TUNABLES.nutrition;
  if (days < 7) return { adjustKcal: currentAdjust, reason: 'Not enough trend data yet.' };
  const weeklyLossFraction = ((trendStartKg - trendEndKg) / trendStartKg) * (7 / days);
  const pct = (weeklyLossFraction * 100).toFixed(2);
  if (weeklyLossFraction > n.maxWeeklyLossFraction) {
    return { adjustKcal: currentAdjust + n.recalcStepKcal, reason: `Losing ${pct}%/week, faster than the ${(n.maxWeeklyLossFraction * 100).toFixed(2)}% ceiling: +${n.recalcStepKcal} kcal.` };
  }
  if (weeklyLossFraction < n.minWeeklyLossFraction) {
    return { adjustKcal: currentAdjust - n.recalcStepKcal, reason: `Losing ${pct}%/week, slower than the ${(n.minWeeklyLossFraction * 100).toFixed(2)}% target: −${n.recalcStepKcal} kcal.` };
  }
  return { adjustKcal: currentAdjust, reason: `Losing ${pct}%/week, on target. No change.` };
}
