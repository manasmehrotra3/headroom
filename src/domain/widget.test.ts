import { addDays } from './dates';
import { widgetSnapshot } from './widget';

const TODAY = '2026-09-11';
const NOW = Date.UTC(2026, 8, 11, 13, 0);

describe('widgetSnapshot', () => {
  it('carries steps, goal and the VO2 max trend the app shows', () => {
    const snap = widgetSnapshot({
      today: TODAY,
      stepsToday: 9684,
      stepGoal: 8000,
      vo2Points: [
        { date: addDays(TODAY, -40), vo2Max: 44.5 },
        { date: TODAY, vo2Max: 45.3 },
      ],
      now: NOW,
    });
    expect(snap).toEqual({ steps: 9684, stepGoal: 8000, vo2: 45.3, vo2Change: 0.8, vo2Trend: 'rising', updatedAt: NOW });
  });

  it('survives JSON exactly, decimals included, because that is how it reaches the widget', () => {
    const snap = widgetSnapshot({ today: TODAY, stepsToday: 5000, stepGoal: 8000, vo2Points: [{ date: TODAY, vo2Max: 47.26 }], now: NOW });
    expect(JSON.parse(JSON.stringify(snap))).toEqual(snap);
    expect(snap.vo2).toBe(47.3);
  });

  it('rounds steps to a whole number and never sends a zero goal', () => {
    const snap = widgetSnapshot({ today: TODAY, stepsToday: 1234.6, stepGoal: 0, vo2Points: [], now: NOW });
    expect(snap.steps).toBe(1235);
    expect(snap.stepGoal).toBe(1);
  });

  it('says plainly when there is nothing yet', () => {
    const snap = widgetSnapshot({ today: TODAY, stepsToday: null, stepGoal: 8000, vo2Points: [], now: NOW });
    expect(snap.steps).toBeNull();
    expect(snap.vo2).toBeNull();
    expect(snap.vo2Change).toBeNull();
    expect(snap.vo2Trend).toBe('unknown');
  });
});
