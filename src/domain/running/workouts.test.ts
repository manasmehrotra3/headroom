import { trainingPaces } from './vdot';
import { buildEasyRun, buildQualityRun, compareRun, qualityFocusForWeek } from './workouts';

const paces = trainingPaces(38.6);

describe('run builders', () => {
  it('rotates the quality focus', () => {
    expect([0, 1, 2, 3].map(qualityFocusForWeek)).toEqual(['tempo', 'intervals', 'strides', 'tempo']);
  });

  it('builds a tempo run that fits the target time', () => {
    const run = buildQualityRun('tempo', 30, paces);
    expect(run.totalMin).toBeLessThanOrEqual(30);
    expect(run.steps[0].kind).toBe('warmup');
    expect(run.steps.at(-1)!.kind).toBe('cooldown');
    expect(run.steps.find((s) => s.kind === 'work')!.paceSecPerMile).toBe(paces.tempo);
    expect(run.summary).toContain('tempo');
  });

  it('builds intervals with one fewer recovery than work reps', () => {
    const run = buildQualityRun('intervals', 35, paces);
    const work = run.steps.find((s) => s.kind === 'work')!;
    const jog = run.steps.find((s) => s.kind === 'recovery')!;
    expect(work.reps).toBe(4);
    expect(jog.reps).toBe(3);
    expect(run.totalMin).toBeLessThanOrEqual(35);
  });

  it('builds strides and an easy run, with or without paces', () => {
    const strides = buildQualityRun('strides', 30, null);
    expect(strides.steps.some((s) => s.kind === 'stride')).toBe(true);
    expect(strides.steps[0].paceSecPerMile).toBeNull();
    const easy = buildEasyRun(32, paces, true);
    expect(easy.totalMin).toBe(30);
    expect(easy.steps.some((s) => s.kind === 'stride')).toBe(true);
    expect(easy.estimatedMiles).toBeGreaterThan(2.5);
  });
});

describe('compareRun', () => {
  it('describes planned vs actual', () => {
    const plan = buildEasyRun(30, paces, false);
    const c = compareRun(plan, { durationSec: 33 * 60, distanceM: 5500, avgHr: 150 });
    expect(c.actualMiles).toBeCloseTo(3.42, 1);
    expect(c.verdict).toContain('planned');
    expect(c.actualPaceSecPerMile).toBeCloseTo(579, 0);
  });

  it('copes with no distance', () => {
    const plan = buildEasyRun(30, null, false);
    const c = compareRun(plan, { durationSec: 1800, distanceM: null, avgHr: null });
    expect(c.actualMiles).toBeNull();
    expect(c.verdict).toContain('30 min');
  });
});
