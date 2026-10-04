import { TUNABLES } from '../../config/tunables';
import { addDays, type DateKey } from '../dates';
import type { Targets } from './targets';
import { scale, type FoodItem, type Macros, type MealSlot } from './types';

export interface Preferences {
  eatsEggs: boolean;
  wheyOk: boolean;
  dislikedFoods: string[];
  /** "Cook once, eat twice": repeat dinner the next day instead of cooking again. */
  cookOnce?: boolean;
}

export interface PlannedMeal {
  date: DateKey;
  slot: MealSlot;
  foodId: string;
  name: string;
  grams: number;
  macros: Macros;
  /** True when this is yesterday's cooking eaten again. */
  leftover?: boolean;
}

const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'snack', 'dinner'];

/** Dishes the user can eat: respects eggs / whey and the dislike list (substring match on the name). */
export function allowedDishes(dishes: FoodItem[], prefs: Preferences): FoodItem[] {
  const dislikes = prefs.dislikedFoods.map((d) => d.toLowerCase().trim()).filter(Boolean);
  return dishes.filter((d) => {
    if (!d.isDish) return false;
    if (!prefs.eatsEggs && d.tags.includes('egg')) return false;
    if (!prefs.wheyOk && d.tags.includes('whey')) return false;
    const name = d.name.toLowerCase();
    return !dislikes.some((dis) => name.includes(dis) || d.tags.includes(dis));
  });
}

/** Deterministic shuffle so the same week gets the same plan until regenerated. */
function seededOrder<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let s = seed >>> 0;
  for (let i = out.length - 1; i > 0; i -= 1) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Portion for a dish in a slot: scale the default serving so the meal lands near the slot's
 * calorie share, between 0.6× and 2× the default serving, rounded to 5 g.
 */
export function portionFor(dish: FoodItem, slotKcal: number): number {
  const perServingKcal = scale(dish.per100, dish.serving.grams).kcal;
  if (perServingKcal <= 0) return dish.serving.grams;
  const factor = Math.min(2, Math.max(0.6, slotKcal / perServingKcal));
  return Math.round((dish.serving.grams * factor) / 5) * 5;
}

/**
 * Rule-based weekly plan.
 * For each day and slot: pick the dish (in a seeded rotation) that fits the slot, hasn't been
 * used within noRepeatDays, and prefers a protein anchor so every meal carries protein.
 * Portions are scaled to the slot's share of the day's calories.
 */
export function generateMealPlan(weekStart: DateKey, dishes: FoodItem[], prefs: Preferences, targetsFor: (date: DateKey) => Targets, seed = 1): PlannedMeal[] {
  const n = TUNABLES.nutrition;
  const pool = allowedDishes(dishes, prefs);
  const meals: PlannedMeal[] = [];
  const lastUsed = new Map<string, number>(); // foodId → day index
  const rotation = new Map<MealSlot, FoodItem[]>();
  for (const slot of SLOTS) rotation.set(slot, seededOrder(pool.filter((d) => d.slots.includes(slot)), seed + SLOTS.indexOf(slot) * 97));

  for (let day = 0; day < 7; day += 1) {
    const date = addDays(weekStart, day);
    const targets = targetsFor(date);
    for (const slot of SLOTS) {
      // Cook once, eat twice: on alternate days the chosen slots repeat yesterday's dish.
      const repeats = prefs.cookOnce && day > 0 && day % 2 === 1 && (n.cookOnceSlots as readonly MealSlot[]).includes(slot);
      if (repeats) {
        const yesterday = meals.find((m) => m.date === addDays(weekStart, day - 1) && m.slot === slot);
        if (yesterday) {
          meals.push({ ...yesterday, date, leftover: true });
          lastUsed.set(yesterday.foodId, day);
          continue;
        }
      }
      const candidates = rotation.get(slot) ?? [];
      const slotKcal = targets.kcal * n.slotShare[slot];
      const fresh = candidates.filter((d) => {
        const last = lastUsed.get(d.id);
        return last === undefined || day - last >= n.noRepeatDays;
      });
      const anchors = fresh.filter((d) => d.tags.includes('protein_anchor'));
      // Of the next few anchors in the rotation, take the most protein-dense: variety stays,
      // protein (the hard part on a vegetarian diet) gets priority.
      const shortlist = (anchors.length ? anchors : fresh.length ? fresh : candidates).slice(0, 3);
      const chosen = shortlist.sort((a, b) => b.per100.proteinG / Math.max(1, b.per100.kcal) - a.per100.proteinG / Math.max(1, a.per100.kcal))[0];
      if (!chosen) continue;
      // Move it to the back of the rotation so the next day gets something else.
      const list = rotation.get(slot)!;
      list.splice(list.indexOf(chosen), 1);
      list.push(chosen);
      lastUsed.set(chosen.id, day);
      const grams = portionFor(chosen, slotKcal);
      meals.push({ date, slot, foodId: chosen.id, name: chosen.name, grams, macros: scale(chosen.per100, grams) });
    }

    // Protein top-up: if the day is short, swap the snack for the most protein-dense snack available.
    const totals = dayTotals(meals, date);
    if (totals.proteinG < targets.proteinG * 0.9) {
      const snack = meals.find((m) => m.date === date && m.slot === 'snack');
      const best = pool
        .filter((d) => d.slots.includes('snack') && d.id !== snack?.foodId && (lastUsed.get(d.id) === undefined || day - lastUsed.get(d.id)! >= n.noRepeatDays || d.id === snack?.foodId))
        .sort((a, b) => b.per100.proteinG / Math.max(1, b.per100.kcal) - a.per100.proteinG / Math.max(1, a.per100.kcal))[0];
      if (snack && best) {
        const grams = portionFor(best, targets.kcal * n.slotShare.snack);
        snack.foodId = best.id;
        snack.name = best.name;
        snack.grams = grams;
        snack.macros = scale(best.per100, grams);
        lastUsed.set(best.id, day);
      }
    }
  }
  return meals;
}

/** Dishes with similar calories and protein to swap a meal for, closest first. */
export function swapCandidates(meal: PlannedMeal, dishes: FoodItem[], prefs: Preferences, limit = 5): { dish: FoodItem; grams: number; macros: Macros }[] {
  const tolerance = TUNABLES.nutrition.swapTolerance;
  return allowedDishes(dishes, prefs)
    .filter((d) => d.id !== meal.foodId && d.slots.includes(meal.slot))
    .map((dish) => {
      const grams = portionFor(dish, meal.macros.kcal);
      const macros = scale(dish.per100, grams);
      const kcalDiff = Math.abs(macros.kcal - meal.macros.kcal) / Math.max(1, meal.macros.kcal);
      const proteinDiff = Math.abs(macros.proteinG - meal.macros.proteinG) / Math.max(1, meal.macros.proteinG);
      return { dish, grams, macros, score: kcalDiff + proteinDiff, ok: kcalDiff <= tolerance && proteinDiff <= tolerance * 2 };
    })
    .sort((a, b) => Number(b.ok) - Number(a.ok) || a.score - b.score)
    .slice(0, limit)
    .map(({ dish, grams, macros }) => ({ dish, grams, macros }));
}

export interface GroceryLine {
  item: string;
  qty: number;
  unit: string;
}

/** Sums each dish's ingredient list, scaled by portion vs default serving, across the week. */
export function groceryList(meals: PlannedMeal[], dishes: FoodItem[], grocery: Record<string, { item: string; qty: number; unit: string }[]>): GroceryLine[] {
  const totals = new Map<string, GroceryLine>();
  for (const meal of meals) {
    const dish = dishes.find((d) => d.id === meal.foodId);
    const lines = grocery[meal.foodId] ?? [];
    const factor = dish ? meal.grams / dish.serving.grams : 1;
    for (const line of lines) {
      const key = `${line.item.toLowerCase()}|${line.unit}`;
      const existing = totals.get(key) ?? { item: line.item, qty: 0, unit: line.unit };
      existing.qty += line.qty * factor;
      totals.set(key, existing);
    }
  }
  return [...totals.values()]
    .map((l) => ({ ...l, qty: l.unit === 'g' || l.unit === 'ml' ? Math.ceil(l.qty / 50) * 50 : Math.ceil(l.qty * 2) / 2 }))
    .sort((a, b) => a.item.localeCompare(b.item));
}

export function dayTotals(meals: PlannedMeal[], date: DateKey): Macros {
  return meals
    .filter((m) => m.date === date)
    .reduce((sum, m) => ({ kcal: sum.kcal + m.macros.kcal, proteinG: sum.proteinG + m.macros.proteinG, carbsG: sum.carbsG + m.macros.carbsG, fatG: sum.fatG + m.macros.fatG, fiberG: sum.fiberG + m.macros.fiberG }), { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 });
}
