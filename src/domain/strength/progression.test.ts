import { getExercise } from '../../data/exercises';
import { lbToKg, kgToLb } from '../units';
import { estimatedOneRepMaxKg, rirToRpe, roundToStep, suggestWeight, totalVolumeKg } from './progression';
import type { LoggedSet } from './types';

const legPress = getExercise('leg_press'); // +10 lb steps
const curl = getExercise('dumbbell_curl'); // +2.5 lb steps

function session(weightLb: number, reps: number[], rpe = 8): { sets: LoggedSet[] } {
  return {
    sets: reps.map((r, i) => ({ exerciseId: 'x', setIndex: i, weightKg: lbToKg(weightLb), reps: r, rpe })),
  };
}

describe('suggestWeight', () => {
  it('suggests a starting weight with no history', () => {
    const s = suggestWeight(legPress, [8, 12], []);
    expect(s.kind).toBe('start');
    expect(kgToLb(s.weightKg!)).toBeCloseTo(40, 5);
  });

  it('adds one step when every set hits the top of the range at RPE ≤ 8', () => {
    const s = suggestWeight(legPress, [8, 12], [session(180, [12, 12, 12], 8)]);
    expect(s.kind).toBe('increase');
    expect(kgToLb(s.weightKg!)).toBeCloseTo(190, 5);
    expect(s.reason).toContain('+10 lb');
  });

  it('holds when the top of the range was hit but RPE was above 8', () => {
    const s = suggestWeight(legPress, [8, 12], [session(180, [12, 12, 12], 9)]);
    expect(s.kind).toBe('hold');
    expect(kgToLb(s.weightKg!)).toBeCloseTo(180, 5);
  });

  it('holds when only some sets reached the top', () => {
    const s = suggestWeight(legPress, [8, 12], [session(180, [12, 11, 10])]);
    expect(s.kind).toBe('hold');
  });

  it('holds after a single missed session', () => {
    const s = suggestWeight(legPress, [8, 12], [session(180, [8, 7, 6]), session(180, [10, 9, 8])]);
    expect(s.kind).toBe('hold');
    expect(s.reason).toContain('Missed 8 reps');
  });

  it('drops about 7.5% after two missed sessions in a row', () => {
    const s = suggestWeight(legPress, [8, 12], [session(200, [8, 7, 6]), session(200, [7, 7, 7])]);
    expect(s.kind).toBe('decrease');
    // 200 × 0.925 = 185 → rounded to the nearest 10 lb step = 190 (banker's-free Math.round of 18.5 → 19)
    expect(kgToLb(s.weightKg!)).toBeCloseTo(190, 5);
  });

  it('does not drop when the misses were not consecutive', () => {
    const s = suggestWeight(legPress, [8, 12], [session(200, [8, 7, 6]), session(200, [9, 9, 8]), session(200, [7, 7, 7])]);
    expect(s.kind).toBe('hold');
  });

  it('uses the smallest step for small dumbbell moves', () => {
    const s = suggestWeight(curl, [10, 15], [session(15, [15, 15])]);
    expect(kgToLb(s.weightKg!)).toBeCloseTo(17.5, 5);
  });

  it('has nothing to suggest for bodyweight or timed exercises', () => {
    expect(suggestWeight(getExercise('plank'), [30, 60], []).weightKg).toBeNull();
    expect(suggestWeight(getExercise('pushup'), [8, 20], [session(0, [20, 20])]).weightKg).toBeNull();
  });

  it('skips sessions where nothing was logged', () => {
    const s = suggestWeight(legPress, [8, 12], [{ sets: [] }, session(180, [12, 12, 12])]);
    expect(s.kind).toBe('increase');
  });
});

describe('helpers', () => {
  it('rounds to the lb step and returns kg', () => {
    expect(kgToLb(roundToStep(lbToKg(183), 10))).toBeCloseTo(180, 5);
    expect(kgToLb(roundToStep(lbToKg(16.3), 2.5))).toBeCloseTo(17.5, 5);
    expect(roundToStep(50, 0)).toBe(50);
  });

  it('converts RIR to RPE', () => {
    expect(rirToRpe(2)).toBe(8);
    expect(rirToRpe(0)).toBe(10);
  });

  it('sums volume and estimates a 1RM', () => {
    expect(totalVolumeKg(session(100, [10, 10]).sets)).toBeCloseTo(lbToKg(100) * 20, 5);
    expect(estimatedOneRepMaxKg({ weightKg: 100, reps: 10 })).toBeCloseTo(133.33, 2);
  });
});
