import { addDays } from './dates';
import { dayIndex, inRange, RANGE_DAYS, stepsSeries, weeklyAverages } from './trends';

const TODAY = '2026-09-11'; // a Friday

describe('inRange', () => {
  it('keeps the range, drops older and future values, and sorts oldest first', () => {
    const values = [
      { date: addDays(TODAY, -2), value: 2 },
      { date: addDays(TODAY, -40), value: 40 },
      { date: addDays(TODAY, -29), value: 29 },
      { date: addDays(TODAY, 3), value: 99 },
    ];
    expect(inRange(values, TODAY, '1M').map((v) => v.value)).toEqual([29, 2]);
    expect(inRange(values, TODAY, '3M').map((v) => v.value)).toEqual([40, 29, 2]);
  });

  it('has ranges that grow', () => {
    expect(RANGE_DAYS['1M']).toBeLessThan(RANGE_DAYS['3M']);
    expect(RANGE_DAYS['3M']).toBeLessThan(RANGE_DAYS['6M']);
  });
});

describe('weeklyAverages', () => {
  it('buckets into Monday-start weeks dated by the Monday', () => {
    const out = weeklyAverages([
      { date: '2026-09-07', value: 8000 }, // Monday
      { date: '2026-09-09', value: 10000 }, // Wednesday, same week
      { date: '2026-09-14', value: 6000 }, // next Monday
    ]);
    expect(out).toEqual([
      { date: '2026-09-07', value: 9000 },
      { date: '2026-09-14', value: 6000 },
    ]);
  });

  it('averages only the days that have a value', () => {
    const out = weeklyAverages([
      { date: '2026-09-07', value: 12000 },
      { date: '2026-09-08', value: 8000 },
    ]);
    expect(out[0].value).toBe(10000);
  });

  it('copes with nothing', () => {
    expect(weeklyAverages([])).toEqual([]);
  });
});

describe('stepsSeries', () => {
  const daily = Array.from({ length: 180 }, (_, i) => ({ date: addDays(TODAY, -i), value: 5000 + i }));

  it('stays daily for a month', () => {
    expect(stepsSeries(daily, TODAY, '1M')).toHaveLength(31);
  });

  it('switches to weekly beyond a month so the line stays readable', () => {
    const threeMonths = stepsSeries(daily, TODAY, '3M');
    expect(threeMonths.length).toBeGreaterThanOrEqual(13);
    expect(threeMonths.length).toBeLessThanOrEqual(15);
  });
});

describe('dayIndex', () => {
  it('counts whole days from the anchor', () => {
    expect(dayIndex('2026-09-01', '2026-09-11')).toBe(10);
    expect(dayIndex('2026-09-11', '2026-09-11')).toBe(0);
  });
});
