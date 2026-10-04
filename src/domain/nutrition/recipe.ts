import { addMacros, scale, ZERO_MACROS, type Macros } from './types';

export interface Ingredient {
  per100: Macros;
  grams: number;
}

/** Whole-recipe totals and per-100 g values; the per-100 g form lets a recipe be logged like any food. */
export function recipeMacros(ingredients: Ingredient[], servings: number): { total: Macros; perServing: Macros; per100: Macros; servingGrams: number } {
  const total = ingredients.reduce((sum, i) => addMacros(sum, scale(i.per100, i.grams)), ZERO_MACROS);
  const totalGrams = ingredients.reduce((sum, i) => sum + i.grams, 0);
  const s = Math.max(1, servings);
  const perServing = scale(total, 100 / s) as Macros; // total/servings
  const per100 = totalGrams > 0 ? scale(total, 10000 / totalGrams) : ZERO_MACROS; // total per 100 g of cooked weight
  return {
    total,
    perServing: { kcal: total.kcal / s, proteinG: total.proteinG / s, carbsG: total.carbsG / s, fatG: total.fatG / s, fiberG: total.fiberG / s },
    per100: totalGrams > 0 ? { kcal: (total.kcal / totalGrams) * 100, proteinG: (total.proteinG / totalGrams) * 100, carbsG: (total.carbsG / totalGrams) * 100, fatG: (total.fatG / totalGrams) * 100, fiberG: (total.fiberG / totalGrams) * 100 } : per100,
    servingGrams: totalGrams / s,
  };
}
