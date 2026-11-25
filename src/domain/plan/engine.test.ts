import { bikeZones } from '../cycling/workouts';
import { addDays } from '../dates';
import { raceContext } from './race';
import { DEFAULT_SCHEDULE } from '../schedule';
import { trainingPaces } from '../running/vdot';
import { adjustForDay, buildWeek } from './engine';
import { markDay, moveSession } from './reschedule';
import type { WeekContext } from './types';

const WEEK = '2026-09-07'; // Monday

function ctx(overrides: Partial<WeekContext> = {}): WeekContext {
  return {
    weekStart: WEEK,
    today: WEEK,
    schedule: DEFAULT_SCHEDULE,
    weekIndex: 1,
    lastWeekRunMin: 0,
    lastWeekBikeMin: 0,
    lastWeekHadQuality: true,
    lastWeekPlanned: null,
    acwr: 1.0,
    acwrLabel: 'sweet_spot',
    lowReadinessDays: 0,
    lastTennis: null,
    painAreas: [],
    painStreaks: {},
    paces: trainingPaces(38.6),
    bikeZones: bikeZones(190),
    race: null,
    useRaceTemplate: true,
    ...overrides,
  };
}

const byDay = <T extends { date: string }>(sessions: T[], date: string): T => sessions.find((s) => s.date === date)!;

describe('buildWeek', () => {
  it('follows the default template with no adjustments', () => {
    const week = buildWeek(ctx());
    expect(week.sessions.map((s) => s.sessionType)).toEqual(['strength_lower', 'strength_upper', 'run_quality', 'strength_light', 'mobility', 'run_easy', 'tennis']);
    expect(week.changes).toEqual([]);
    expect(week.sessions.filter((s) => s.sessionType !== 'tennis').every((s) => s.targetMin <= 50)).toBe(true);
    const wed = byDay(week.sessions, '2026-09-09');
    expect(wed.detail.kind).toBe('run');
    expect(wed.addOn).toBe(true);
  });

  it('starts run volume at 30 min and grows 10% a week up to the cap', () => {
    const first = buildWeek(ctx({ lastWeekPlanned: null }));
    expect(byDay(first.sessions, '2026-09-12').targetMin).toBe(30);
    const later = buildWeek(ctx({ lastWeekPlanned: { quality: 30, easy: 40 }, lastWeekRunMin: 70, lastWeekHadQuality: true }));
    expect(byDay(later.sessions, '2026-09-12').targetMin).toBe(44);
    const capped = buildWeek(ctx({ lastWeekPlanned: { quality: 45, easy: 45 }, lastWeekRunMin: 90 }));
    expect(byDay(capped.sessions, '2026-09-12').targetMin).toBe(45);
  });

  it('holds run volume to +10% of what was actually run', () => {
    const week = buildWeek(ctx({ lastWeekPlanned: { quality: 40, easy: 40 }, lastWeekRunMin: 40, lastWeekHadQuality: true }));
    const runMin = week.sessions.filter((s) => s.detail.kind === 'run').reduce((sum, s) => sum + s.targetMin, 0);
    expect(runMin).toBeLessThanOrEqual(44);
    expect(week.changes.some((c) => c.ruleId === 'run_volume')).toBe(true);
  });

  it('adds no volume in a week that introduces intensity', () => {
    const week = buildWeek(ctx({ lastWeekPlanned: { quality: 30, easy: 30 }, lastWeekRunMin: 60, lastWeekHadQuality: false }));
    const runMin = week.sessions.filter((s) => s.detail.kind === 'run').reduce((sum, s) => sum + s.targetMin, 0);
    expect(runMin).toBeLessThanOrEqual(60);
    expect(week.changes[0].reason).toContain('adds a hard session');
  });

  it('deloads every 4th week', () => {
    const week = buildWeek(ctx({ weekIndex: 3 }));
    expect(byDay(week.sessions, WEEK).variant).toBe('deload');
    const wed = byDay(week.sessions, '2026-09-09');
    expect(wed.detail.kind === 'run' && wed.detail.focus).toBe('easy');
    expect(week.changes[0].reason).toContain('deload');
  });

  it('deloads early after several low-readiness days', () => {
    const week = buildWeek(ctx({ weekIndex: 1, lowReadinessDays: 3 }));
    expect(byDay(week.sessions, WEEK).variant).toBe('deload');
    expect(week.changes[0].reason).toContain('Readiness was low');
  });

  it('trims the next sessions when ACWR is high', () => {
    const week = buildWeek(ctx({ acwr: 1.45, acwrLabel: 'caution' }));
    const trimmed = week.changes.filter((c) => c.ruleId === 'acwr');
    expect(trimmed).toHaveLength(3);
    expect(byDay(week.sessions, WEEK).variant).toBe('easy');
    expect(trimmed.some((c) => c.reason.includes('45%'))).toBe(true);
  });

  it('lightens Monday after a long or hard Sunday of tennis', () => {
    const week = buildWeek(ctx({ lastTennis: { durationMin: 120, rpe: 6 } }));
    expect(byDay(week.sessions, WEEK).variant).toBe('easy');
    expect(byDay(week.sessions, WEEK).reason).toContain('120 min');
    const fine = buildWeek(ctx({ lastTennis: { durationMin: 60, rpe: 5 } }));
    expect(byDay(fine.sessions, WEEK).variant).toBe('normal');
  });

  it('never leaves heavy legs the day before a run', () => {
    const week = buildWeek(ctx({ schedule: { ...DEFAULT_SCHEDULE, fri: 'strength_lower' } }));
    expect(byDay(week.sessions, '2026-09-11').sessionType).toBe('strength_light');
    expect(week.changes.some((c) => c.ruleId === 'no_heavy_lower_before_run')).toBe(true);
  });

  it('turns runs into mobility for knee pain and flags long-lasting pain', () => {
    const week = buildWeek(ctx({ painAreas: ['knee'], painStreaks: { knee: 4 } }));
    expect(byDay(week.sessions, '2026-09-09').sessionType).toBe('mobility');
    expect(byDay(week.sessions, '2026-09-12').sessionType).toBe('mobility');
    expect(byDay(week.sessions, WEEK).reason).toContain('knee');
    expect(week.changes.some((c) => c.ruleId === 'pain_physio' && c.reason.includes('physio'))).toBe(true);
  });

  it('keeps every session at or under the cap', () => {
    const week = buildWeek(ctx({ lastWeekPlanned: { quality: 60, easy: 60 }, lastWeekRunMin: 200 }));
    expect(week.sessions.filter((s) => s.sessionType !== 'tennis').every((s) => s.targetMin <= 50)).toBe(true);
  });
});

describe('adjustForDay', () => {
  const base = buildWeek(ctx()).sessions;

  it('swaps in the easy variant on a low-readiness day, never a skip', () => {
    const mon = byDay(base, WEEK);
    const { session, changes } = adjustForDay(mon, { date: WEEK, readinessBand: 'low', painAreas: [], painStreaks: {}, paces: null, bikeZones: null });
    expect(session.variant).toBe('easy');
    expect(session.status).toBe('planned');
    expect(changes[0].reason).toContain('readiness is low');
  });

  it('turns a quality run into an easy run when readiness is low', () => {
    const wed = byDay(base, '2026-09-09');
    const { session } = adjustForDay(wed, { date: '2026-09-09', readinessBand: 'low', painAreas: [], painStreaks: {}, paces: null, bikeZones: null });
    expect(session.detail.kind === 'run' && session.detail.focus).toBe('easy');
  });

  it('replaces a run with mobility on reported ankle pain', () => {
    const wed = byDay(base, '2026-09-09');
    const { session } = adjustForDay(wed, { date: '2026-09-09', readinessBand: 'good', painAreas: ['ankle'], painStreaks: { ankle: 1 }, paces: null, bikeZones: null });
    expect(session.sessionType).toBe('mobility');
  });

  it('leaves other days and done sessions alone', () => {
    const tue = byDay(base, '2026-09-08');
    expect(adjustForDay(tue, { date: WEEK, readinessBand: 'low', painAreas: [], painStreaks: {}, paces: null, bikeZones: null }).session).toBe(tue);
  });
});

describe('reschedule', () => {
  const week = buildWeek(ctx()).sessions;

  it('moves a sick day\'s session to a free day and makes the next day easy', () => {
    const { sessions, changes } = markDay(week, '2026-09-08', 'sick', ctx());
    expect(byDay(sessions, '2026-09-08').status).toBe('sick');
    expect(byDay(sessions, '2026-09-09').variant).toBe('easy');
    expect(byDay(sessions, '2026-09-11').sessionType).toBe('strength_upper');
    expect(byDay(sessions, '2026-09-11').movedFrom).toBe('2026-09-08');
    expect(changes.map((c) => c.ruleId)).toEqual(['mark_day', 'sick_recovery', 'reschedule']);
  });

  it('does not cram: a session with no fitting free day is dropped with a reason', () => {
    const afterSick = markDay(week, '2026-09-08', 'sick', ctx()).sessions;
    const { sessions, changes } = markDay(afterSick, '2026-09-10', 'travel', ctx());
    expect(byDay(sessions, '2026-09-10').status).toBe('travel');
    expect(changes.at(-1)!.reason).toContain('dropped');
    expect(sessions.filter((s) => s.status === 'planned' && s.date === '2026-09-11')).toHaveLength(1);
  });

  it('will not place heavy legs the day before a run', () => {
    // Monday lower is lost; the only free days are Fri (before Sat's run) → dropped.
    const { sessions } = markDay(week, WEEK, 'travel', ctx());
    expect(byDay(sessions, '2026-09-11').sessionType).toBe('mobility');
    expect(byDay(sessions, WEEK).status).toBe('travel');
  });

  it('skipping keeps the day skipped and moves nothing', () => {
    const { sessions } = markDay(week, WEEK, 'skipped', ctx());
    expect(byDay(sessions, WEEK).status).toBe('skipped');
    expect(byDay(sessions, '2026-09-11').sessionType).toBe('mobility');
  });

  it('swaps two days on a move and fixes heavy-legs-before-run', () => {
    const { sessions, changes } = moveSession(week, WEEK, '2026-09-11', ctx());
    expect(byDay(sessions, WEEK).sessionType).toBe('mobility');
    // Lower body moved to Friday, before Saturday's run → becomes light.
    expect(byDay(sessions, '2026-09-11').sessionType).toBe('strength_light');
    expect(changes.some((c) => c.ruleId === 'no_heavy_lower_before_run')).toBe(true);
  });
});

const triRace = { name: '70.3', type: 'ironman_70_3' as const, date: '2027-01-01', priority: 'A' as const, goalTimeSec: null };

function triCtx(weeks: number, overrides: Partial<WeekContext> = {}) {
  return ctx({ race: raceContext(triRace, addDays(triRace.date, -Math.round(weeks * 7))), ...overrides });
}

describe('race mode', () => {
  it('switches to the triathlon week and keeps weekdays under the 50-minute cap', () => {
    const week = buildWeek(triCtx(16));
    expect(week.sessions.map((s) => s.sessionType)).toEqual([
      'strength_lower',
      'bike_quality',
      'run_quality',
      'strength_upper',
      'mobility',
      'bike_long',
      'tennis',
    ]);
    const weekdays = week.sessions.filter((s) => s.date <= '2026-09-11');
    expect(weekdays.every((s) => s.targetMin <= 50)).toBe(true);
  });

  it('lets the Saturday long ride run past the weekday cap, with a brick run', () => {
    const week = buildWeek(triCtx(5));
    const saturday = byDay(week.sessions, '2026-09-12');
    expect(saturday.sessionType).toBe('bike_long');
    expect(saturday.targetMin).toBeGreaterThan(50);
    expect(saturday.detail.kind === 'bike' && saturday.detail.brickRunMin).toBeGreaterThan(0);
  });

  it('holds bike volume to +10% a week once there is history', () => {
    const week = buildWeek(triCtx(5, { lastWeekBikeMin: 60 }));
    const bikeMin = week.sessions.filter((s) => s.detail.kind === 'bike').reduce((sum, s) => sum + s.targetMin, 0);
    // Cut from 210 planned minutes to roughly last week + 10%; each session keeps a 20-minute floor
    // so a trimmed ride is still worth doing, which is why this lands a little above 66.
    expect(bikeMin).toBeLessThan(80);
    expect(week.changes.some((c) => c.ruleId === 'bike_volume')).toBe(true);
  });

  it('keeps rides when the pain is a running injury, and drops them for knee pain', () => {
    const shin = buildWeek(triCtx(16, { painAreas: ['shin'], painStreaks: { shin: 1 } }));
    expect(byDay(shin.sessions, '2026-09-08').sessionType).toBe('bike_quality');
    expect(byDay(shin.sessions, '2026-09-09').sessionType).toBe('mobility');

    const knee = buildWeek(triCtx(16, { painAreas: ['knee'], painStreaks: { knee: 1 } }));
    expect(byDay(knee.sessions, '2026-09-08').sessionType).toBe('mobility');
    expect(byDay(knee.sessions, '2026-09-12').sessionType).toBe('mobility');
  });

  it('turns the quality ride into an easy spin when readiness is low', () => {
    const tue = byDay(buildWeek(triCtx(16)).sessions, '2026-09-08');
    const { session } = adjustForDay(tue, { date: '2026-09-08', readinessBand: 'low', painAreas: [], painStreaks: {}, paces: null, bikeZones: null });
    expect(session.detail.kind === 'bike' && session.detail.focus).toBe('recovery');
  });

  it('leaves the schedule alone when the race template is switched off', () => {
    const week = buildWeek(triCtx(16, { useRaceTemplate: false }));
    expect(week.sessions.map((s) => s.sessionType)).toEqual(['strength_lower', 'strength_upper', 'run_quality', 'strength_light', 'mobility', 'run_easy', 'tennis']);
  });
});

describe('stability', () => {
  it('builds the same week every time, so repeated re-planning does not shrink it', () => {
    // The repo re-plans on every app open. It rebuilds from the template first and relies on
    // this: the rules must give the same answer from the same starting point.
    const context = () => triCtx(5, { acwr: 1.45, acwrLabel: 'caution' as const });
    const first = buildWeek(context());
    const second = buildWeek(context());
    expect(second.sessions.map((s) => s.targetMin)).toEqual(first.sessions.map((s) => s.targetMin));
    expect(second.sessions.map((s) => s.sessionType)).toEqual(first.sessions.map((s) => s.sessionType));
    // And every trim reason quotes the duration the session actually ended up with,
    // rather than a number from an earlier pass.
    const trims = second.changes.filter((c) => c.ruleId === 'acwr');
    expect(trims.length).toBeGreaterThan(0);
    for (const trim of trims) {
      const session = byDay(second.sessions, trim.date);
      if (session.detail.kind !== 'run' && session.detail.kind !== 'bike') continue;
      expect(trim.reason).toContain(`${session.targetMin} min`);
    }
  });
});

describe('swimming in the triathlon week', () => {
  const SWIM_WEEK = '2026-12-07'; // the Monday swimming starts
  const triRace = raceContext({ name: '70.3', type: 'ironman_70_3', date: addDays(SWIM_WEEK, 7 * 24), priority: 'A', goalTimeSec: null }, SWIM_WEEK);
  const swimCtx = (overrides: Partial<WeekContext> = {}) => ctx({ weekStart: SWIM_WEEK, today: SWIM_WEEK, race: triRace, weekIndex: 0, ...overrides });

  it('has no swims the week before', () => {
    const week = buildWeek(swimCtx({ weekStart: addDays(SWIM_WEEK, -7), today: addDays(SWIM_WEEK, -7) }));
    expect(week.sessions.map((s) => s.sessionType)).toEqual(['strength_lower', 'bike_quality', 'run_quality', 'strength_upper', 'mobility', 'bike_long', 'tennis']);
  });

  it('puts an endurance swim on Thursday and a technique swim on Friday from the start week', () => {
    const week = buildWeek(swimCtx());
    expect(week.sessions.map((s) => s.sessionType)).toEqual(['strength_lower', 'bike_quality', 'run_quality', 'swim_endurance', 'swim_technique', 'bike_long', 'tennis']);
    const thu = byDay(week.sessions, addDays(SWIM_WEEK, 3));
    expect(thu.detail).toMatchObject({ kind: 'swim', focus: 'endurance', totalM: 800 });
    expect(thu.targetMin).toBe(24);
    expect(byDay(week.sessions, addDays(SWIM_WEEK, 4)).detail).toMatchObject({ kind: 'swim', focus: 'technique', totalM: 800 });
  });

  it('makes the swims longer as the weeks go by, and keeps them under the daily cap', () => {
    const at = (weeks: number) => {
      const weekStart = addDays(SWIM_WEEK, weeks * 7);
      return byDay(buildWeek(swimCtx({ weekStart, today: weekStart })).sessions, addDays(weekStart, 3));
    };
    expect(at(4).targetMin).toBeGreaterThan(at(0).targetMin);
    const late = at(20);
    expect(late.targetMin).toBeLessThanOrEqual(50);
    expect(late.detail.kind === 'swim' && late.detail.totalM).toBeGreaterThanOrEqual(1600);
  });

  it('swaps a swim for mobility when a shoulder hurts, and leaves the ride alone', () => {
    const week = buildWeek(swimCtx({ painAreas: ['shoulder'] }));
    expect(byDay(week.sessions, addDays(SWIM_WEEK, 3)).sessionType).toBe('mobility');
    expect(byDay(week.sessions, addDays(SWIM_WEEK, 4)).sessionType).toBe('mobility');
    expect(byDay(week.sessions, addDays(SWIM_WEEK, 1)).sessionType).toBe('bike_quality');
    expect(week.changes.some((c) => c.reason.includes('Swim replaced with mobility because of shoulder pain'))).toBe(true);
  });

  it('keeps the swims when it is a knee that hurts', () => {
    const week = buildWeek(swimCtx({ painAreas: ['knee'] }));
    expect(byDay(week.sessions, addDays(SWIM_WEEK, 3)).sessionType).toBe('swim_endurance');
  });

  it('shortens the swims in a deload week and makes them technique swims', () => {
    const normal = byDay(buildWeek(swimCtx()).sessions, addDays(SWIM_WEEK, 3));
    const deload = byDay(buildWeek(swimCtx({ weekIndex: 3 })).sessions, addDays(SWIM_WEEK, 3));
    expect(deload.targetMin).toBeLessThan(normal.targetMin);
    expect(deload.detail).toMatchObject({ kind: 'swim', focus: 'technique' });
  });

  it('turns the endurance swim into a technique swim on a low-readiness day', () => {
    const thu = byDay(buildWeek(swimCtx()).sessions, addDays(SWIM_WEEK, 3));
    const day = { date: thu.date, readinessBand: 'low' as const, painAreas: [], painStreaks: {}, paces: null, bikeZones: null };
    const { session, changes } = adjustForDay(thu, day);
    expect(session.detail).toMatchObject({ kind: 'swim', focus: 'technique' });
    expect(session.targetMin).toBe(thu.targetMin);
    expect(changes[0].reason).toContain('Technique swim instead');

    const sore = adjustForDay(thu, { ...day, readinessBand: 'good' as const, painAreas: ['shoulder'] });
    expect(sore.session.sessionType).toBe('mobility');
  });
});
