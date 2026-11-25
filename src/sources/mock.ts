/**
 * Generated demo data so every screen works without a watch (e.g. on an emulator).
 * Deterministic: the same dates always give the same data.
 */
import { addDays, fromDateKey, toDateKey, weekdayOf, type DateKey } from '@/domain/dates';
import { SLEEP_STAGE } from '@/domain/sleepScore';

import type { ActivitySource, SourceActivity, SourceDaily, SourceData, SourceSleep, SourceWeight } from './types';

/** Small seeded PRNG (mulberry32) so mock data is stable between runs. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MOCK_EPOCH_MS = new Date(2026, 6, 1).getTime();

function seedFor(date: DateKey): number {
  return Number(date.replace(/-/g, ''));
}

const at = (date: DateKey, hour: number, minute: number) => {
  const d = fromDateKey(date);
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
};

function mockSleep(date: DateKey, r: () => number): SourceSleep {
  // Bed the night before, around 23:00 ± 40 min; wake around 6:45 ± 30 min.
  const bed = at(addDays(date, -1), 23, 0) + (r() - 0.5) * 80 * 60000;
  const wake = at(date, 6, 45) + (r() - 0.5) * 60 * 60000;
  const total = wake - bed;
  const stages: SourceSleep['stages'] = [];
  let cursor = bed;
  // Cycle: light, deep, light, REM, occasional awake.
  const pattern = [SLEEP_STAGE.LIGHT, SLEEP_STAGE.DEEP, SLEEP_STAGE.LIGHT, SLEEP_STAGE.REM, SLEEP_STAGE.AWAKE];
  let i = 0;
  while (cursor < wake) {
    const stage = pattern[i % pattern.length];
    const minutes = stage === SLEEP_STAGE.AWAKE ? 2 + r() * 6 : stage === SLEEP_STAGE.DEEP ? 15 + r() * 20 : 20 + r() * 25;
    const end = Math.min(wake, cursor + minutes * 60000);
    stages.push({ start: cursor, end, stage });
    cursor = end;
    i += 1;
  }
  void total;
  return { externalId: `mock:sleep:${date}`, startMs: bed, endMs: wake, stages, score: null };
}

function mockActivity(date: DateKey, r: () => number): SourceActivity | null {
  const weekday = weekdayOf(date);
  const jitter = (r() - 0.5) * 0.2;
  switch (weekday) {
    case 'mon':
    case 'tue':
    case 'thu':
      return {
        externalId: `mock:act:${date}`,
        type: 'strength',
        title: 'Strength',
        startMs: at(date, 18, 0),
        endMs: at(date, 18, 0) + 44 * 60000,
        distanceM: null,
        avgHr: Math.round(118 + jitter * 40),
        maxHr: 150,
        activeKcal: 260,
      };
    case 'wed': {
      const minutes = 32 + jitter * 20;
      return {
        externalId: `mock:act:${date}`,
        type: 'run',
        title: 'Run',
        startMs: at(date, 6, 30),
        endMs: at(date, 6, 30) + minutes * 60000,
        distanceM: 4800 + jitter * 2000,
        avgHr: Math.round(158 + jitter * 20),
        maxHr: 178,
        activeKcal: 380,
      };
    }
    case 'sat': {
      const minutes = 38 + jitter * 20;
      return {
        externalId: `mock:act:${date}`,
        type: 'run',
        title: 'Run',
        startMs: at(date, 8, 0),
        endMs: at(date, 8, 0) + minutes * 60000,
        distanceM: 6000 + jitter * 2500,
        avgHr: Math.round(146 + jitter * 20),
        maxHr: 165,
        activeKcal: 430,
      };
    }
    case 'sun':
      return r() < 0.85
        ? {
            externalId: `mock:act:${date}`,
            type: 'tennis',
            title: 'Tennis',
            startMs: at(date, 9, 0),
            endMs: at(date, 9, 0) + (85 + jitter * 60) * 60000,
            distanceM: null,
            avgHr: Math.round(132 + jitter * 30),
            maxHr: 168,
            activeKcal: 620,
          }
        : null;
    default:
      return null;
  }
}

export const mockSource: ActivitySource = {
  id: 'mock',

  async read(fromMs, toMs): Promise<SourceData> {
    const activities: SourceActivity[] = [];
    const sleep: SourceSleep[] = [];
    const daily: SourceDaily[] = [];
    const weights: SourceWeight[] = [];

    const first = toDateKey(new Date(fromMs));
    const last = toDateKey(new Date(toMs));
    const startKg = 84;

    for (let date = first; date <= last; date = addDays(date, 1)) {
      const r = rng(seedFor(date));
      // Anchored to a fixed date so re-syncs reproduce the same weights.
      const weeksFromStart = Math.max(0, (fromDateKey(date).getTime() - MOCK_EPOCH_MS) / (7 * 86400000));

      const night = mockSleep(date, r);
      if (night.endMs <= toMs) sleep.push(night);

      const activity = mockActivity(date, r);
      if (activity && activity.endMs <= toMs) activities.push(activity);

      daily.push({
        date,
        restingHr: Math.round(54 + (r() - 0.5) * 6 + (weekdayOf(date) === 'mon' ? 2 : 0)),
        hrvRmssd: Math.round(55 + (r() - 0.5) * 20),
        steps: Math.round(7000 + r() * 5000),
        activeKcal: Math.round(300 + r() * 300),
        // Watches update VO2 max every few days, and it creeps up with training.
        vo2Max: r() < 0.3 ? Math.round((44 + weeksFromStart * 0.12 + (r() - 0.5) * 0.6) * 10) / 10 : null,
      });

      // Steady loss of ~0.4 kg/week with daily noise, weighed most mornings.
      if (r() < 0.8) {
        weights.push({ externalId: `mock:w:${date}`, ms: at(date, 7, 0), kg: startKg - weeksFromStart * 0.4 + (r() - 0.5) * 1.2 });
      }
    }
    return { activities, sleep, daily, weights };
  },
};
