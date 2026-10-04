import { addDays } from './dates';
import { changeLabel, trendArrow, vo2RaceContext, vo2Series, vo2Summary, vo2VsVdotNote } from './vo2';

const TODAY = '2026-09-11';
const at = (daysAgo: number, vo2Max: number) => ({ date: addDays(TODAY, -daysAgo), vo2Max });

describe('vo2Series', () => {
  it('keeps readings inside the window, oldest first', () => {
    const series = vo2Series([at(120, 40), at(60, 44), at(5, 46)], TODAY, 90);
    expect(series.map((p) => p.vo2Max)).toEqual([44, 46]);
  });

  it('takes the last reading of a day and ignores the future', () => {
    const series = vo2Series([{ date: addDays(TODAY, -1), vo2Max: 45 }, { date: addDays(TODAY, -1), vo2Max: 46 }, { date: addDays(TODAY, 3), vo2Max: 99 }], TODAY);
    expect(series).toEqual([{ date: addDays(TODAY, -1), vo2Max: 46 }]);
  });
});

describe('vo2Summary', () => {
  it('measures the change across the window and calls it improving', () => {
    const summary = vo2Summary([at(80, 44), at(40, 45.2), at(2, 46.4)], TODAY);
    expect(summary.latest?.vo2Max).toBe(46.4);
    expect(summary.from?.vo2Max).toBe(44);
    expect(summary.change).toBe(2.4);
    expect(summary.trend).toBe('rising');
    expect(summary.best?.vo2Max).toBe(46.4);
  });

  it('calls a small wobble steady, because the watch estimate is noisy', () => {
    expect(vo2Summary([at(60, 46), at(1, 46.3)], TODAY).trend).toBe('steady');
    expect(vo2Summary([at(60, 46), at(1, 45.1)], TODAY).trend).toBe('falling');
  });

  it('reports a single reading without inventing a trend', () => {
    const summary = vo2Summary([at(3, 47)], TODAY);
    expect(summary.latest?.vo2Max).toBe(47);
    expect(summary.change).toBeNull();
    expect(summary.trend).toBe('unknown');
    expect(trendArrow(summary.trend)).toBe('');
  });

  it('copes with no readings at all', () => {
    const summary = vo2Summary([], TODAY);
    expect(summary.latest).toBeNull();
    expect(summary.best).toBeNull();
    expect(summary.change).toBeNull();
  });
});

describe('notes', () => {
  it('compares the watch with VDOT and explains the difference', () => {
    expect(vo2VsVdotNote(48.2, 44)).toContain('gap of a few points is normal');
    expect(vo2VsVdotNote(45, 44)).toContain('agree closely');
    expect(vo2VsVdotNote(58, 44)).toContain('wide gap');
    expect(vo2VsVdotNote(null, 44)).toContain('No VO2 max from the watch');
    expect(vo2VsVdotNote(48, null)).toContain('Add a recent 5K time');
    expect(vo2VsVdotNote(null, null)).toBeNull();
  });

  it('gives rough context without pretending to be a norms table', () => {
    expect(vo2RaceContext(60)).toContain('training time');
    expect(vo2RaceContext(48)).toContain('age-group');
    expect(vo2RaceContext(40)).toContain('long races');
    expect(vo2RaceContext(30)).toContain('Early days');
    expect(vo2RaceContext(null)).toBeNull();
  });
});

describe('changeLabel', () => {
  it('measures the span between the readings, not the whole window', () => {
    expect(changeLabel(vo2Summary([at(77, 44), at(0, 46)], TODAY))).toBe('▲ +2.0 over 11 weeks');
    expect(changeLabel(vo2Summary([at(9, 46), at(0, 44.2)], TODAY))).toBe('▼ -1.8 over 9 days');
    expect(changeLabel(vo2Summary([at(1, 46), at(0, 46.8)], TODAY))).toBe('▲ +0.8 over 1 day');
    expect(changeLabel(vo2Summary([at(3, 47)], TODAY))).toBeNull();
  });
});
