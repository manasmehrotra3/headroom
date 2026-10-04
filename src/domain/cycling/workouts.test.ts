import { averageSpeedKmh, bikeFocusForWeek, bikeZones, buildBikeQuality, buildEasySpin, buildLongRide, zoneTarget } from './workouts';

const zones = bikeZones(190)!;

describe('bike zones', () => {
  it('sits below running max heart rate and rises through the zones', () => {
    expect(zones.maxHr).toBe(180);
    expect(zones.ranges.z2[0]).toBeLessThan(zones.ranges.z3[0]);
    expect(zones.ranges.z5[1]).toBe(180);
    expect(zones.ranges.z2).toEqual([122, 135]);
  });

  it('falls back to RPE when there is no max heart rate', () => {
    expect(bikeZones(null)).toBeNull();
    expect(zoneTarget('z2', null)).toContain('RPE');
    expect(zoneTarget('z2', zones)).toContain('bpm');
  });
});

describe('bike sessions', () => {
  it('rotates the weekday focus', () => {
    expect([0, 1, 2, 3].map(bikeFocusForWeek)).toEqual(['sweet_spot', 'threshold', 'vo2', 'sweet_spot']);
  });

  it('builds intervals that fit the time and have one fewer recovery than work reps', () => {
    const ride = buildBikeQuality('threshold', 45, true);
    const work = ride.steps.find((s) => s.kind === 'work')!;
    const rest = ride.steps.find((s) => s.kind === 'recovery')!;
    expect(work.zone).toBe('z4');
    expect(rest.reps).toBe((work.reps ?? 0) - 1);
    expect(ride.totalMin).toBeLessThanOrEqual(45);
    expect(ride.indoor).toBe(true);
    expect(ride.summary).toContain('threshold');
  });

  it('builds a long ride with a brick run and adds tempo once past base', () => {
    const base = buildLongRide(90, 10, false);
    expect(base.steps.some((s) => s.kind === 'work')).toBe(false);
    expect(base.brickRunMin).toBe(10);
    expect(base.summary).toContain('brick run');
    expect(base.indoor).toBe(false);

    const build = buildLongRide(150, 30, true);
    const tempo = build.steps.find((s) => s.kind === 'work')!;
    expect(tempo.zone).toBe('z3');
    expect(tempo.reps).toBe(3);
    expect(build.totalMin).toBeLessThanOrEqual(150);
  });

  it('builds an easy spin', () => {
    const spin = buildEasySpin(40);
    expect(spin.totalMin).toBe(40);
    expect(spin.steps[0].zone).toBe('z1');
  });
});

describe('averageSpeedKmh', () => {
  it('averages usable rides and ignores short ones', () => {
    const speed = averageSpeedKmh([
      { distanceM: 30000, durationSec: 3600 },
      { distanceM: 1000, durationSec: 300 },
      { distanceM: null, durationSec: 3600 },
    ]);
    expect(speed).toBeCloseTo(30, 5);
    expect(averageSpeedKmh([])).toBeNull();
  });
});
