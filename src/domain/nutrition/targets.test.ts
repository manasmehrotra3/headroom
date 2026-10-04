import { computeTargets, mifflinStJeor, recalcAdjustment, targetsForDay } from './targets';

const me = { sex: 'male' as const, age: 32, heightCm: 178, weightKg: 84, goalWeightKg: 76, dailyActivity: 'sedentary' as const };

describe('targets', () => {
  it('computes Mifflin-St Jeor', () => {
    expect(mifflinStJeor(me)).toBeCloseTo(10 * 84 + 6.25 * 178 - 5 * 32 + 5, 5); // 1797.5
    expect(mifflinStJeor({ ...me, sex: 'female' })).toBeCloseTo(1797.5 - 166, 5);
  });

  it('applies a capped deficit and protein priority', () => {
    const t = computeTargets(me);
    expect(t.bmr).toBe(1798);
    expect(t.tdee).toBe(Math.round(1797.5 * 1.35));
    expect(t.deficitKcal).toBe(500); // 84 × 0.006 × 7700 / 7 = 554 → capped
    expect(t.kcal).toBe(t.tdee - 500);
    expect(t.proteinG).toBe(151);
    expect(t.fatG).toBe(67);
    expect(t.carbsG).toBe(Math.round((t.kcal - 151 * 4 - 67 * 9) / 4));
  });

  it('never goes below BMR', () => {
    const t = computeTargets({ ...me, weightKg: 60, goalWeightKg: 55, heightCm: 160, age: 60 }, -400);
    expect(t.kcal).toBe(t.bmr);
    expect(t.reason).toContain('floor');
  });

  it('uses maintenance at goal weight', () => {
    const t = computeTargets({ ...me, weightKg: 76 });
    expect(t.deficitKcal).toBe(0);
    expect(t.reason).toContain('maintenance');
  });

  it('shifts carbs by day type', () => {
    const base = computeTargets(me);
    const training = targetsForDay(base, 'training');
    const rest = targetsForDay(base, 'rest');
    expect(training.carbsG).toBe(Math.round(base.carbsG * 1.15));
    expect(rest.carbsG).toBe(Math.round(base.carbsG * 0.85));
    expect(training.proteinG).toBe(base.proteinG);
    expect(training.kcal - base.kcal).toBe((training.carbsG - base.carbsG) * 4);
  });

  it('nudges calories from the weight trend', () => {
    // 84 → 83.2 in 14 days: 0.48%/week → too slow → −100
    expect(recalcAdjustment(84, 83.2, 14, 0).adjustKcal).toBe(-100);
    // 84 → 82.3 in 14 days: 1.0%/week → too fast → +100
    expect(recalcAdjustment(84, 82.3, 14, 0).adjustKcal).toBe(100);
    // 84 → 83.0 in 14 days: 0.6%/week → on target
    expect(recalcAdjustment(84, 83.0, 14, -100).adjustKcal).toBe(-100);
    expect(recalcAdjustment(84, 83, 3, 0).reason).toContain('Not enough');
  });
});
