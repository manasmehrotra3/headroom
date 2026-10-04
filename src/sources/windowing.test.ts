import { addHrSample, averageHr, chunks, covering, longestSpanMs, sumWithoutOverlap, type Span } from './windowing';

const DAY = 86400000;
const span = (startMs: number, endMs: number): Span => ({ startMs, endMs });

describe('chunks', () => {
  it('splits a window into pieces of at most the chunk size, oldest first', () => {
    const out = chunks(0, 75 * DAY, 30);
    expect(out).toEqual([span(0, 30 * DAY), span(30 * DAY, 60 * DAY), span(60 * DAY, 75 * DAY)]);
  });

  it('covers the window exactly, with no gaps or overlaps', () => {
    const out = chunks(1000, 1000 + 100 * DAY, 30);
    expect(out[0].startMs).toBe(1000);
    expect(out.at(-1)!.endMs).toBe(1000 + 100 * DAY);
    for (let i = 1; i < out.length; i++) expect(out[i].startMs).toBe(out[i - 1].endMs);
  });

  it('returns one chunk when the window is shorter than the chunk', () => {
    expect(chunks(0, DAY, 30)).toEqual([span(0, DAY)]);
  });

  it('returns nothing for an empty or backwards window', () => {
    expect(chunks(500, 500, 30)).toEqual([]);
    expect(chunks(900, 500, 30)).toEqual([]);
  });

  it('refuses a non-positive chunk size rather than looping forever', () => {
    expect(() => chunks(0, DAY, 0)).toThrow('chunkDays must be positive');
  });
});

describe('covering', () => {
  // Three sessions, sorted by start, none overlapping: 10-20, 40-50, 100-130.
  const sessions = [span(10, 20), span(40, 50), span(100, 130)];
  const longest = longestSpanMs(sessions);

  it('finds the session a timestamp falls inside', () => {
    expect(covering(sessions, 15, longest)).toEqual([span(10, 20)]);
    expect(covering(sessions, 45, longest)).toEqual([span(40, 50)]);
    expect(covering(sessions, 120, longest)).toEqual([span(100, 130)]);
  });

  it('includes both boundaries', () => {
    expect(covering(sessions, 10, longest)).toEqual([span(10, 20)]);
    expect(covering(sessions, 20, longest)).toEqual([span(10, 20)]);
  });

  it('returns nothing in the gaps, before the first and after the last', () => {
    expect(covering(sessions, 30, longest)).toEqual([]);
    expect(covering(sessions, 5, longest)).toEqual([]);
    expect(covering(sessions, 200, longest)).toEqual([]);
  });

  it('returns every session when they overlap, not just the latest', () => {
    const overlapping = [span(0, 100), span(50, 60)];
    const matches = covering(overlapping, 55, longestSpanMs(overlapping));
    expect(matches).toHaveLength(2);
    expect(matches).toEqual(expect.arrayContaining([span(0, 100), span(50, 60)]));
  });

  it('copes with an empty list', () => {
    expect(covering([], 10, 0)).toEqual([]);
  });

  it('agrees with a brute-force scan over a long random set', () => {
    // The binary search is the part that would silently corrupt every average heart rate, so
    // check it against the obvious slow implementation.
    let seed = 7;
    const random = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    const many = Array.from({ length: 300 }, (_, i) => {
      const start = i * 1000 + Math.floor(random() * 500);
      return span(start, start + Math.floor(random() * 900));
    }).sort((a, b) => a.startMs - b.startMs);
    const longestMany = longestSpanMs(many);

    for (let t = 0; t < 300000; t += 137) {
      const fast = covering(many, t, longestMany).sort((a, b) => a.startMs - b.startMs);
      const slow = many.filter((s) => t >= s.startMs && t <= s.endMs);
      expect(fast).toEqual(slow);
    }
  });
});

describe('heart-rate totals', () => {
  it('averages and maxes without keeping the samples', () => {
    const totals = { sum: 0, count: 0, max: null as number | null };
    for (const bpm of [120, 150, 130]) addHrSample(totals, bpm);
    expect(averageHr(totals)).toBe(133);
    expect(totals.max).toBe(150);
  });

  it('reports no average when nothing was recorded', () => {
    expect(averageHr({ sum: 0, count: 0, max: null })).toBeNull();
  });
});

describe('sumWithoutOverlap', () => {
  const rec = (startMs: number, endMs: number, value: number) => ({ startMs, endMs, value });

  it('adds up records that do not overlap', () => {
    expect(sumWithoutOverlap([rec(0, 10, 100), rec(20, 30, 50)])).toBe(150);
  });

  it('counts a repeated stretch once, which is the whole point', () => {
    expect(sumWithoutOverlap([rec(0, 600, 900), rec(0, 600, 900)])).toBe(900);
  });

  it('skips a record that overlaps one already counted', () => {
    // The watch re-sent 5-15 after 0-10 was already stored.
    expect(sumWithoutOverlap([rec(0, 10, 100), rec(5, 15, 80)])).toBe(100);
  });

  it('skips a record swallowed by a longer one', () => {
    expect(sumWithoutOverlap([rec(0, 100, 500), rec(20, 40, 200)])).toBe(500);
  });

  it('keeps records that only touch end to end', () => {
    expect(sumWithoutOverlap([rec(0, 10, 10), rec(10, 20, 20), rec(20, 30, 30)])).toBe(60);
  });

  it('prefers the longer record when two start together', () => {
    expect(sumWithoutOverlap([rec(0, 10, 10), rec(0, 60, 60)])).toBe(60);
  });

  it('is zero for nothing', () => {
    expect(sumWithoutOverlap([])).toBe(0);
  });
});
