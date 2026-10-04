import { greetingFor, initialOf } from './greeting';

describe('greetingFor', () => {
  it('switches at the edges of each part of the day', () => {
    expect(greetingFor(5).text).toBe('Good morning');
    expect(greetingFor(11).text).toBe('Good morning');
    expect(greetingFor(12).text).toBe('Good afternoon');
    expect(greetingFor(16).text).toBe('Good afternoon');
    expect(greetingFor(17).text).toBe('Good evening');
    expect(greetingFor(21).text).toBe('Good evening');
  });

  it('does not wish you good morning at 2am', () => {
    expect(greetingFor(22).text).toBe('Late one');
    expect(greetingFor(2).text).toBe('Late one');
    expect(greetingFor(4).icon).toBe('moon');
  });

  it('shows the sun in daylight and the moon after dark', () => {
    expect(greetingFor(9).icon).toBe('sun');
    expect(greetingFor(14).icon).toBe('sun');
    expect(greetingFor(19).icon).toBe('moon');
  });
});

describe('initialOf', () => {
  it('uses the first letter, capitalised, ignoring stray spaces', () => {
    expect(initialOf('alex')).toBe('A');
    expect(initialOf('  Priya ')).toBe('P');
  });

  it('returns null when there is no name', () => {
    expect(initialOf('')).toBeNull();
    expect(initialOf('   ')).toBeNull();
  });
});
