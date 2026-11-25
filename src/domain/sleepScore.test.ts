import { circularDriftMin, pickMainSleep, SLEEP_STAGE, sleepScore, sleepTimingBaseline, type SleepNight } from './sleepScore';

const at = (h: number, m = 0, day = 10) => new Date(2026, 8, day, h, m).getTime();

function night(startMs: number, endMs: number, stageSpec: [number, number][] = []): SleepNight {
  // stageSpec: [stage, minutes] laid end to end from the start.
  let cursor = startMs;
  const stages = stageSpec.map(([stage, minutes]) => {
    const s = { start: cursor, end: cursor + minutes * 60000, stage };
    cursor = s.end;
    return s;
  });
  return { startMs, endMs, stages };
}

describe('sleepScore', () => {
  it('scores a perfect night 100', () => {
    // 8 h in bed, 30 min awake, plenty of deep + REM, times on the baseline.
    const n = night(at(23, 0, 9), at(7, 30), [
      [SLEEP_STAGE.LIGHT, 200],
      [SLEEP_STAGE.DEEP, 100],
      [SLEEP_STAGE.REM, 120],
      [SLEEP_STAGE.AWAKE, 30],
      [SLEEP_STAGE.LIGHT, 60],
    ]);
    const s = sleepScore(n, 480, { bedMinutes: 23 * 60, wakeMinutes: 7 * 60 + 30 });
    expect(s.asleepMin).toBe(480);
    expect(s.components.duration.points).toBe(40);
    expect(s.components.efficiency!.points).toBe(20);
    expect(s.components.stages!.points).toBe(20);
    expect(s.components.consistency!.points).toBe(20);
    expect(s.score).toBe(100);
  });

  it('shows the source’s own score when it sent one, keeping ours beside it', () => {
    const n = night(at(23, 0, 9), at(5, 0)); // 6 h, no stages: ours scores 75
    const ours = sleepScore(n, 480, null);
    expect(ours.score).toBe(75);
    expect(ours.scoreSource).toBe('headroom');
    expect(ours.computedScore).toBe(75);

    const garmin = sleepScore(n, 480, null, 64);
    expect(garmin.score).toBe(64);
    expect(garmin.scoreSource).toBe('garmin');
    expect(garmin.computedScore).toBe(75);
    // The breakdown stays ours, so the screen can still explain the night.
    expect(garmin.components.duration.points).toBe(ours.components.duration.points);
  });

  it('falls back to our own score when the source sent nothing usable', () => {
    const n = night(at(23, 0, 9), at(5, 0));
    for (const provided of [null, Number.NaN, Number.POSITIVE_INFINITY]) {
      const s = sleepScore(n, 480, null, provided);
      expect(s.score).toBe(75);
      expect(s.scoreSource).toBe('headroom');
    }
  });

  it('re-weights when there are no stages or baseline', () => {
    const n = night(at(23, 0, 9), at(5, 0)); // 6 h, no stages
    const s = sleepScore(n, 480, null);
    expect(s.components.efficiency).toBeNull();
    expect(s.components.stages).toBeNull();
    expect(s.components.consistency).toBeNull();
    expect(s.score).toBe(75); // 6/8 of the only component
  });

  it('penalises drift in bed and wake time', () => {
    const n = night(at(1, 0), at(9, 0));
    const onTime = sleepScore(n, 480, { bedMinutes: 60, wakeMinutes: 540 });
    const late = sleepScore(n, 480, { bedMinutes: 23 * 60, wakeMinutes: 7 * 60 });
    expect(onTime.components.consistency!.points).toBe(20);
    expect(late.components.consistency!.points).toBe(0);
  });

  it('counts awake time against efficiency', () => {
    const n = night(at(23, 0, 9), at(7, 0), [
      [SLEEP_STAGE.LIGHT, 300],
      [SLEEP_STAGE.AWAKE, 120],
      [SLEEP_STAGE.LIGHT, 60],
    ]);
    const s = sleepScore(n, 480, null);
    expect(s.asleepMin).toBe(360);
    expect(s.components.efficiency!.points).toBe(10); // 75 % → halfway between 60 and 90
    expect(s.components.stages!.points).toBe(0);
  });
});

describe('timing helpers', () => {
  it('measures drift across midnight', () => {
    expect(circularDriftMin(23 * 60 + 30, 30)).toBe(60);
    expect(circularDriftMin(60, 60)).toBe(0);
  });

  it('averages bedtimes on a circle', () => {
    const b = sleepTimingBaseline([
      { startMs: at(23, 30, 9), endMs: at(7, 0) },
      { startMs: at(0, 30), endMs: at(8, 0) },
    ]);
    expect(Math.round(b!.bedMinutes)).toBe(0);
    expect(Math.round(b!.wakeMinutes)).toBe(450);
    expect(sleepTimingBaseline([])).toBeNull();
  });

  it('picks the longest session as the main sleep and ignores naps', () => {
    const nap = { startMs: at(14), endMs: at(14, 40) };
    const main = { startMs: at(23, 0, 9), endMs: at(6, 30) };
    expect(pickMainSleep([nap, main])).toBe(main);
    expect(pickMainSleep([nap])).toBeNull();
  });
});
