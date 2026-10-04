import { SLEEP_STAGE } from '@/domain/sleepScore';

import { groupSleepSessions, HK_SLEEP, HK_WORKOUT, mapSleepValue, mapWorkoutType, type RawSleepSample } from './appleHealthMapping';

const MIN = 60000;
const night = Date.UTC(2026, 8, 10, 22, 0); // 10pm

describe('mapWorkoutType', () => {
  it('maps the sports the plan uses', () => {
    expect(mapWorkoutType(HK_WORKOUT.running)).toBe('run');
    expect(mapWorkoutType(HK_WORKOUT.cycling)).toBe('cycling');
    expect(mapWorkoutType(HK_WORKOUT.tennis)).toBe('tennis');
    expect(mapWorkoutType(HK_WORKOUT.traditionalStrengthTraining)).toBe('strength');
    expect(mapWorkoutType(HK_WORKOUT.swimming)).toBe('swim');
  });

  it('groups related sports the same way the Health Connect mapping does', () => {
    expect(mapWorkoutType(HK_WORKOUT.pickleball)).toBe('tennis');
    expect(mapWorkoutType(HK_WORKOUT.highIntensityIntervalTraining)).toBe('strength');
    expect(mapWorkoutType(HK_WORKOUT.hiking)).toBe('walk');
    expect(mapWorkoutType(HK_WORKOUT.pilates)).toBe('yoga');
  });

  it('files anything else under other', () => {
    expect(mapWorkoutType(9999)).toBe('other');
  });
});

describe('mapSleepValue', () => {
  it('translates Apple stages to the sleep score codes', () => {
    expect(mapSleepValue(HK_SLEEP.asleepCore)).toBe(SLEEP_STAGE.LIGHT);
    expect(mapSleepValue(HK_SLEEP.asleepDeep)).toBe(SLEEP_STAGE.DEEP);
    expect(mapSleepValue(HK_SLEEP.asleepREM)).toBe(SLEEP_STAGE.REM);
    expect(mapSleepValue(HK_SLEEP.awake)).toBe(SLEEP_STAGE.AWAKE);
    expect(mapSleepValue(HK_SLEEP.asleepUnspecified)).toBe(SLEEP_STAGE.SLEEPING);
  });

  it('drops "in bed", which spans the whole night underneath the real stages', () => {
    expect(mapSleepValue(HK_SLEEP.inBed)).toBeNull();
  });
});

describe('groupSleepSessions', () => {
  const seg = (fromMin: number, toMin: number, value: number, sourceId = 'garmin'): RawSleepSample => ({
    startMs: night + fromMin * MIN,
    endMs: night + toMin * MIN,
    value,
    sourceId,
  });

  it('builds one night from contiguous stage samples', () => {
    const [session, ...rest] = groupSleepSessions([
      seg(0, 90, HK_SLEEP.asleepCore),
      seg(90, 150, HK_SLEEP.asleepDeep),
      seg(150, 160, HK_SLEEP.awake),
      seg(160, 420, HK_SLEEP.asleepREM),
    ]);
    expect(rest).toHaveLength(0);
    expect(session.startMs).toBe(night);
    expect(session.endMs).toBe(night + 420 * MIN);
    expect(session.stages.map((s) => s.stage)).toEqual([SLEEP_STAGE.LIGHT, SLEEP_STAGE.DEEP, SLEEP_STAGE.AWAKE, SLEEP_STAGE.REM]);
  });

  it('splits a nap from the night when there is a long gap', () => {
    const sessions = groupSleepSessions([seg(0, 420, HK_SLEEP.asleepCore), seg(900, 930, HK_SLEEP.asleepCore)]);
    expect(sessions).toHaveLength(2);
  });

  it('keeps the source with the most sleep so two apps never double the night', () => {
    const [session] = groupSleepSessions([
      // iPhone sleep schedule: one long "in bed" span and a vague "asleep".
      seg(-15, 435, HK_SLEEP.inBed, 'iphone'),
      seg(10, 300, HK_SLEEP.asleepUnspecified, 'iphone'),
      // Garmin: detailed stages across the whole night.
      seg(0, 200, HK_SLEEP.asleepCore, 'garmin'),
      seg(200, 260, HK_SLEEP.asleepDeep, 'garmin'),
      seg(260, 420, HK_SLEEP.asleepREM, 'garmin'),
    ]);
    expect(session.externalId).toContain('garmin');
    expect(session.stages).toHaveLength(3);
    expect(session.stages.every((s) => s.stage !== SLEEP_STAGE.SLEEPING)).toBe(true);
  });

  it('skips a session that has only "in bed" and no actual sleep', () => {
    expect(groupSleepSessions([seg(0, 480, HK_SLEEP.inBed, 'iphone')])).toEqual([]);
  });

  it('ignores zero-length and backwards samples', () => {
    expect(groupSleepSessions([seg(10, 10, HK_SLEEP.asleepCore), seg(50, 20, HK_SLEEP.asleepDeep)])).toEqual([]);
  });

  it('gives the same id to the same night on every sync', () => {
    const samples = [seg(0, 400, HK_SLEEP.asleepCore)];
    expect(groupSleepSessions(samples)[0].externalId).toBe(groupSleepSessions([...samples])[0].externalId);
  });
});
