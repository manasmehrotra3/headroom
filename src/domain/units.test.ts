import {
  cmToFeetInches,
  feetInchesToCm,
  formatDuration,
  formatPace,
  kgToLb,
  lbToKg,
  milesToMeters,
  paceSecPerMile,
  parseDuration,
  roundTo,
} from './units';

describe('conversions', () => {
  it('converts weight', () => {
    expect(lbToKg(100)).toBeCloseTo(45.359, 3);
    expect(kgToLb(lbToKg(185))).toBeCloseTo(185, 9);
  });

  it('converts distance', () => {
    expect(milesToMeters(3.10686)).toBeCloseTo(5000, 0);
  });

  it('converts height both ways', () => {
    expect(feetInchesToCm(5, 10)).toBeCloseTo(177.8, 1);
    expect(cmToFeetInches(177.8)).toEqual({ feet: 5, inches: 10 });
    expect(cmToFeetInches(182.88)).toEqual({ feet: 6, inches: 0 });
  });

  it('rounds to a step without float noise', () => {
    expect(roundTo(12.3, 2.5)).toBe(12.5);
    expect(roundTo(47, 5)).toBe(45);
    expect(roundTo(0.1 + 0.2, 0.1)).toBe(0.3);
  });
});

describe('durations and pace', () => {
  it('formats durations', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(1500)).toBe('25:00');
    expect(formatDuration(3723)).toBe('1:02:03');
  });

  it('parses durations', () => {
    expect(parseDuration('25:00')).toBe(1500);
    expect(parseDuration(' 1:02:03 ')).toBe(3723);
    expect(parseDuration('24:5')).toBeNull();
    expect(parseDuration('0:75')).toBeNull();
    expect(parseDuration('25')).toBeNull();
    expect(parseDuration('')).toBeNull();
  });

  it('computes pace per mile', () => {
    const pace = paceSecPerMile(5000, 25 * 60);
    expect(pace).toBeCloseTo(482.8, 1);
    expect(formatPace(pace)).toBe('8:03 /mi');
  });
});
