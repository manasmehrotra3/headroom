import { TUNABLES } from '../config/tunables';

/** Health Connect sleep stage codes. */
export const SLEEP_STAGE = { UNKNOWN: 0, AWAKE: 1, SLEEPING: 2, OUT_OF_BED: 3, LIGHT: 4, DEEP: 5, REM: 6 } as const;

export interface SleepNight {
  /** Epoch ms in bed / asleep. */
  startMs: number;
  endMs: number;
  stages: { start: number; end: number; stage: number }[];
}

export interface SleepComponent {
  /** Points scored out of `weight`. */
  points: number;
  weight: number;
  /** Human-readable detail, e.g. "7 h 10 min of 8 h target". */
  detail: string;
}

export interface SleepScore {
  score: number;
  durationMin: number;
  asleepMin: number;
  components: {
    duration: SleepComponent;
    efficiency: SleepComponent | null;
    stages: SleepComponent | null;
    consistency: SleepComponent | null;
  };
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function fmtMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Minutes in each stage from the stage segments; empty when no stage data. */
export function stageMinutes(night: SleepNight): Map<number, number> {
  const minutes = new Map<number, number>();
  for (const s of night.stages) {
    const min = Math.max(0, (s.end - s.start) / 60000);
    minutes.set(s.stage, (minutes.get(s.stage) ?? 0) + min);
  }
  return minutes;
}

/**
 * Sleep score 0–100, our own version of what Garmin shows.
 *
 *   duration    40 pts  asleep ÷ target, linear, full marks at the target
 *   efficiency  20 pts  asleep ÷ in bed; 90 %+ full, 60 % zero (needs stage data)
 *   stages      20 pts  (deep + REM) ÷ asleep; 40 %+ full (needs stage data)
 *   consistency 20 pts  bed and wake time drift vs your 7-day average; ≤30 min full, ≥120 min zero
 *
 * Components without data are dropped and the rest re-weighted, so a night with no stages
 * is scored from duration and consistency only.
 */
export function sleepScore(night: SleepNight, targetMin: number, baseline: { bedMinutes: number; wakeMinutes: number } | null): SleepScore {
  const t = TUNABLES.sleep;
  const inBedMin = (night.endMs - night.startMs) / 60000;
  const minutes = stageMinutes(night);
  const hasStages = night.stages.length > 0;

  const awakeMin = (minutes.get(SLEEP_STAGE.AWAKE) ?? 0) + (minutes.get(SLEEP_STAGE.OUT_OF_BED) ?? 0);
  const asleepMin = hasStages ? Math.max(0, inBedMin - awakeMin) : inBedMin;

  const durationRatio = clamp01(asleepMin / targetMin);
  const duration: SleepComponent = {
    points: Math.round(durationRatio * t.weights.duration),
    weight: t.weights.duration,
    detail: `${fmtMin(asleepMin)} asleep of ${fmtMin(targetMin)} target`,
  };

  let efficiency: SleepComponent | null = null;
  let stages: SleepComponent | null = null;
  if (hasStages && inBedMin > 0) {
    const eff = asleepMin / inBedMin;
    const effRatio = clamp01((eff - t.zeroEfficiency) / (t.fullEfficiency - t.zeroEfficiency));
    efficiency = { points: Math.round(effRatio * t.weights.efficiency), weight: t.weights.efficiency, detail: `${Math.round(eff * 100)}% of time in bed asleep` };

    const deepRem = (minutes.get(SLEEP_STAGE.DEEP) ?? 0) + (minutes.get(SLEEP_STAGE.REM) ?? 0);
    const hasDeepRem = minutes.has(SLEEP_STAGE.DEEP) || minutes.has(SLEEP_STAGE.REM) || minutes.has(SLEEP_STAGE.LIGHT);
    if (hasDeepRem && asleepMin > 0) {
      const share = deepRem / asleepMin;
      stages = {
        points: Math.round(clamp01(share / t.fullDeepRemShare) * t.weights.stages),
        weight: t.weights.stages,
        detail: `${Math.round(share * 100)}% deep + REM (${fmtMin(minutes.get(SLEEP_STAGE.DEEP) ?? 0)} deep, ${fmtMin(minutes.get(SLEEP_STAGE.REM) ?? 0)} REM)`,
      };
    }
  }

  let consistency: SleepComponent | null = null;
  if (baseline) {
    const bedDrift = circularDriftMin(minutesOfDay(night.startMs), baseline.bedMinutes);
    const wakeDrift = circularDriftMin(minutesOfDay(night.endMs), baseline.wakeMinutes);
    const drift = (bedDrift + wakeDrift) / 2;
    const ratio = 1 - clamp01((drift - t.consistencyFullMin) / (t.consistencyZeroMin - t.consistencyFullMin));
    consistency = {
      points: Math.round(ratio * t.weights.consistency),
      weight: t.weights.consistency,
      detail: `bedtime ${Math.round(bedDrift)} min and wake ${Math.round(wakeDrift)} min off your 7-day average`,
    };
  }

  const present = [duration, efficiency, stages, consistency].filter((c): c is SleepComponent => c !== null);
  const totalWeight = present.reduce((sum, c) => sum + c.weight, 0);
  const points = present.reduce((sum, c) => sum + c.points, 0);
  const score = totalWeight > 0 ? Math.round((points / totalWeight) * 100) : 0;

  return { score, durationMin: inBedMin, asleepMin, components: { duration, efficiency, stages, consistency } };
}

/** Local minutes after midnight of an epoch ms. */
export function minutesOfDay(ms: number): number {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
}

/** Difference between two times of day, allowing for midnight wrap (23:30 vs 00:30 = 60). */
export function circularDriftMin(a: number, b: number): number {
  const diff = Math.abs(a - b) % 1440;
  return Math.min(diff, 1440 - diff);
}

/**
 * Average bed and wake time over recent nights, as minutes after midnight. Bedtimes around
 * midnight are averaged on a circle so 23:30 and 00:30 give 00:00, not 12:00.
 */
export function sleepTimingBaseline(nights: Pick<SleepNight, 'startMs' | 'endMs'>[]): { bedMinutes: number; wakeMinutes: number } | null {
  if (nights.length === 0) return null;
  return { bedMinutes: circularMean(nights.map((n) => minutesOfDay(n.startMs))), wakeMinutes: circularMean(nights.map((n) => minutesOfDay(n.endMs))) };
}

function circularMean(minutes: number[]): number {
  const toRad = (m: number) => (m / 1440) * 2 * Math.PI;
  const x = minutes.reduce((s, m) => s + Math.cos(toRad(m)), 0);
  const y = minutes.reduce((s, m) => s + Math.sin(toRad(m)), 0);
  const angle = Math.atan2(y, x);
  return (((angle / (2 * Math.PI)) * 1440 + 1440) % 1440 + 0) % 1440;
}

/** The night's main sleep: the longest session ending on the given morning. */
export function pickMainSleep<T extends { startMs: number; endMs: number }>(sessions: T[]): T | null {
  const long = sessions.filter((s) => (s.endMs - s.startMs) / 60000 >= TUNABLES.sleep.minMainSleepMin);
  if (long.length === 0) return null;
  return long.reduce((best, s) => (s.endMs - s.startMs > best.endMs - best.startMs ? s : best));
}
