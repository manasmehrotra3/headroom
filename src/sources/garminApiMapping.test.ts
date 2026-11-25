import { findDuplicates } from '@/domain/dedupe';
import { addDays, daysBetween } from '@/domain/dates';
import { SLEEP_STAGE, stageMinutes } from '@/domain/sleepScore';

import activities from './__fixtures__/garmin/activities.json';
import activityTypes from './__fixtures__/garmin/activity-types.json';
import dailySummaries from './__fixtures__/garmin/daily-summaries.json';
import hrvSummaries from './__fixtures__/garmin/hrv-summaries.json';
import sleepSummaries from './__fixtures__/garmin/sleep-summaries.json';
import vo2Max from './__fixtures__/garmin/vo2-max.json';
import weightEmpty from './__fixtures__/garmin/weight.json';
import weightYear from './__fixtures__/garmin/weight-year.json';
import { dateWindows, GARMIN_TYPE_KEYS, keyExpiryNotice, mapActivities, mapActivityType, mapDaily, mapSleep, mapWeights, tokenExpiryMs } from './garminApiMapping';

describe('mapActivityType', () => {
  it('maps the sports the plan uses', () => {
    expect(mapActivityType('running')).toBe('run');
    expect(mapActivityType('treadmill_running')).toBe('run');
    expect(mapActivityType('lap_swimming')).toBe('swim');
    expect(mapActivityType('open_water_swimming')).toBe('swim');
    expect(mapActivityType('road_biking')).toBe('cycling');
    expect(mapActivityType('indoor_cycling')).toBe('cycling');
    expect(mapActivityType('strength_training')).toBe('strength');
    expect(mapActivityType('tennis_v2')).toBe('tennis');
  });

  it('groups related sports the same way the Health Connect mapping does', () => {
    expect(mapActivityType('pickleball')).toBe('tennis');
    expect(mapActivityType('hiit')).toBe('strength');
    expect(mapActivityType('hiking')).toBe('walk');
    expect(mapActivityType('pilates')).toBe('yoga');
  });

  it('files anything else under other', () => {
    expect(mapActivityType('golf')).toBe('other');
    expect(mapActivityType('something_new')).toBe('other');
    expect(mapActivityType(null)).toBe('other');
  });

  it('only names type keys Garmin really has, apart from the plain "tennis" spelling', () => {
    const real = new Set(activityTypes.map((t) => t.key));
    const named = Object.values(GARMIN_TYPE_KEYS).flat();
    expect(named.filter((key) => !real.has(key))).toEqual(['tennis']);
    expect(new Set(named).size).toBe(named.length);
  });
});

describe('mapActivities', () => {
  const mapped = mapActivities(activities);

  it('keeps every activity in the captured list', () => {
    expect(mapped).toHaveLength(activities.length);
    expect(mapped.map((a) => a.type)).toEqual(['run', 'run', 'run', 'cycling', 'walk']);
  });

  it('reads the half marathon correctly', () => {
    expect(mapped[0]).toEqual({
      externalId: 'garmin:9000000001',
      type: 'run',
      title: 'Half Marathon',
      startMs: Date.UTC(2026, 10, 14, 12, 23, 16),
      endMs: Date.UTC(2026, 10, 14, 14, 40, 58) + 260,
      distanceM: 21279.140625,
      avgHr: 181,
      maxHr: 196,
      activeKcal: 1472 - 174,
    });
  });

  it('ends at the real finish time when the watch was paused', () => {
    // 40 min 46 s on the timer, 48 min 25 s start to finish.
    const paused = mapped[2];
    expect(Math.round((paused.endMs - paused.startMs) / 1000)).toBe(2905);
  });

  it('falls back to the text start time and a title from the type', () => {
    const [a] = mapActivities([{ activityId: 7, activityName: '  ', activityType: { typeKey: 'lap_swimming' }, startTimeGMT: '2026-12-08 11:00:00', duration: 1800, distance: 1500 }]);
    expect(a).toMatchObject({ type: 'swim', title: 'Swim', startMs: Date.UTC(2026, 11, 8, 11, 0, 0), endMs: Date.UTC(2026, 11, 8, 11, 30, 0), distanceM: 1500, avgHr: null, activeKcal: null });
  });

  it('turns a zero distance into no distance, and skips entries it cannot place in time', () => {
    const list = mapActivities([
      { activityId: 1, activityType: { typeKey: 'strength_training' }, beginTimestamp: 1794658996000, duration: 2400, distance: 0 },
      { activityId: 2, activityType: { typeKey: 'running' }, duration: 600 },
      { activityType: { typeKey: 'running' }, beginTimestamp: 1794658996000, duration: 600 },
    ]);
    expect(list).toHaveLength(1);
    expect(list[0].distanceM).toBeNull();
  });

  it('copes with something that is not a list', () => {
    expect(mapActivities(null)).toEqual([]);
    expect(mapActivities({} as never)).toEqual([]);
  });

  it('is recognised as the same session as the phone health store copy', () => {
    // After switching source, the run exists twice: once from each. Same type, same start, and
    // Health Connect's session runs start to finish just as ours does.
    const half = mapped[0];
    const garmin = { id: 2, startedAt: half.startMs, durationSec: (half.endMs - half.startMs) / 1000, type: half.type, source: 'garmin_api' };
    const phone = { id: 1, startedAt: half.startMs + 1000, durationSec: 8262, type: 'run', source: 'health_connect' };
    const dupes = findDuplicates([phone, garmin]);
    expect(dupes.size).toBe(1);
    expect(dupes.get(1)).toBe(2);
  });
});

describe('mapSleep', () => {
  const nights = mapSleep(sleepSummaries);

  it('maps every captured night, with ids that stay the same when Garmin revises one', () => {
    expect(nights).toHaveLength(sleepSummaries.length);
    expect(nights[0].externalId).toBe(`garmin:sleep:${sleepSummaries[0].calendarDate}`);
    expect(new Set(nights.map((n) => n.externalId)).size).toBe(nights.length);
  });

  it('carries Garmin’s stage totals, which is all the sleep score reads', () => {
    for (const [i, raw] of sleepSummaries.entries()) {
      const night = nights[i];
      const minutes = stageMinutes(night);
      expect(night.startMs).toBe(raw.sleepStartTimestampGMT);
      expect(night.endMs).toBe(raw.sleepEndTimestampGMT);
      expect(minutes.get(SLEEP_STAGE.DEEP) ?? 0).toBeCloseTo(raw.deepSleepSeconds / 60);
      expect(minutes.get(SLEEP_STAGE.LIGHT) ?? 0).toBeCloseTo(raw.lightSleepSeconds / 60);
      expect(minutes.get(SLEEP_STAGE.REM) ?? 0).toBeCloseTo(raw.remSleepSeconds / 60);
      expect(minutes.get(SLEEP_STAGE.AWAKE) ?? 0).toBeCloseTo(raw.awakeSleepSeconds / 60);
    }
  });

  it('lays the stage blocks end to end inside the night', () => {
    for (const night of nights) {
      let cursor = night.startMs;
      for (const stage of night.stages) {
        expect(stage.start).toBe(cursor);
        expect(stage.end).toBeGreaterThan(stage.start);
        cursor = stage.end;
      }
      // Garmin's totals do not always add up to the night exactly; a minute or two either way is normal.
      expect(Math.abs(cursor - night.endMs)).toBeLessThan(5 * 60000);
    }
  });

  it('keeps a night with no stage totals as a plain span, and drops one with no times', () => {
    const list = mapSleep([
      { calendarDate: '2026-12-01', sleepStartTimestampGMT: 1000, sleepEndTimestampGMT: 5000 },
      { calendarDate: '2026-12-02', sleepStartTimestampGMT: null, sleepEndTimestampGMT: null },
    ]);
    expect(list).toEqual([{ externalId: 'garmin:sleep:2026-12-01', startMs: 1000, endMs: 5000, stages: [] }]);
  });
});

describe('mapDaily', () => {
  const days = mapDaily({ summaries: dailySummaries, hrv: hrvSummaries, vo2: vo2Max });
  const on = (date: string) => days.find((d) => d.date === date);

  it('gives one row per day, oldest first', () => {
    expect(days).toHaveLength(28);
    expect(days[0].date).toBe('2026-10-19');
    expect(days[27].date).toBe('2026-11-15');
    for (let i = 1; i < days.length; i++) expect(days[i].date).toBe(addDays(days[i - 1].date, 1));
  });

  it('joins resting heart rate, steps, calories, HRV and VO2 max for race day', () => {
    expect(on('2026-11-14')).toEqual({ date: '2026-11-14', restingHr: 54, hrvRmssd: 43, steps: 35367, activeKcal: 1677, vo2Max: 46.9 });
  });

  it('leaves VO2 max empty on a day with no new estimate', () => {
    expect(on('2026-11-12')).toEqual({ date: '2026-11-12', restingHr: 54, hrvRmssd: 40, steps: 10147, activeKcal: 268, vo2Max: null });
  });

  it('uses the cycling estimate when there is no running one', () => {
    const [day] = mapDaily({ vo2: [{ generic: null, cycling: { calendarDate: '2026-12-01', vo2MaxValue: 51 } }] });
    expect(day).toEqual({ date: '2026-12-01', restingHr: null, hrvRmssd: null, steps: null, activeKcal: null, vo2Max: 51 });
  });

  it('copes with every response missing', () => {
    expect(mapDaily({})).toEqual([]);
    expect(mapDaily({ summaries: { data: null }, hrv: null, vo2: null })).toEqual([]);
  });
});

describe('mapWeights', () => {
  it('reads every weigh-in in the range, oldest first, in kilograms', () => {
    const weights = mapWeights(weightYear);
    expect(weights).toHaveLength(5);
    expect(weights.map((w) => w.ms)).toEqual([...weights.map((w) => w.ms)].sort((a, b) => a - b));
    expect(weights[4]).toEqual({ externalId: 'garmin:weight:1785771096734', ms: 1785771096611, kg: 63.956 });
  });

  it('returns nothing for a range with no weigh-ins', () => {
    expect(mapWeights(weightEmpty)).toEqual([]);
    expect(mapWeights(null)).toEqual([]);
  });

  it('uses the latest weigh-in when the full list is missing', () => {
    expect(mapWeights({ dailyWeightSummaries: [{ latestWeight: { samplePk: 5, timestampGMT: 2000, weight: 70250 } }] })).toEqual([{ externalId: 'garmin:weight:5', ms: 2000, kg: 70.25 }]);
  });
});

describe('dateWindows', () => {
  const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();

  it('gives a single window for a short range', () => {
    expect(dateWindows(at(2026, 11, 10), at(2026, 11, 15), 28)).toEqual([{ start: '2026-11-10', end: '2026-11-15' }]);
    expect(dateWindows(at(2026, 11, 15, 1), at(2026, 11, 15, 23), 28)).toEqual([{ start: '2026-11-15', end: '2026-11-15' }]);
  });

  it('splits a long range into windows that never exceed the limit', () => {
    expect(dateWindows(at(2026, 10, 1), at(2026, 11, 15), 28)).toEqual([
      { start: '2026-10-01', end: '2026-10-28' },
      { start: '2026-10-29', end: '2026-11-15' },
    ]);
  });

  it('covers every day of a year exactly once, across both clock changes', () => {
    const windows = dateWindows(at(2025, 11, 16), at(2026, 11, 15), 28);
    expect(windows[0].start).toBe('2025-11-16');
    expect(windows[windows.length - 1].end).toBe('2026-11-15');
    for (const [i, w] of windows.entries()) {
      expect(daysBetween(w.start, w.end)).toBeLessThan(28);
      expect(daysBetween(w.start, w.end)).toBeGreaterThanOrEqual(0);
      if (i > 0) expect(w.start).toBe(addDays(windows[i - 1].end, 1));
    }
  });

  it('returns nothing when the range is backwards', () => {
    expect(dateWindows(at(2026, 11, 15), at(2026, 11, 10), 28)).toEqual([]);
  });
});

describe('tokenExpiryMs', () => {
  // base64url, as a real token uses: no padding, and - and _ in place of + and /.
  const jwt = (claims: object) => `header.${btoa(JSON.stringify(claims)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}.signature`;

  it('reads the expiry out of a token', () => {
    expect(tokenExpiryMs(jwt({ exp: 1794849717, iat: 1794763317, scope: ['CONNECT_READ'] }))).toBe(1794849717000);
  });

  it('returns null for anything that is not a token with an expiry', () => {
    expect(tokenExpiryMs('')).toBeNull();
    expect(tokenExpiryMs('not a token')).toBeNull();
    expect(tokenExpiryMs(jwt({ iat: 1 }))).toBeNull();
  });
});

describe('keyExpiryNotice', () => {
  it('says nothing while the date is far off or unknown', () => {
    expect(keyExpiryNotice('2027-11-15', '2026-11-15', 14)).toBeNull();
    expect(keyExpiryNotice('2026-11-30', '2026-11-15', 14)).toBeNull();
    expect(keyExpiryNotice(null, '2026-11-15', 14)).toBeNull();
    expect(keyExpiryNotice('soon', '2026-11-15', 14)).toBeNull();
  });

  it('warns from 14 days before', () => {
    expect(keyExpiryNotice('2026-11-29', '2026-11-15', 14)).toMatchObject({ expired: false, message: expect.stringContaining('in 14 days, on 2026-11-29') });
    expect(keyExpiryNotice('2026-11-16', '2026-11-15', 14)?.message).toContain('expires tomorrow');
    expect(keyExpiryNotice('2026-11-15', '2026-11-15', 14)?.message).toContain('expires today');
  });

  it('says so once the date has passed', () => {
    expect(keyExpiryNotice('2026-11-14', '2026-11-15', 14)).toMatchObject({ expired: true, message: expect.stringContaining('expired on 2026-11-14') });
  });
});
