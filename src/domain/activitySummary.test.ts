import { activityDetailLine, doneSummary, rpeLabel } from './activitySummary';

describe('activityDetailLine', () => {
  it('reads time, distance then heart rate', () => {
    expect(activityDetailLine({ time: '7:12 AM', distanceM: 5472, avgHr: 148 })).toBe('7:12 AM · 3.40 mi · avg HR 148');
  });

  it('leaves out what the watch did not record', () => {
    expect(activityDetailLine({ time: '6:05 PM', distanceM: null, avgHr: 121 })).toBe('6:05 PM · avg HR 121');
    expect(activityDetailLine({ time: '6:05 PM', distanceM: null, avgHr: null })).toBe('6:05 PM');
  });

  it('treats a zero as missing, which is how a strength session arrives', () => {
    expect(activityDetailLine({ time: '8:00 AM', distanceM: 0, avgHr: 0 })).toBe('8:00 AM');
  });
});

describe('doneSummary', () => {
  it('counts the sessions and adds up the time', () => {
    expect(doneSummary([33 * 60 + 17, 44 * 60])).toBe('2 sessions · 1 h 17 min');
  });

  it('says session in the singular', () => {
    expect(doneSummary([1800])).toBe('1 session · 30 min');
  });

  it('drops the minutes when they come to a whole hour', () => {
    expect(doneSummary([3600])).toBe('1 session · 1 h');
  });
});

describe('rpeLabel', () => {
  it('marks an estimate so a real rating is never confused with a guess', () => {
    expect(rpeLabel(7, false)).toBe('RPE 7');
    expect(rpeLabel(6.6, true)).toBe('RPE 7*');
    expect(rpeLabel(null, false)).toBeUndefined();
  });
});
