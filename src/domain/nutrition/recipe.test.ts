import { recipeMacros } from './recipe';

describe('recipeMacros', () => {
  it('sums ingredients and divides by servings', () => {
    const paneer = { kcal: 265, proteinG: 18.3, carbsG: 1.2, fatG: 20.8, fiberG: 0 };
    const oil = { kcal: 900, proteinG: 0, carbsG: 0, fatG: 100, fiberG: 0 };
    const r = recipeMacros([{ per100: paneer, grams: 200 }, { per100: oil, grams: 10 }], 2);
    expect(r.total.kcal).toBeCloseTo(530 + 90, 5);
    expect(r.perServing.proteinG).toBeCloseTo(18.3, 5);
    expect(r.servingGrams).toBe(105);
    expect(r.per100.kcal).toBeCloseTo(620 / 210 * 100, 5);
  });

  it('handles an empty recipe', () => {
    const r = recipeMacros([], 1);
    expect(r.total.kcal).toBe(0);
    expect(r.per100.kcal).toBe(0);
  });
});
