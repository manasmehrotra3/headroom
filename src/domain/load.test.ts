import { addDays } from './dates';
import { dailyLoads, estimateMaxHr, estimateRpeFromHr, loadSummary, sessionRpeLoad, trimp } from './load';

describe('session load', () => {
  it('multiplies RPE by minutes', () => {
    expect(sessionRpeLoad(7, 45 * 60)).toBe(315);
  });

  it('estimates RPE from heart-rate reserve', () => {
    expect(estimateRpeFromHr(120, 55, 190)).toBe(3); // 48% HRR
    expect(estimateRpeFromHr(130, 55, 190)).toBe(4); // 56%
    expect(estimateRpeFromHr(165, 55, 190)).toBe(7); // 81%
    expect(estimateRpeFromHr(190, 55, 190)).toBe(9);
    expect(estimateRpeFromHr(null, 55, 190)).toBeNull();
    expect(estimateRpeFromHr(120, null, 190)).toBeNull();
  });

  it('computes Banister TRIMP', () => {
    // 30 min at HRr 0.5, male: 30 × 0.5 × 0.64 × e^0.96 ≈ 25.07
    expect(trimp(30 * 60, 122.5, 55, 190, 'male')).toBeCloseTo(25.07, 1);
    expect(trimp(30 * 60, 122.5, 55, 190, 'female')).toBeCloseTo(30 * 0.5 * 0.86 * Math.exp(0.835), 2);
    expect(trimp(1800, 150, 190, 190, 'male')).toBeNull();
  });

  it('estimates max HR with Tanaka', () => {
    expect(estimateMaxHr(30)).toBe(187);
  });
});

describe('loadSummary', () => {
  const today = '2026-09-10';
  // 28 days of a steady 50 load per day.
  const steady = Array.from({ length: 28 }, (_, i) => ({ date: addDays(today, -i), load: 50 }));

  it('reports insufficient data before 21 days of history', () => {
    const s = loadSummary(steady.slice(0, 10), today, addDays(today, -9));
    expect(s.label).toBe('insufficient');
    expect(s.acwr).toBeNull();
    expect(s.historyDays).toBe(10);
  });

  it('is 1.0 with a steady load', () => {
    const s = loadSummary(steady, today, addDays(today, -27));
    expect(s.acute).toBe(350);
    expect(s.chronic).toBe(350);
    expect(s.acwr).toBeCloseTo(1, 5);
    expect(s.label).toBe('sweet_spot');
  });

  it('flags a spike', () => {
    const spiked = steady.map((d, i) => (i < 7 ? { ...d, load: 100 } : d));
    const s = loadSummary(spiked, today, addDays(today, -27));
    // acute 700, chronic (700 + 21×50)/4 = 437.5 → 1.6
    expect(s.acwr).toBeCloseTo(1.6, 5);
    expect(s.label).toBe('high');
  });

  it('flags a lull and ignores future days', () => {
    const lull = steady.map((d, i) => (i < 7 ? { ...d, load: 10 } : d));
    const withFuture = [...lull, { date: addDays(today, 1), load: 1000 }];
    const s = loadSummary(withFuture, today, addDays(today, -27));
    expect(s.label).toBe('low');
  });
});

describe('dailyLoads', () => {
  it('sums activities per day and skips duplicates', () => {
    const loads = dailyLoads([
      { date: '2026-09-02', srpeLoad: 100 },
      { date: '2026-09-01', srpeLoad: 200 },
      { date: '2026-09-02', srpeLoad: 50, duplicateOf: 1 },
      { date: '2026-09-02', srpeLoad: 25 },
    ]);
    expect(loads).toEqual([
      { date: '2026-09-01', load: 200 },
      { date: '2026-09-02', load: 125 },
    ]);
  });
});
