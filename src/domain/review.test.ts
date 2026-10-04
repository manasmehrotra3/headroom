import { adherence, paceAtSimilarHr, strengthPrs, typicalRunHr } from './review';

describe('strengthPrs', () => {
  const sets = [
    { exerciseId: 'leg_press', date: '2026-08-20', weightKg: 80, reps: 10 },
    { exerciseId: 'leg_press', date: '2026-09-08', weightKg: 85, reps: 10 },
    { exerciseId: 'leg_press', date: '2026-09-10', weightKg: 85, reps: 12 },
    { exerciseId: 'curl', date: '2026-09-09', weightKg: 10, reps: 12 },
    { exerciseId: 'row', date: '2026-08-01', weightKg: 40, reps: 10 },
    { exerciseId: 'row', date: '2026-09-09', weightKg: 35, reps: 10 },
  ];

  it('finds the best new e1RM per exercise in the week', () => {
    const prs = strengthPrs(sets, '2026-09-07', '2026-09-13');
    const legPress = prs.find((p) => p.exerciseId === 'leg_press')!;
    expect(legPress.reps).toBe(12);
    expect(legPress.previousE1rmKg).toBeCloseTo(80 * (1 + 10 / 30), 5);
    expect(prs.find((p) => p.exerciseId === 'curl')!.previousE1rmKg).toBeNull();
    expect(prs.find((p) => p.exerciseId === 'row')).toBeUndefined();
  });
});

describe('pace at similar HR', () => {
  it('filters to a heart-rate band and reports the change', () => {
    const runs = [
      { date: '2026-08-01', paceSecPerMile: 600, avgHr: 150 },
      { date: '2026-08-08', paceSecPerMile: 595, avgHr: 152 },
      { date: '2026-08-15', paceSecPerMile: 560, avgHr: 170 },
      { date: '2026-08-22', paceSecPerMile: 585, avgHr: 149 },
      { date: '2026-08-29', paceSecPerMile: 580, avgHr: 151 },
    ];
    const result = paceAtSimilarHr(runs, 150);
    expect(result.points).toHaveLength(4);
    expect(result.changeSecPerMile).toBeLessThan(0);
    expect(typicalRunHr(runs)).toBe(151);
    expect(paceAtSimilarHr(runs.slice(0, 1), 150).changeSecPerMile).toBeNull();
  });
});

describe('adherence', () => {
  it('ignores rest days', () => {
    const a = adherence([
      { status: 'done', sessionType: 'strength_lower' },
      { status: 'skipped', sessionType: 'run_easy' },
      { status: 'planned', sessionType: 'tennis' },
      { status: 'done', sessionType: 'rest' },
    ]);
    expect(a).toEqual({ planned: 3, done: 1, skipped: 1, rate: 1 / 3 });
  });
});
