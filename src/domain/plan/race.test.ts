import { addDays } from '../dates';
import { DEFAULT_SCHEDULE } from '../schedule';
import {
  brickRunMin,
  estimateRaceTime,
  longSessionMin,
  nextRace,
  racePhase,
  raceReadiness,
  raceWeekSchedule,
  raceContext,
  weekendCapMin,
  weeksToRace,
  type Race,
} from './race';

const TODAY = '2026-09-11';
const race = (over: Partial<Race> = {}): Race => ({ name: 'Test', type: 'ironman_70_3', date: addDays(TODAY, 7 * 20), priority: 'A', goalTimeSec: null, ...over });

describe('phases', () => {
  it('counts backwards from race day for a 70.3 (2 taper, 4 peak, 6 build)', () => {
    expect(racePhase(20, 'ironman_70_3')).toBe('base');
    expect(racePhase(12, 'ironman_70_3')).toBe('build');
    expect(racePhase(6, 'ironman_70_3')).toBe('peak');
    expect(racePhase(2, 'ironman_70_3')).toBe('taper');
    expect(racePhase(0.5, 'ironman_70_3')).toBe('race_week');
    expect(racePhase(-1, 'ironman_70_3')).toBe('off_season');
  });

  it('uses a shorter runway for a half marathon', () => {
    expect(racePhase(11, 'half_marathon')).toBe('base');
    expect(racePhase(9, 'half_marathon')).toBe('build');
    expect(racePhase(4, 'half_marathon')).toBe('peak');
    expect(racePhase(2, 'half_marathon')).toBe('taper');
  });

  it('measures weeks to race', () => {
    expect(weeksToRace({ date: addDays(TODAY, 70) }, TODAY)).toBe(10);
    expect(weeksToRace({ date: addDays(TODAY, -7) }, TODAY)).toBe(-1);
  });
});

describe('long session progression', () => {
  it('ramps the long ride toward what the race needs, then tapers', () => {
    const far = longSessionMin('bike', 20, 'ironman_70_3');
    const mid = longSessionMin('bike', 8, 'ironman_70_3');
    const peak = longSessionMin('bike', 3, 'ironman_70_3');
    expect(far).toBe(60);
    expect(mid).toBeGreaterThan(far);
    expect(peak).toBeGreaterThan(mid);
    expect(peak).toBeLessThanOrEqual(210);
    // Taper and race week come back down.
    expect(longSessionMin('bike', 1.5, 'ironman_70_3')).toBeLessThan(peak);
    expect(longSessionMin('bike', 0.5, 'ironman_70_3')).toBeLessThan(longSessionMin('bike', 1.5, 'ironman_70_3'));
  });

  it('never asks for a ride longer than the ceiling', () => {
    expect(longSessionMin('bike', 2.5, 'ironman_70_3')).toBeLessThanOrEqual(240);
  });

  it('has no long ride for a running race', () => {
    expect(longSessionMin('bike', 8, 'half_marathon')).toBe(0);
    expect(longSessionMin('run', 4, 'half_marathon')).toBeGreaterThan(60);
  });

  it('grows the brick run through the phases, only for triathlons', () => {
    expect(brickRunMin('base', 'ironman_70_3')).toBe(10);
    expect(brickRunMin('peak', 'ironman_70_3')).toBe(30);
    expect(brickRunMin('peak', 'half_marathon')).toBe(0);
  });

  it('gives the weekend enough room for the long session plus a buffer', () => {
    expect(weekendCapMin(60)).toBe(120);
    expect(weekendCapMin(180)).toBe(210);
    expect(weekendCapMin(230)).toBe(240);
  });
});

describe('weekly template', () => {
  it('switches to the triathlon week for a 70.3, keeping tennis on Sunday', () => {
    const week = raceWeekSchedule('ironman_70_3', DEFAULT_SCHEDULE);
    expect(week.tue).toBe('bike_quality');
    expect(week.sat).toBe('bike_long');
    expect(week.sun).toBe('tennis');
    expect(Object.values(week).filter((t) => t.startsWith('strength'))).toHaveLength(2);
  });

  it('adds two swims to the triathlon week from the week swimming starts', () => {
    expect(Object.values(raceWeekSchedule('ironman_70_3', DEFAULT_SCHEDULE, '2026-11-30')).some((t) => t.startsWith('swim'))).toBe(false);

    const week = raceWeekSchedule('ironman_70_3', DEFAULT_SCHEDULE, '2026-12-07');
    expect(week).toEqual({ mon: 'strength_lower', tue: 'bike_quality', wed: 'run_quality', thu: 'swim_endurance', fri: 'swim_technique', sat: 'bike_long', sun: 'tennis' });
    expect(raceWeekSchedule('ironman_70_3', DEFAULT_SCHEDULE, '2027-03-01').thu).toBe('swim_endurance');
  });

  it('leaves a running race week without swims whatever the date', () => {
    expect(Object.values(raceWeekSchedule('half_marathon', DEFAULT_SCHEDULE, '2026-12-07')).some((t) => t.startsWith('swim'))).toBe(false);
  });

  it('promotes the weekend easy run to a long run for a running race', () => {
    const week = raceWeekSchedule('half_marathon', DEFAULT_SCHEDULE);
    expect(week.sat).toBe('run_long');
    expect(week.mon).toBe(DEFAULT_SCHEDULE.mon);
    expect(week.wed).toBe('run_quality');
  });
});

describe('race context and readiness', () => {
  it('bundles phase and targets together', () => {
    const ctx = raceContext(race({ date: addDays(TODAY, 7 * 4) }), TODAY);
    expect(ctx.phase).toBe('peak');
    expect(ctx.longRideMin).toBeGreaterThan(150);
    expect(ctx.brickRunMin).toBe(30);
  });

  it('picks the next A race, ignoring past races', () => {
    const past = race({ date: addDays(TODAY, -7), name: 'Old' });
    const b = race({ date: addDays(TODAY, 14), priority: 'B', name: 'B race' });
    const a = race({ date: addDays(TODAY, 60), name: 'A race' });
    expect(nextRace([past, b, a], TODAY)?.name).toBe('A race');
    expect(nextRace([past], TODAY)).toBeNull();
    expect(nextRace([b], TODAY)?.name).toBe('B race');
  });

  it('is honest about gaps in preparation', () => {
    const ctx = raceContext(race(), TODAY);
    const gaps = raceReadiness(ctx, { rideMin: 45, runMin: 40 });
    expect(gaps.some((g) => !g.ok && g.message.includes('bike leg'))).toBe(true);
    expect(gaps.some((g) => !g.ok && g.message.includes('No swims recorded yet'))).toBe(true);
    const ready = raceReadiness(ctx, { rideMin: 200, runMin: 100 });
    expect(ready.slice(0, 2).every((g) => g.ok)).toBe(true);
  });

  it('judges the swim leg by the longest swim recorded', () => {
    const ctx = raceContext(race(), TODAY);
    const swim = (swimM: number) => raceReadiness(ctx, { rideMin: 200, runMin: 100, swimM })[2];
    expect(swim(800)).toMatchObject({ ok: false, message: expect.stringContaining('Longest swim so far is 800 m') });
    expect(swim(1500)).toMatchObject({ ok: true, message: expect.stringContaining('open-water practice') });
    // A running race has no swim line at all.
    expect(raceReadiness(raceContext(race({ type: 'half_marathon' }), TODAY), { rideMin: 0, runMin: 100 })).toHaveLength(1);
  });
});

describe('race time estimate', () => {
  it('predicts a running race from VDOT', () => {
    const est = estimateRaceTime('half_marathon', { vdot: 44, bikeSpeedKmh: null, swimPaceSecPer100m: null });
    expect(est.totalSec).toBeGreaterThan(90 * 60);
    expect(est.totalSec).toBeLessThan(120 * 60);
  });

  it('adds up the three legs of a 70.3 and says what it assumed', () => {
    const est = estimateRaceTime('ironman_70_3', { vdot: 44, bikeSpeedKmh: 28, swimPaceSecPer100m: 120 });
    expect(est.splits.map((s) => s.label)).toEqual(['Swim', 'Bike', 'Run', 'Transitions']);
    // 90 km at 28 km/h ≈ 3h13
    expect(est.splits[1].sec).toBeCloseTo((90 / 28) * 3600, -1);
    expect(est.totalSec).toBeGreaterThan(5 * 3600);
    expect(est.caveats).toEqual([]);
  });

  it('leaves the total blank and explains why when data is missing', () => {
    const est = estimateRaceTime('ironman_70_3', { vdot: null, bikeSpeedKmh: null, swimPaceSecPer100m: null });
    expect(est.totalSec).toBeNull();
    expect(est.caveats.length).toBe(3);
  });
});
