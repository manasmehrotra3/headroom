import { weightTrend } from './weightTrend';

describe('weightTrend', () => {
  it('returns nothing for no weigh-ins', () => {
    expect(weightTrend([])).toEqual([]);
  });

  it('averages the trailing window of calendar days', () => {
    const trend = weightTrend(
      [
        { date: '2026-09-01', weightKg: 80 },
        { date: '2026-09-02', weightKg: 81 },
        { date: '2026-09-04', weightKg: 79 },
      ],
      3,
    );
    expect(trend.map((p) => p.averageKg)).toEqual([80, 80.5, 80]);
    // Sep 4 window is Sep 2..4, so Sep 1 is excluded.
  });

  it('does not reach back past the window after a gap', () => {
    const trend = weightTrend([
      { date: '2026-09-01', weightKg: 90 },
      { date: '2026-09-20', weightKg: 80 },
    ]);
    expect(trend[1].averageKg).toBe(80);
  });

  it('uses the last weigh-in when a day has two', () => {
    const trend = weightTrend([
      { date: '2026-09-01', weightKg: 81 },
      { date: '2026-09-01', weightKg: 80 },
    ]);
    expect(trend).toEqual([{ date: '2026-09-01', weightKg: 80, averageKg: 80 }]);
  });

  it('sorts input by date', () => {
    const trend = weightTrend([
      { date: '2026-09-03', weightKg: 79 },
      { date: '2026-09-01', weightKg: 81 },
    ]);
    expect(trend.map((p) => p.date)).toEqual(['2026-09-01', '2026-09-03']);
    expect(trend[1].averageKg).toBe(80);
  });
});
