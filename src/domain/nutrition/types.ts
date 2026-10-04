export type MealSlot = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner' };

/**
 * Food can also be logged outside the planned meals: fruit through the day, a yoghurt, anything
 * picked at. Those go in "extra", which the weekly plan never fills, so it is a logging slot only.
 */
export type LogSlot = MealSlot | 'extra';

export const LOG_SLOTS: readonly LogSlot[] = ['breakfast', 'lunch', 'snack', 'dinner', 'extra'];

export const LOG_SLOT_LABELS: Record<LogSlot, string> = { ...MEAL_SLOT_LABELS, extra: 'Extras' };

/** Only the planned meals can be "eaten as planned"; extras are whatever you reach for. */
export function isPlannedSlot(slot: LogSlot): slot is MealSlot {
  return slot !== 'extra';
}

export interface Macros {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
}

/** A food or dish as the planner sees it: per-100 g macros plus a default serving. */
export interface FoodItem {
  id: string;
  name: string;
  per100: Macros;
  /** Default serving in grams and its label ("1 katori"). */
  serving: { label: string; grams: number };
  isDish: boolean;
  slots: MealSlot[];
  tags: string[];
  isEstimate: boolean;
}

export function scale(per100: Macros, grams: number): Macros {
  const f = grams / 100;
  return {
    kcal: per100.kcal * f,
    proteinG: per100.proteinG * f,
    carbsG: per100.carbsG * f,
    fatG: per100.fatG * f,
    fiberG: per100.fiberG * f,
  };
}

export function addMacros(a: Macros, b: Macros): Macros {
  return { kcal: a.kcal + b.kcal, proteinG: a.proteinG + b.proteinG, carbsG: a.carbsG + b.carbsG, fatG: a.fatG + b.fatG, fiberG: a.fiberG + b.fiberG };
}

export const ZERO_MACROS: Macros = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 };
