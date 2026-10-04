import { addDays, daysBetween, formatTimeOfDay, formatTimeOfDay12h, fromDateKey, nextWeekday, parseTimeOfDay, startOfLocalDay, startOfWeek, toDateKey, weekDates, weekdayOf } from './dates';

describe('date keys', () => {
  it('uses the local calendar day', () => {
    expect(toDateKey(new Date(2026, 8, 10, 23, 59))).toBe('2026-09-10');
    expect(toDateKey(fromDateKey('2026-01-05'))).toBe('2026-01-05');
  });

  it('adds days across month and year ends', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('is unaffected by daylight-saving changes', () => {
    // US DST 2026 starts Mar 8 and ends Nov 1 (tests run with TZ=America/New_York).
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
    expect(addDays('2026-10-31', 2)).toBe('2026-11-02');
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2);
    expect(daysBetween('2026-11-02', '2026-10-31')).toBe(-2);
  });
});

describe('weeks', () => {
  it('knows the weekday', () => {
    expect(weekdayOf('2026-09-10')).toBe('thu');
    expect(weekdayOf('2026-09-13')).toBe('sun');
  });

  it('starts weeks on Monday', () => {
    expect(startOfWeek('2026-09-07')).toBe('2026-09-07');
    expect(startOfWeek('2026-09-10')).toBe('2026-09-07');
    expect(startOfWeek('2026-09-13')).toBe('2026-09-07');
  });

  it('lists the seven days of a week', () => {
    const days = weekDates('2026-09-07');
    expect(days).toHaveLength(7);
    expect(days[0]).toBe('2026-09-07');
    expect(days[6]).toBe('2026-09-13');
  });

  it('wraps Sunday to Monday', () => {
    expect(nextWeekday('sun')).toBe('mon');
    expect(nextWeekday('fri')).toBe('sat');
  });
});

describe('time of day', () => {
  it('parses HH:MM', () => {
    expect(parseTimeOfDay('06:30')).toBe(390);
    expect(parseTimeOfDay('6:30')).toBe(390);
    expect(parseTimeOfDay('24:00')).toBeNull();
    expect(parseTimeOfDay('12:60')).toBeNull();
    expect(parseTimeOfDay('abc')).toBeNull();
  });

  it('formats 24h and 12h', () => {
    expect(formatTimeOfDay(390)).toBe('06:30');
    expect(formatTimeOfDay(1440 + 15)).toBe('00:15');
    expect(formatTimeOfDay12h(390)).toBe('6:30 AM');
    expect(formatTimeOfDay12h(0)).toBe('12:00 AM');
    expect(formatTimeOfDay12h(12 * 60 + 5)).toBe('12:05 PM');
    expect(formatTimeOfDay12h(18 * 60)).toBe('6:00 PM');
  });
});

describe('startOfLocalDay', () => {
  it('winds back to local midnight', () => {
    const afternoon = new Date(2026, 8, 11, 18, 45, 30, 250).getTime();
    expect(startOfLocalDay(afternoon)).toBe(new Date(2026, 8, 11, 0, 0, 0, 0).getTime());
  });

  it('leaves midnight alone', () => {
    const midnight = new Date(2026, 8, 11, 0, 0, 0, 0).getTime();
    expect(startOfLocalDay(midnight)).toBe(midnight);
  });

  it('stays on the same calendar day', () => {
    for (const hour of [0, 1, 12, 23]) {
      const ms = new Date(2026, 8, 11, hour, 30).getTime();
      expect(toDateKey(new Date(startOfLocalDay(ms)))).toBe('2026-09-11');
    }
  });
});
