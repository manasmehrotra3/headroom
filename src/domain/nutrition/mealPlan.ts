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

export type ProteinBase = 'paneer' | 'soy' | 'egg' | 'whey' | 'legume' | 'lentil' | 'besan' | 'dairy' | 'other';

/** Infers the primary protein base of a dish so the same base doesn't dominate a single day. */
export function proteinBaseOf(dish: FoodItem): ProteinBase {
  if (dish.tags.includes('egg')) return 'egg';
  if (dish.tags.includes('whey')) return 'whey';
  if (dish.tags.includes('paneer')) return 'paneer';
  if (dish.tags.includes('soy')) return 'soy';
  const n = dish.name.toLowerCase();
  if (/\b(besan|sattu|dhokla|pithla|gatte|kadhi|kothimbir)\b/.test(n)) return 'besan';
  if (/\b(rajma|chole|chana|chickpea|lobia|matki|moth|misal|sundal|peanut)\b/.test(n)) return 'legume';
  if (/\b(dal|moong|masoor|toor|urad|sambar|pesarattu|adai|handvo|khichdi|pongal|bisi bele|sprouts)\b/.test(n)) return 'lentil';
  if (dish.tags.includes('dairy') || /\b(curd|yogurt|raita|chaas|lassi|milk)\b/.test(n)) return 'dairy';
  return 'other';
}

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
 * Variety-first weekly Indian vegetarian meal plan:
 * - No dish repeats within `noRepeatDays` (7 days), plus respects `recentFoodIds` from last week.
 * - Avoids repeating the same primary protein base (paneer, soy/tofu/tempeh, dal, legumes, besan,
 *   curd/dairy) within the same day so meals feel genuinely varied.
 * - Rotates cleanly through seeded protein-anchored regional dishes instead of greedily picking
 *   only the top 2-3 soya/paneer items.
 */
export function generateMealPlan(
  weekStart: DateKey,
  dishes: FoodItem[],
  prefs: Preferences,
  targetsFor: (date: DateKey) => Targets,
  seed = 1,
  recentFoodIds: readonly string[] = [],
): PlannedMeal[] {
  const n = TUNABLES.nutrition;
  const pool = allowedDishes(dishes, prefs);
  const meals: PlannedMeal[] = [];
  const lastUsed = new Map<string, number>(); // foodId -> day index (negative for previous week)
  for (const id of recentFoodIds) lastUsed.set(id, -1);

  const rotation = new Map<MealSlot, FoodItem[]>();
  for (const slot of SLOTS) {
    rotation.set(slot, seededOrder(pool.filter((d) => d.slots.includes(slot)), seed + SLOTS.indexOf(slot) * 97));
  }

  for (let day = 0; day < 7; day += 1) {
    const date = addDays(weekStart, day);
    const targets = targetsFor(date);
    const usedBasesToday = new Set<ProteinBase>();

    for (const slot of SLOTS) {
      const repeats = prefs.cookOnce && day > 0 && day % 2 === 1 && (n.cookOnceSlots as readonly MealSlot[]).includes(slot);
      if (repeats) {
        const yesterday = meals.find((m) => m.date === addDays(weekStart, day - 1) && m.slot === slot);
        if (yesterday) {
          meals.push({ ...yesterday, date, leftover: true });
          lastUsed.set(yesterday.foodId, day);
          const dish = pool.find((d) => d.id === yesterday.foodId);
          if (dish) usedBasesToday.add(proteinBaseOf(dish));
          continue;
        }
      }

      const candidates = rotation.get(slot) ?? [];
      const slotKcal = targets.kcal * n.slotShare[slot];

      const isFresh = (d: FoodItem) => {
        const last = lastUsed.get(d.id);
        return last === undefined || day - last >= n.noRepeatDays;
      };
      const notToday = (d: FoodItem) => lastUsed.get(d.id) !== day;

      const fresh = candidates.filter(isFresh);
      const freshAnchors = fresh.filter((d) => d.tags.includes('protein_anchor'));
      const freshDiverseAnchors = freshAnchors.filter((d) => !usedBasesToday.has(proteinBaseOf(d)));
      const freshDiverse = fresh.filter((d) => !usedBasesToday.has(proteinBaseOf(d)));
      const fallbackNotToday = candidates.filter(notToday);

      const tier = freshDiverseAnchors.length
        ? freshDiverseAnchors
        : freshAnchors.length
          ? freshAnchors
          : freshDiverse.length
            ? freshDiverse
            : fresh.length
              ? fresh
              : fallbackNotToday.length
                ? fallbackNotToday
                : candidates;

      // Pick the next item in the seeded rotation so every regional dish gets its turn.
      const chosen = tier[0];
      if (!chosen) continue;

      const list = rotation.get(slot)!;
      list.splice(list.indexOf(chosen), 1);
      list.push(chosen);
      lastUsed.set(chosen.id, day);
      usedBasesToday.add(proteinBaseOf(chosen));

      const grams = portionFor(chosen, slotKcal);
      meals.push({ date, slot, foodId: chosen.id, name: chosen.name, grams, macros: scale(chosen.per100, grams) });
    }

    // Protein top-up: if the day is noticeably short on protein, swap the snack for a fresh
    // high-protein snack (still respecting noRepeatDays and rotating so snacks never repeat).
    const totals = dayTotals(meals, date);
    if (totals.proteinG < targets.proteinG * 0.85) {
      const snack = meals.find((m) => m.date === date && m.slot === 'snack');
      const snackList = rotation.get('snack') ?? [];
      const snackKcal = targets.kcal * n.slotShare.snack;
      const freshHighProtein = snackList.filter((d) => {
        if (d.id === snack?.foodId) return false;
        const last = lastUsed.get(d.id);
        if (last !== undefined && day - last < n.noRepeatDays) return false;
        const grams = portionFor(d, snackKcal);
        return scale(d.per100, grams).proteinG > (snack?.macros.proteinG ?? 0) + 4;
      });
      const diverseSnacks = freshHighProtein.filter((d) => !usedBasesToday.has(proteinBaseOf(d)));
      const poolPick = diverseSnacks.length ? diverseSnacks : freshHighProtein;
      // Pick from the next few in rotation rather than always grabbing the #1 protein bomb.
      const best = poolPick.slice(0, 3).sort((a, b) => b.per100.proteinG / Math.max(1, b.per100.kcal) - a.per100.proteinG / Math.max(1, a.per100.kcal))[0];
      if (snack && best) {
        if (lastUsed.get(snack.foodId) === day) lastUsed.delete(snack.foodId);
        const grams = portionFor(best, snackKcal);
        snack.foodId = best.id;
        snack.name = best.name;
        snack.grams = grams;
        snack.macros = scale(best.per100, grams);
        lastUsed.set(best.id, day);
        snackList.splice(snackList.indexOf(best), 1);
        snackList.push(best);
      }
    }
  }
  return meals;
}

/** Dishes with similar calories and protein to swap a meal for, closest first. */
export function swapCandidates(meal: PlannedMeal, dishes: FoodItem[], prefs: Preferences, limit = 8): { dish: FoodItem; grams: number; macros: Macros }[] {
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
    .reduce(
      (sum, m) => ({
        kcal: sum.kcal + m.macros.kcal,
        proteinG: sum.proteinG + m.macros.proteinG,
        carbsG: sum.carbsG + m.macros.carbsG,
        fatG: sum.fatG + m.macros.fatG,
        fiberG: sum.fiberG + m.macros.fiberG,
      }),
      { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
    );
}
