import { SEED_FOODS, toFoodItems, GROCERY_BY_DISH } from '../../data/foods';
import { addDays } from '../dates';
import { allowedDishes, dayTotals, generateMealPlan, groceryList, portionFor, swapCandidates } from './mealPlan';
import type { Targets } from './targets';

const dishes = toFoodItems(SEED_FOODS);
const targets: Targets = { bmr: 1800, tdee: 2400, deficitKcal: 500, kcal: 1900, proteinG: 150, fatG: 67, carbsG: 175, reason: '' };
const prefs = { eatsEggs: false, wheyOk: true, dislikedFoods: [] };
const WEEK = '2026-09-07';

describe('seed food data', () => {
  it('has around 150 foods with unique ids and sane macros', () => {
    expect(SEED_FOODS.length).toBeGreaterThanOrEqual(140);
    expect(new Set(SEED_FOODS.map((f) => f.id)).size).toBe(SEED_FOODS.length);
    for (const f of SEED_FOODS) {
      const fromMacros = f.protein100 * 4 + f.carbs100 * 4 + f.fat100 * 9;
      // Calories should roughly match the 4/4/9 rule (fibre and rounding allow some slack).
      expect(Math.abs(fromMacros - f.kcal100)).toBeLessThan(Math.max(40, f.kcal100 * 0.25));
      expect(f.servings.length).toBeGreaterThan(0);
      expect(f.servings.some((s) => s.isDefault)).toBe(true);
    }
  });

  it('has dishes for every slot and plenty of protein anchors', () => {
    for (const slot of ['breakfast', 'lunch', 'snack', 'dinner'] as const) {
      expect(dishes.filter((d) => d.isDish && d.slots.includes(slot)).length).toBeGreaterThanOrEqual(8);
    }
    expect(dishes.filter((d) => d.tags.includes('protein_anchor')).length).toBeGreaterThanOrEqual(25);
  });
});

describe('allowedDishes', () => {
  it('respects eggs, whey and dislikes', () => {
    const noEgg = allowedDishes(dishes, prefs);
    expect(noEgg.some((d) => d.tags.includes('egg'))).toBe(false);
    const withEgg = allowedDishes(dishes, { ...prefs, eatsEggs: true });
    expect(withEgg.length).toBeGreaterThan(noEgg.length);
    const noPaneer = allowedDishes(dishes, { ...prefs, dislikedFoods: ['paneer'] });
    expect(noPaneer.some((d) => d.name.toLowerCase().includes('paneer'))).toBe(false);
    const noWhey = allowedDishes(dishes, { ...prefs, wheyOk: false });
    expect(noWhey.some((d) => d.tags.includes('whey'))).toBe(false);
  });
});

describe('generateMealPlan', () => {
  const plan = generateMealPlan(WEEK, dishes, prefs, () => targets);

  it('fills 4 slots a day for 7 days', () => {
    expect(plan).toHaveLength(28);
    expect(plan.filter((m) => m.slot === 'dinner')).toHaveLength(7);
  });

  it('never repeats a dish within 3 days', () => {
    for (const meal of plan) {
      const dayIndex = (date: string) => Math.round((new Date(date).getTime() - new Date(WEEK).getTime()) / 86400000);
      const clash = plan.find((m) => m !== meal && m.foodId === meal.foodId && Math.abs(dayIndex(m.date) - dayIndex(meal.date)) < 3);
      expect(clash).toBeUndefined();
    }
  });

  it('lands each day near the calorie target with a protein anchor in most meals', () => {
    for (let i = 0; i < 7; i += 1) {
      const totals = dayTotals(plan, addDays(WEEK, i));
      expect(totals.kcal).toBeGreaterThan(targets.kcal * 0.75);
      expect(totals.kcal).toBeLessThan(targets.kcal * 1.25);
      expect(totals.proteinG).toBeGreaterThan(90);
    }
    const anchored = plan.filter((m) => dishes.find((d) => d.id === m.foodId)!.tags.includes('protein_anchor'));
    expect(anchored.length).toBeGreaterThanOrEqual(20);
  });

  it('is deterministic for the same seed and different for another', () => {
    const again = generateMealPlan(WEEK, dishes, prefs, () => targets);
    expect(again.map((m) => m.foodId)).toEqual(plan.map((m) => m.foodId));
    const other = generateMealPlan(WEEK, dishes, prefs, () => targets, 2);
    expect(other.map((m) => m.foodId)).not.toEqual(plan.map((m) => m.foodId));
  });
});

describe('swaps and grocery', () => {
  const plan = generateMealPlan(WEEK, dishes, prefs, () => targets);

  it('offers swaps with similar calories and protein', () => {
    const lunch = plan.find((m) => m.slot === 'lunch')!;
    const options = swapCandidates(lunch, dishes, prefs);
    expect(options.length).toBeGreaterThan(0);
    expect(options[0].dish.id).not.toBe(lunch.foodId);
    expect(Math.abs(options[0].macros.kcal - lunch.macros.kcal) / lunch.macros.kcal).toBeLessThan(0.35);
  });

  it('scales portions to the slot calories within limits', () => {
    const dal = dishes.find((d) => d.id === 'dal_tadka')!;
    expect(portionFor(dal, 100000)).toBe(dal.serving.grams * 2);
    expect(portionFor(dal, 1)).toBe(Math.round((dal.serving.grams * 0.6) / 5) * 5);
  });

  it('builds a grocery list from the week', () => {
    const list = groceryList(plan, dishes, GROCERY_BY_DISH);
    expect(list.length).toBeGreaterThan(10);
    expect(list.every((l) => l.qty > 0)).toBe(true);
    expect(list.map((l) => l.item)).toEqual([...list.map((l) => l.item)].sort((a, b) => a.localeCompare(b)));
  });
});
