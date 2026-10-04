import { findDuplicates } from './dedupe';

const T0 = new Date(2026, 8, 10, 7, 0).getTime();

describe('findDuplicates', () => {
  it('matches a watch recording with an app workout and keeps the watch', () => {
    const dupes = findDuplicates([
      { id: 1, startedAt: T0, durationSec: 2700, type: 'strength', source: 'workout' },
      { id: 2, startedAt: T0 + 2 * 60000, durationSec: 2600, type: 'strength', source: 'health_connect' },
    ]);
    expect(dupes.get(1)).toBe(2);
    expect(dupes.has(2)).toBe(false);
  });

  it('does not match different types, far-apart starts, or very different durations', () => {
    const dupes = findDuplicates([
      { id: 1, startedAt: T0, durationSec: 1800, type: 'run', source: 'health_connect' },
      { id: 2, startedAt: T0 + 60000, durationSec: 1800, type: 'tennis', source: 'manual' },
      { id: 3, startedAt: T0 + 10 * 60000, durationSec: 1800, type: 'run', source: 'manual' },
      { id: 4, startedAt: T0 + 60000, durationSec: 900, type: 'run', source: 'manual' },
    ]);
    expect(dupes.size).toBe(0);
  });

  it('marks only one record as duplicate in a chain', () => {
    const dupes = findDuplicates([
      { id: 1, startedAt: T0, durationSec: 1800, type: 'run', source: 'manual' },
      { id: 2, startedAt: T0 + 60000, durationSec: 1800, type: 'run', source: 'health_connect' },
      { id: 3, startedAt: T0 + 120000, durationSec: 1800, type: 'run', source: 'manual' },
    ]);
    expect(dupes.get(1)).toBe(2);
    expect(dupes.get(3)).toBe(2);
  });
});
