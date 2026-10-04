import { mean, median, readiness } from './readiness';

describe('readiness', () => {
  it('is 100 when everything is at its best', () => {
    const r = readiness({ sleepScore: 100, restingHr: 52, restingHrBaseline: 54, hrvRmssd: 60, hrvBaseline: 55, checkin: { energy: 3, soreness: 1 } });
    expect(r.score).toBe(100);
    expect(r.band).toBe('good');
  });

  it('drops missing signals and re-weights', () => {
    const r = readiness({ sleepScore: 80, restingHr: null, restingHrBaseline: null, hrvRmssd: null, hrvBaseline: null, checkin: null });
    expect(r.score).toBe(80);
    expect(r.components.restingHr).toBeNull();
  });

  it('penalises an elevated resting heart rate', () => {
    const r = readiness({ sleepScore: null, restingHr: 62, restingHrBaseline: 54, hrvRmssd: null, hrvBaseline: null, checkin: null });
    expect(r.components.restingHr!.points).toBe(0);
    const half = readiness({ sleepScore: null, restingHr: 58, restingHrBaseline: 54, hrvRmssd: null, hrvBaseline: null, checkin: null });
    expect(half.components.restingHr!.points).toBe(13);
  });

  it('penalises a suppressed HRV', () => {
    const r = readiness({ sleepScore: null, restingHr: null, restingHrBaseline: null, hrvRmssd: 35, hrvBaseline: 50, checkin: null });
    expect(r.components.hrv!.points).toBe(0);
  });

  it('bands the score', () => {
    expect(readiness({ sleepScore: 60, restingHr: null, restingHrBaseline: null, hrvRmssd: null, hrvBaseline: null, checkin: { energy: 2, soreness: 2 } }).band).toBe('moderate');
    expect(readiness({ sleepScore: 30, restingHr: null, restingHrBaseline: null, hrvRmssd: null, hrvBaseline: null, checkin: { energy: 1, soreness: 3 } }).band).toBe('low');
    expect(readiness({ sleepScore: null, restingHr: null, restingHrBaseline: null, hrvRmssd: null, hrvBaseline: null, checkin: null }).band).toBe('unknown');
  });

  it('has median and mean helpers', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBeNull();
    expect(mean([1, 2, 3])).toBe(2);
  });
});
