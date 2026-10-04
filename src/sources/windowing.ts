/**
 * Plumbing for reading a long stretch of Health Connect without holding it all in memory.
 *
 * Pure functions with no React or native imports, so they can be unit tested. Garmin writes
 * near-continuous heart rate, so a year's worth is millions of samples: these let the sync read
 * a month at a time and attribute each sample to its session as it goes.
 */

export interface Span {
  startMs: number;
  endMs: number;
}

/** Splits a window into pieces of at most `chunkDays`, oldest first. */
export function chunks(fromMs: number, toMs: number, chunkDays: number): Span[] {
  if (chunkDays <= 0) throw new Error('chunkDays must be positive');
  const size = chunkDays * 86400000;
  const out: Span[] = [];
  for (let start = fromMs; start < toMs; start += size) out.push({ startMs: start, endMs: Math.min(start + size, toMs) });
  return out;
}

/** The longest span in a list, used to bound the walk-back in `covering`. */
export function longestSpanMs(spans: readonly Span[]): number {
  return spans.reduce((max, s) => Math.max(max, s.endMs - s.startMs), 0);
}

/**
 * Every span whose window contains `ms`. `spans` must be sorted by `startMs`.
 *
 * A binary search finds the last span starting at or before `ms`, then it walks back to pick up
 * any overlapping ones. The walk stops as soon as a span started longer ago than `longestMs`,
 * because nothing earlier can still be running. Garmin sessions don't overlap in practice, so
 * the walk almost always stops after one step; the loop is there so overlap is handled correctly
 * rather than silently dropped.
 */
export function covering<T extends Span>(spans: readonly T[], ms: number, longestMs: number): T[] {
  let lo = 0;
  let hi = spans.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (spans[mid].startMs <= ms) lo = mid + 1;
    else hi = mid;
  }

  const matches: T[] = [];
  for (let i = lo - 1; i >= 0 && spans[i].startMs >= ms - longestMs; i--) {
    if (ms <= spans[i].endMs) matches.push(spans[i]);
  }
  return matches;
}

/** Running totals for one session, so only the summary survives each chunk. */
export interface HrTotals {
  sum: number;
  count: number;
  max: number | null;
}

export function addHrSample(totals: HrTotals, bpm: number): void {
  totals.sum += bpm;
  totals.count += 1;
  totals.max = totals.max === null ? bpm : Math.max(totals.max, bpm);
}

export function averageHr(totals: HrTotals): number | null {
  return totals.count > 0 ? Math.round(totals.sum / totals.count) : null;
}

export interface Measured extends Span {
  value: number;
}

/**
 * Adds up interval records while ignoring any that overlap one already counted.
 *
 * A phone's health store can hold the same stretch of time more than once, typically when a watch
 * re-sends a period it already sent. Adding every record up then counts those minutes twice, which
 * is how a step count drifts above what the watch itself reports. Records are taken oldest first,
 * longest first on a tie, and anything starting before the end of what has already been counted is
 * skipped. Records that merely touch end to end both count.
 */
export function sumWithoutOverlap(items: readonly Measured[]): number {
  const sorted = [...items].sort((a, b) => a.startMs - b.startMs || b.endMs - b.startMs - (a.endMs - a.startMs));
  let total = 0;
  let countedUpTo = -Infinity;
  for (const item of sorted) {
    if (item.startMs < countedUpTo) continue;
    total += item.value;
    countedUpTo = Math.max(countedUpTo, item.endMs);
  }
  return total;
}
