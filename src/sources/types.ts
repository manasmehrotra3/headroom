import type { ActivityType } from '@/db/schema';
import type { DateKey } from '@/domain/dates';

/** Everything a data source can hand back for a time range. Epoch ms throughout. */
export interface SourceActivity {
  externalId: string;
  type: ActivityType;
  title: string;
  startMs: number;
  endMs: number;
  distanceM: number | null;
  avgHr: number | null;
  maxHr: number | null;
  activeKcal: number | null;
}

export interface SourceSleep {
  externalId: string;
  startMs: number;
  endMs: number;
  stages: { start: number; end: number; stage: number }[];
}

export interface SourceDaily {
  date: DateKey;
  restingHr: number | null;
  hrvRmssd: number | null;
  steps: number | null;
  activeKcal: number | null;
  vo2Max: number | null;
}

export interface SourceWeight {
  externalId: string;
  ms: number;
  kg: number;
}

export interface SourceData {
  activities: SourceActivity[];
  sleep: SourceSleep[];
  daily: SourceDaily[];
  weights: SourceWeight[];
}

/**
 * A place activity and recovery data comes from. Health Connect (Android) and Apple Health (iOS) are the real ones; the mock
 * source generates believable data so every screen works on an emulator. (A Strava source
 * would implement this too, if that phase is ever built.)
 */
export interface ActivitySource {
  id: 'health_connect' | 'apple_health' | 'mock';
  read(fromMs: number, toMs: number): Promise<SourceData>;
}
