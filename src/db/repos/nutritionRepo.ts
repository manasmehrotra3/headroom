import { and, asc, desc, eq, gte, inArray, like, lte } from 'drizzle-orm';

import { TUNABLES } from '@/config/tunables';
import { GROCERY_BY_DISH, SEED_FOODS } from '@/data/foods';
import { addDays, ageInYear, daysBetween, startOfWeek, todayKey, weekDates, type DateKey } from '@/domain/dates';
import { generateMealPlan, groceryList, swapCandidates, type GroceryLine, type PlannedMeal, type Preferences } from '@/domain/nutrition/mealPlan';
import { recipeMacros } from '@/domain/nutrition/recipe';
import { computeTargets, recalcAdjustment, targetsForDay, type DayType, type Targets } from '@/domain/nutrition/targets';
import { addMacros, scale, ZERO_MACROS, type FoodItem, type LogSlot, type Macros, type MealSlot } from '@/domain/nutrition/types';
import { SESSION_TYPES } from '@/domain/schedule';
import { weightTrend } from '@/domain/weightTrend';

import { db } from '../client';
import { bodyMeasurements, favorites, foodLogs, foodServings, foods, mealPlanItems, nutritionTargets, plannedSessions, recipeIngredients, recipes, settings as settingsTable } from '../schema';
import { loadProfile } from './profileRepo';

export type FoodRow = typeof foods.$inferSelect;
export type ServingRow = typeof foodServings.$inferSelect;
export type FoodLogRow = typeof foodLogs.$inferSelect;

// ───────────────────────────── seed ─────────────────────────────

/** Loads the seed foods once; later app updates add new seed foods without touching existing rows. */
export function seedFoods(): void {
  const existing = new Set(db.select({ id: foods.id }).from(foods).all().map((r) => r.id));
  const missing = SEED_FOODS.filter((f) => !existing.has(f.id));
  if (missing.length === 0) return;
  db.transaction((tx) => {
    for (const f of missing) {
      tx.insert(foods)
        .values({
          id: f.id,
          name: f.name,
          source: 'seed',
          isEstimate: f.isEstimate,
          sourceRef: f.source,
          kcal100: f.kcal100,
          protein100: f.protein100,
          carbs100: f.carbs100,
          fat100: f.fat100,
          fiber100: f.fiber100,
          isDish: f.isDish,
          slots: f.slots,
          tags: f.tags,
          grocery: GROCERY_BY_DISH[f.id] ?? [],
        })
        .run();
      for (const s of f.servings) tx.insert(foodServings).values({ foodId: f.id, label: s.label, grams: s.grams, isDefault: s.isDefault }).run();
    }
  });
}

// ───────────────────────────── foods ─────────────────────────────

export function per100(f: FoodRow): Macros {
  return { kcal: f.kcal100, proteinG: f.protein100, carbsG: f.carbs100, fatG: f.fat100, fiberG: f.fiber100 };
}

export function getFood(id: string): FoodRow | undefined {
  return db.select().from(foods).where(eq(foods.id, id)).get();
}

export function servingsFor(foodId: string): ServingRow[] {
  return db.select().from(foodServings).where(eq(foodServings.foodId, foodId)).orderBy(desc(foodServings.isDefault), asc(foodServings.id)).all();
}

export function searchFoods(query: string, limit = 40): FoodRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return db.select().from(foods).orderBy(asc(foods.name)).limit(limit).all();
  const words = q.split(/\s+/);
  return db
    .select()
    .from(foods)
    .where(and(...words.map((w) => like(foods.name, `%${w}%`))))
    .orderBy(asc(foods.name))
    .limit(limit)
    .all();
}

export function toFoodItem(f: FoodRow): FoodItem {
  const serving = servingsFor(f.id)[0] ?? { label: '100 g', grams: 100 };
  return { id: f.id, name: f.name, per100: per100(f), serving: { label: serving.label, grams: serving.grams }, isDish: f.isDish, slots: f.slots, tags: f.tags, isEstimate: f.isEstimate };
}

export function allDishes(): FoodItem[] {
  return db.select().from(foods).where(eq(foods.isDish, true)).all().map(toFoodItem);
}

/** Adds a food from USDA / Open Food Facts / by hand. Returns its id. */
export function addFood(input: {
  id: string;
  name: string;
  source: 'usda' | 'off' | 'custom' | 'recipe';
  sourceRef: string;
  per100: Macros;
  servings: { label: string; grams: number }[];
  isDish?: boolean;
  slots?: MealSlot[];
  tags?: string[];
  isEstimate?: boolean;
}): string {
  db.transaction((tx) => {
    tx.insert(foods)
      .values({
        id: input.id,
        name: input.name,
        source: input.source,
        sourceRef: input.sourceRef,
        isEstimate: input.isEstimate ?? false,
        kcal100: input.per100.kcal,
        protein100: input.per100.proteinG,
        carbs100: input.per100.carbsG,
        fat100: input.per100.fatG,
        fiber100: input.per100.fiberG,
        isDish: input.isDish ?? false,
        slots: input.slots ?? [],
        tags: input.tags ?? [],
        createdAt: new Date(),
      })
      .onConflictDoUpdate({ target: foods.id, set: { name: input.name, kcal100: input.per100.kcal, protein100: input.per100.proteinG, carbs100: input.per100.carbsG, fat100: input.per100.fatG, fiber100: input.per100.fiberG } })
      .run();
    tx.delete(foodServings).where(eq(foodServings.foodId, input.id)).run();
    const servings = input.servings.length ? input.servings : [{ label: '100 g', grams: 100 }];
    servings.forEach((s, i) => tx.insert(foodServings).values({ foodId: input.id, label: s.label, grams: s.grams, isDefault: i === 0 }).run());
  });
  return input.id;
}

// ───────────────────────────── recipes ─────────────────────────────

export function createRecipe(input: { name: string; servings: number; ingredients: { foodId: string; grams: number }[]; slots: MealSlot[] }): string {
  const rows = input.ingredients.map((i) => ({ ...i, food: getFood(i.foodId)! })).filter((i) => i.food);
  const macros = recipeMacros(rows.map((i) => ({ per100: per100(i.food), grams: i.grams })), input.servings);
  const foodId = `recipe:${Date.now()}`;
  addFood({
    id: foodId,
    name: input.name,
    source: 'recipe',
    sourceRef: 'recipe',
    per100: macros.per100,
    servings: [{ label: '1 serving', grams: Math.round(macros.servingGrams) }],
    isDish: input.slots.length > 0,
    slots: input.slots,
    tags: rows.some((i) => i.food.protein100 >= 10) && macros.perServing.proteinG >= 15 ? ['protein_anchor'] : [],
    isEstimate: true,
  });
  db.transaction((tx) => {
    const recipeId = tx.insert(recipes).values({ foodId, name: input.name, servings: input.servings, createdAt: new Date() }).returning({ id: recipes.id }).get().id;
    for (const i of rows) tx.insert(recipeIngredients).values({ recipeId, foodId: i.foodId, grams: i.grams }).run();
  });
  return foodId;
}

// ───────────────────────────── targets ─────────────────────────────

export function latestTargets(date: DateKey = todayKey()) {
  return db.select().from(nutritionTargets).where(lte(nutritionTargets.effectiveFrom, date)).orderBy(desc(nutritionTargets.effectiveFrom), desc(nutritionTargets.id)).limit(1).get();
}

function trendWeightKg(date: DateKey): number | null {
  const rows = db.select().from(bodyMeasurements).where(and(gte(bodyMeasurements.date, addDays(date, -20)), lte(bodyMeasurements.date, date))).all();
  const trend = weightTrend(rows.flatMap((r) => (r.weightKg === null ? [] : [{ date: r.date, weightKg: r.weightKg }])));
  return trend.at(-1)?.averageKg ?? null;
}

function baseInputs(date: DateKey) {
  const profile = loadProfile();
  if (!profile) return null;
  return { sex: profile.sex, age: ageInYear(profile.birthYear), heightCm: profile.heightCm, weightKg: trendWeightKg(date) ?? profile.startWeightKg, goalWeightKg: profile.goalWeightKg, dailyActivity: profile.dailyActivity };
}

/** Creates the first targets, and every 14 days reviews them against the weight trend. */
export function ensureNutritionTargets(date: DateKey = todayKey()): void {
  const inputs = baseInputs(date);
  if (!inputs) return;
  const latest = latestTargets(date);
  if (!latest) {
    const t = computeTargets(inputs, 0);
    db.insert(nutritionTargets).values({ effectiveFrom: date, ...t, adjustKcal: 0 }).run();
    return;
  }
  const days = daysBetween(latest.effectiveFrom, date);
  if (days < TUNABLES.nutrition.recalcEveryDays) return;
  recalcTargets(date, latest.effectiveFrom, latest.adjustKcal);
}

export function recalcTargets(date: DateKey, since: DateKey, currentAdjust: number): string {
  const inputs = baseInputs(date);
  if (!inputs) return 'No profile.';
  const start = trendWeightKg(since);
  const end = trendWeightKg(date);
  const { adjustKcal, reason } = start !== null && end !== null ? recalcAdjustment(start, end, daysBetween(since, date), currentAdjust) : { adjustKcal: currentAdjust, reason: 'Not enough weigh-ins to judge the trend; targets kept.' };
  const t = computeTargets(inputs, adjustKcal);
  db.insert(nutritionTargets).values({ effectiveFrom: date, ...t, adjustKcal, reason: `${t.reason} ${reason}` }).run();
  return reason;
}

export function dayTypeFor(date: DateKey): DayType {
  const session = db.select().from(plannedSessions).where(eq(plannedSessions.date, date)).get();
  if (!session || session.status === 'sick' || session.status === 'travel') return 'rest';
  const kind = SESSION_TYPES[session.sessionType].kind;
  if (kind === 'run' || kind === 'tennis') return 'training';
  if (kind === 'rest' || kind === 'mobility') return 'rest';
  return 'normal';
}

/** Today's targets after the day-type carb shift. */
export function dayTargets(date: DateKey = todayKey()): Targets | null {
  const latest = latestTargets(date);
  if (!latest) return null;
  return targetsForDay(latest, dayTypeFor(date));
}

// ───────────────────────────── logging ─────────────────────────────

export function logFood(input: { date: DateKey; slot: LogSlot; food: FoodRow; servingLabel: string; quantity: number; grams: number }): void {
  const m = scale(per100(input.food), input.grams);
  db.insert(foodLogs)
    .values({
      date: input.date,
      slot: input.slot,
      foodId: input.food.id,
      foodName: input.food.name,
      servingLabel: `${input.quantity} × ${input.servingLabel}`,
      quantity: input.quantity,
      grams: input.grams,
      kcal: m.kcal,
      proteinG: m.proteinG,
      carbsG: m.carbsG,
      fatG: m.fatG,
      fiberG: m.fiberG,
      loggedAt: new Date(),
    })
    .run();
}

export function deleteFoodLog(id: number): void {
  db.delete(foodLogs).where(eq(foodLogs.id, id)).run();
}

export function logsOn(date: DateKey): FoodLogRow[] {
  return db.select().from(foodLogs).where(eq(foodLogs.date, date)).orderBy(asc(foodLogs.loggedAt)).all();
}

export function totalsOn(date: DateKey): Macros {
  return logsOn(date).reduce((sum, l) => addMacros(sum, { kcal: l.kcal, proteinG: l.proteinG, carbsG: l.carbsG, fatG: l.fatG, fiberG: l.fiberG }), ZERO_MACROS);
}

/** Copies yesterday's entries (or one slot of them) onto `date`. */
export function copyYesterday(date: DateKey, slot?: LogSlot): number {
  const rows = logsOn(addDays(date, -1)).filter((l) => !slot || l.slot === slot);
  db.transaction((tx) => {
    for (const { id: _id, ...row } of rows) tx.insert(foodLogs).values({ ...row, date, loggedAt: new Date() }).run();
  });
  return rows.length;
}

export function recentFoods(limit = 15): FoodRow[] {
  const ids = db.select({ foodId: foodLogs.foodId, at: foodLogs.loggedAt }).from(foodLogs).orderBy(desc(foodLogs.loggedAt)).limit(200).all();
  const unique = [...new Set(ids.map((r) => r.foodId))].slice(0, limit);
  if (unique.length === 0) return [];
  const rows = db.select().from(foods).where(inArray(foods.id, unique)).all();
  return unique.map((id) => rows.find((r) => r.id === id)).filter((r): r is FoodRow => !!r);
}

export function favoriteFoods(): FoodRow[] {
  const ids = db.select().from(favorites).orderBy(desc(favorites.addedAt)).all().map((f) => f.foodId);
  if (ids.length === 0) return [];
  const rows = db.select().from(foods).where(inArray(foods.id, ids)).all();
  return ids.map((id) => rows.find((r) => r.id === id)).filter((r): r is FoodRow => !!r);
}

export function isFavorite(foodId: string): boolean {
  return !!db.select().from(favorites).where(eq(favorites.foodId, foodId)).get();
}

export function toggleFavorite(foodId: string): boolean {
  if (isFavorite(foodId)) {
    db.delete(favorites).where(eq(favorites.foodId, foodId)).run();
    return false;
  }
  db.insert(favorites).values({ foodId, addedAt: new Date() }).run();
  return true;
}

/** Adherence for the weekly review: days with at least one entry, and average calories vs target. */
export function loggingSummary(from: DateKey, to: DateKey): { daysLogged: number; days: number; avgKcal: number | null; avgProtein: number | null } {
  const rows = db.select().from(foodLogs).where(and(gte(foodLogs.date, from), lte(foodLogs.date, to))).all();
  const byDay = new Map<DateKey, Macros>();
  for (const r of rows) byDay.set(r.date, addMacros(byDay.get(r.date) ?? ZERO_MACROS, { kcal: r.kcal, proteinG: r.proteinG, carbsG: r.carbsG, fatG: r.fatG, fiberG: r.fiberG }));
  const days = daysBetween(from, to) + 1;
  const logged = [...byDay.values()];
  return {
    daysLogged: logged.length,
    days,
    avgKcal: logged.length ? logged.reduce((s, m) => s + m.kcal, 0) / logged.length : null,
    avgProtein: logged.length ? logged.reduce((s, m) => s + m.proteinG, 0) / logged.length : null,
  };
}

// ───────────────────────────── meal plan ─────────────────────────────

function preferences(): Preferences {
  const profile = loadProfile();
  const settings = db.select().from(settingsTable).where(eq(settingsTable.id, 1)).get();
  return {
    eatsEggs: profile?.eatsEggs ?? false,
    wheyOk: profile?.wheyOk ?? false,
    dislikedFoods: profile?.dislikedFoods ?? [],
    cookOnce: settings?.cookOnce ?? false,
  };
}

export function ensureMealPlan(weekStart: DateKey, regenerate = false): void {
  const existing = db.select().from(mealPlanItems).where(eq(mealPlanItems.weekStart, weekStart)).all();
  if (existing.length > 0 && !regenerate) return;
  ensureNutritionTargets(weekStart > todayKey() ? todayKey() : weekStart);
  const dishes = allDishes();
  const seed = regenerate ? Date.now() % 100000 : Number(weekStart.replace(/-/g, '')) % 100000;
  const plan = generateMealPlan(weekStart, dishes, preferences(), (date) => dayTargets(date) ?? latestTargets(todayKey())!, seed);
  const pinned = existing.filter((e) => e.pinned);
  db.transaction((tx) => {
    tx.delete(mealPlanItems).where(and(eq(mealPlanItems.weekStart, weekStart), eq(mealPlanItems.pinned, false))).run();
    for (const meal of plan) {
      if (pinned.some((p) => p.date === meal.date && p.slot === meal.slot)) continue;
      tx.insert(mealPlanItems).values({ weekStart, date: meal.date, slot: meal.slot, foodId: meal.foodId, grams: meal.grams }).run();
    }
  });
}

export function plannedMealsFor(weekStart: DateKey): PlannedMeal[] {
  const rows = db.select().from(mealPlanItems).where(eq(mealPlanItems.weekStart, weekStart)).all();
  const ids = [...new Set(rows.map((r) => r.foodId))];
  const foodRows = ids.length ? db.select().from(foods).where(inArray(foods.id, ids)).all() : [];
  const order: MealSlot[] = ['breakfast', 'lunch', 'snack', 'dinner'];
  const meals = rows
    .map((r) => {
      const food = foodRows.find((f) => f.id === r.foodId);
      return { date: r.date, slot: r.slot, foodId: r.foodId, name: food?.name ?? r.foodId, grams: r.grams, macros: food ? scale(per100(food), r.grams) : ZERO_MACROS };
    })
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : order.indexOf(a.slot) - order.indexOf(b.slot)));

  // Same dish as yesterday in the same slot means it was cooked once and eaten twice.
  return meals.map((m) => ({
    ...m,
    leftover: meals.some((other) => other.slot === m.slot && other.foodId === m.foodId && other.date === addDays(m.date, -1)),
  }));
}

export function plannedMealsOn(date: DateKey): PlannedMeal[] {
  const weekStart = startOfWeek(date);
  ensureMealPlan(weekStart);
  return plannedMealsFor(weekStart).filter((m) => m.date === date);
}

export function swapOptionsFor(meal: PlannedMeal) {
  return swapCandidates(meal, allDishes(), preferences());
}

export function swapMeal(date: DateKey, slot: MealSlot, foodId: string, grams: number): void {
  db.update(mealPlanItems).set({ foodId, grams, pinned: true }).where(and(eq(mealPlanItems.date, date), eq(mealPlanItems.slot, slot))).run();
}

export function groceryFor(weekStart: DateKey): GroceryLine[] {
  const meals = plannedMealsFor(weekStart);
  const dishes = allDishes();
  const grocery: Record<string, { item: string; qty: number; unit: string }[]> = {};
  for (const f of db.select().from(foods).where(eq(foods.isDish, true)).all()) grocery[f.id] = f.grocery;
  return groceryList(meals, dishes, grocery);
}

/** Logs a planned meal as eaten, at its planned portion. */
export function logPlannedMeal(meal: PlannedMeal): void {
  const food = getFood(meal.foodId);
  if (!food) return;
  const serving = servingsFor(food.id)[0];
  logFood({ date: meal.date, slot: meal.slot, food, servingLabel: serving ? `${serving.label} (planned portion)` : 'planned portion', quantity: 1, grams: meal.grams });
}

export { weekDates };
