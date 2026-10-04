import { getExercise } from '../../data/exercises';
import { TUNABLES } from '../../config/tunables';
import { estimateRemainingSec, estimateSessionSec, secondsPerSet, suggestDrops, type RemainingWork } from './sessionTime';
import type { PlannedExercise } from './types';

const planned = (id: string, sets: number): PlannedExercise => {
  const exercise = getExercise(id);
  return { exercise, sets, reps: exercise.reps, restSec: exercise.restSec };
};

describe('time estimates', () => {
  it('counts reps and rest per set, or the hold for timed exercises', () => {
    expect(secondsPerSet(planned('leg_press', 3))).toBe(12 * 3 + 120);
    expect(secondsPerSet(planned('plank', 2))).toBe(60 + 45);
  });

  it('keeps the default lower-body template near the 45-minute target', () => {
    const lower = ['leg_press', 'dumbbell_rdl', 'split_squat', 'seated_leg_curl', 'standing_calf_raise', 'plank', 'dead_bug'];
    const sets = [3, 3, 2, 2, 2, 2, 2];
    const sec = estimateSessionSec(lower.map((id, i) => planned(id, sets[i])));
    expect(sec / 60).toBeGreaterThan(35);
    expect(sec / 60).toBeLessThanOrEqual(TUNABLES.schedule.dailyCapMin);
  });

  it('keeps the upper templates under the cap', () => {
    const upper = ['chest_press_machine', 'lat_pulldown', 'dumbbell_shoulder_press', 'seated_cable_row', 'triceps_pushdown', 'dumbbell_curl', 'face_pull'];
    const sets = [3, 3, 2, 2, 2, 2, 2];
    expect(estimateSessionSec(upper.map((id, i) => planned(id, sets[i]))) / 60).toBeLessThanOrEqual(TUNABLES.schedule.dailyCapMin);
    const light = ['incline_dumbbell_press', 'one_arm_dumbbell_row', 'lateral_raise', 'straight_arm_pulldown', 'single_leg_glute_bridge', 'cable_crunch', 'lying_leg_raise', 'band_pull_apart'];
    const lightSets = [3, 3, 2, 2, 2, 2, 2, 2];
    expect(estimateSessionSec(light.map((id, i) => planned(id, lightSets[i]))) / 60).toBeLessThanOrEqual(TUNABLES.schedule.dailyCapMin);
  });
});

describe('suggestDrops', () => {
  const remaining: RemainingWork[] = [
    { exerciseId: 'a', name: 'Leg press', tier: 'primary', setsLeft: 2, secPerSet: 156 },
    { exerciseId: 'b', name: 'Leg curl', tier: 'secondary', setsLeft: 2, secPerSet: 105 },
    { exerciseId: 'c', name: 'Calf raise', tier: 'accessory', setsLeft: 2, secPerSet: 105 },
    { exerciseId: 'd', name: 'Plank', tier: 'accessory', setsLeft: 2, secPerSet: 105 },
  ];

  it('suggests nothing when the session fits', () => {
    expect(suggestDrops(remaining, 0, 60 * 60)).toEqual([]);
  });

  it('drops accessory sets first, from the end of the session', () => {
    const total = estimateRemainingSec(remaining);
    const drops = suggestDrops(remaining, 0, total - 150);
    expect(drops.map((d) => d.exerciseId)).toEqual(['d', 'c']);
    expect(drops.every((d) => d.setsToDrop === 1)).toBe(true);
  });

  it('touches primaries only after accessories and secondaries are down to one set', () => {
    const total = estimateRemainingSec(remaining);
    const drops = suggestDrops(remaining, 0, total - 450);
    const byId = Object.fromEntries(drops.map((d) => [d.exerciseId, d.setsToDrop]));
    expect(byId.d).toBe(1);
    expect(byId.c).toBe(1);
    expect(byId.b).toBe(1);
    expect(byId.a).toBe(1);
  });

  it('removes whole accessories when trimming one set each is not enough', () => {
    const total = estimateRemainingSec(remaining);
    const drops = suggestDrops(remaining, 0, total - 900);
    const byId = Object.fromEntries(drops.map((d) => [d.exerciseId, d.setsToDrop]));
    expect(byId.d).toBe(2);
    expect(byId.c).toBe(2);
    expect(byId.a).toBeLessThanOrEqual(1);
  });
});
