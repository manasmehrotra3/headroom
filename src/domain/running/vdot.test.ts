import { formatPace } from '../units';
import { paceForFraction, predictedRaceSec, reestimateVdot, riegel, trainingPaces, vdotFromEasyPace, vdotFromRace } from './vdot';

describe('vdot', () => {
  it('matches Daniels tables for a 25:00 5K (VDOT ≈ 38–39)', () => {
    const vdot = vdotFromRace(5000, 25 * 60);
    expect(vdot).toBeGreaterThan(38);
    expect(vdot).toBeLessThan(39.5);
  });

  it('gives sensible training paces for VDOT 38.6', () => {
    const paces = trainingPaces(38.6);
    // Daniels: E ~9:40–10:20, T ~8:25, I ~7:45, R ~7:15 per mile.
    expect(formatPace(paces.easy)).toMatch(/^(9|10):/);
    expect(paces.tempo).toBeGreaterThan(8 * 60);
    expect(paces.tempo).toBeLessThan(8 * 60 + 50);
    expect(paces.interval).toBeLessThan(paces.tempo);
    expect(paces.repetition).toBeLessThan(paces.interval);
  });

  it('round-trips a race prediction', () => {
    const vdot = vdotFromRace(5000, 25 * 60);
    expect(predictedRaceSec(vdot, 5000)).toBeCloseTo(25 * 60, -1);
    expect(predictedRaceSec(vdot, 10000) / 60).toBeGreaterThan(51);
  });

  it('inverts an easy pace', () => {
    const vdot = vdotFromEasyPace(10 * 60);
    expect(paceForFraction(vdot, 0.68)).toBeCloseTo(600, 3);
  });

  it('applies Riegel', () => {
    expect(riegel(25 * 60, 5000, 10000) / 60).toBeCloseTo(52.1, 0);
  });
});

describe('reestimateVdot', () => {
  const easy = { distanceM: 6000, durationSec: 40 * 60, avgHr: 145 };
  const hard = { distanceM: 5000, durationSec: 24 * 60, avgHr: 178 };

  it('returns null with no usable runs', () => {
    expect(reestimateVdot(38, [{ distanceM: 1000, durationSec: 300, avgHr: 150 }], 55, 190)).toBeNull();
  });

  it('is not dragged down by easy runs thanks to the HR correction', () => {
    const result = reestimateVdot(null, [easy, easy, hard], 55, 190)!;
    expect(result.vdot).toBeGreaterThan(36);
  });

  it('moves at most one VDOT per update', () => {
    const up = reestimateVdot(30, [hard, hard], 55, 190)!;
    expect(up.vdot).toBe(31);
    const down = reestimateVdot(50, [easy], 55, 190)!;
    expect(down.vdot).toBe(49);
  });
});
