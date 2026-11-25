import { TUNABLES } from '../../config/tunables';
import { addDays } from '../dates';
import { buildSwim, swimDistanceForWeek, swimDistanceM, swimMinutes, swimTargetMin, swimWeek, swimmingStarted } from './workouts';

const START = TUNABLES.swim.startDate;

describe('when swimming starts', () => {
  it('starts on a Monday in the second week of December', () => {
    expect(START).toBe('2026-12-07');
    expect(new Date(2026, 11, 7).getDay()).toBe(1);
  });

  it('is off the week before and on from the start week', () => {
    expect(swimmingStarted(addDays(START, -7))).toBe(false);
    expect(swimmingStarted(START)).toBe(true);
    expect(swimmingStarted(addDays(START, 70))).toBe(true);
  });

  it('counts weeks from the start, never below zero', () => {
    expect(swimWeek(addDays(START, -14))).toBe(0);
    expect(swimWeek(START)).toBe(0);
    expect(swimWeek(addDays(START, 7))).toBe(1);
    expect(swimWeek(addDays(START, 28))).toBe(4);
  });
});

describe('progression', () => {
  it('starts both sessions at 800 m', () => {
    expect(swimDistanceForWeek('technique', 0)).toBe(800);
    expect(swimDistanceForWeek('endurance', 0)).toBe(800);
  });

  it('never shrinks, and grows by no more than about 10% a week', () => {
    for (const focus of ['technique', 'endurance'] as const) {
      for (let week = 1; week < 30; week++) {
        const before = swimDistanceForWeek(focus, week - 1);
        const now = swimDistanceForWeek(focus, week);
        expect(now).toBeGreaterThanOrEqual(before);
        expect(now - before).toBeLessThanOrEqual(before * 0.1 + 100);
        expect(now % 100).toBe(0);
      }
    }
  });

  it('levels off at the maximum, with the endurance swim past the 70.3 distance', () => {
    expect(swimDistanceForWeek('technique', 40)).toBe(1200);
    expect(swimDistanceForWeek('endurance', 40)).toBe(2200);
    expect(swimDistanceForWeek('endurance', 40)).toBeGreaterThan(1900);
  });

  it('turns metres into minutes and back without drifting', () => {
    for (let distance = 400; distance <= 2200; distance += 100) expect(swimDistanceM(swimMinutes(distance))).toBe(distance);
    expect(swimMinutes(800)).toBe(24);
    expect(swimTargetMin('endurance', START)).toBe(24);
  });

  it('never plans less than the shortest worthwhile swim', () => {
    expect(swimDistanceM(5)).toBe(400);
  });
});

describe('buildSwim', () => {
  it('writes the first endurance swim as short repeats with rest, for someone starting out', () => {
    const plan = buildSwim('endurance', swimMinutes(800));
    expect(plan.totalM).toBe(800);
    expect(plan.title).toBe('Endurance swim · 800 m');
    expect(plan.steps.map((s) => [s.kind, s.reps, s.distanceM])).toEqual([
      ['warmup', 4, 50],
      ['main', 10, 50],
      ['cooldown', 2, 50],
    ]);
    expect(plan.summary).toBe('4 × 50 m warm-up · 10 × 50 m steady, 30 s rest · 2 × 50 m easy');
  });

  it('makes the repeats longer as the swim gets longer', () => {
    const repeat = (distance: number) => buildSwim('endurance', swimMinutes(distance)).steps.find((s) => s.kind === 'main')!.distanceM;
    expect(repeat(800)).toBe(50);
    expect(repeat(1200)).toBe(100);
    expect(repeat(1700)).toBe(200);
    expect(repeat(2200)).toBe(400);
  });

  it('splits a technique swim between drills and smooth swimming', () => {
    const plan = buildSwim('technique', swimMinutes(800));
    expect(plan.totalM).toBe(800);
    expect(plan.steps.map((s) => [s.kind, s.reps, s.distanceM])).toEqual([
      ['warmup', 4, 50],
      ['drill', 6, 50],
      ['main', 4, 50],
      ['cooldown', 2, 50],
    ]);
    expect(plan.steps[1].note).toContain('catch-up');
  });

  it('adds up to about the distance asked for, in whole pool lengths, at every size', () => {
    for (const focus of ['technique', 'endurance'] as const) {
      for (let distance = 400; distance <= 2200; distance += 100) {
        const plan = buildSwim(focus, swimMinutes(distance));
        expect(plan.kind).toBe('swim');
        expect(plan.steps.reduce((sum, s) => sum + s.reps * s.distanceM, 0)).toBe(plan.totalM);
        expect(Math.abs(plan.totalM - distance)).toBeLessThanOrEqual(200);
        for (const step of plan.steps) {
          expect(step.reps).toBeGreaterThanOrEqual(1);
          expect(step.distanceM % TUNABLES.swim.poolLengthM).toBe(0);
        }
      }
    }
  });
});
