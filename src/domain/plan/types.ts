import type { BodyArea } from '../bodyAreas';
import type { BikePlan, BikeZones } from '../cycling/workouts';
import type { DateKey } from '../dates';
import type { AcwrLabel } from '../load';
import type { ReadinessBand } from '../readiness';
import type { Paces } from '../running/vdot';
import type { RunPlan } from '../running/workouts';
import type { SessionType, WeekSchedule } from '../schedule';
import type { Variant } from '../strength/workoutBuilder';
import type { SwimPlan } from '../swimming/workouts';
import type { RaceContext } from './race';

export type SessionStatus = 'planned' | 'done' | 'skipped' | 'sick' | 'travel' | 'dropped';

export type SessionDetail =
  | RunPlan
  | BikePlan
  | SwimPlan
  | { kind: 'strength'; templateId: string }
  | { kind: 'mobility'; templateId: string }
  | { kind: 'tennis' }
  | { kind: 'rest' };

export interface PlannedSession {
  /** Database id once stored; undefined while being built. */
  id?: number;
  date: DateKey;
  weekStart: DateKey;
  sessionType: SessionType;
  status: SessionStatus;
  variant: Variant;
  targetMin: number;
  detail: SessionDetail;
  reason: string;
  movedFrom: DateKey | null;
  addOn: boolean;
}

export interface PlanChange {
  ruleId: string;
  date: DateKey;
  reason: string;
}

/** The bits of context the week builder needs to fill in a session's detail. */
export interface DetailContext {
  weekIndex: number;
  paces: Paces | null;
  bikeZones: BikeZones | null;
  race: RaceContext | null;
}

/** Everything the weekly rules look at. Gathered by the repo layer, consumed by pure functions. */
export interface WeekContext extends DetailContext {
  weekStart: DateKey;
  today: DateKey;
  schedule: WeekSchedule;
  /** Whether the race, if any, is allowed to reshape the weekly template. */
  useRaceTemplate: boolean;
  /** Weeks since the plan started; deload every 4th. */
  weekIndex: number;
  /** Actual running and riding minutes last week (0 if none). */
  lastWeekRunMin: number;
  lastWeekBikeMin: number;
  /** Whether last week included a quality (intensity) run that was done. */
  lastWeekHadQuality: boolean;
  /** Planned minutes carried from last week, so volume grows gradually. */
  lastWeekPlanned: { quality: number; easy: number } | null;
  acwr: number | null;
  acwrLabel: AcwrLabel;
  /** Low-readiness days in the recent window. */
  lowReadinessDays: number;
  /** Sunday tennis just before this week, if any. */
  lastTennis: { durationMin: number; rpe: number | null } | null;
  /** Injuries from the profile plus pain reported in the last 3 days. */
  painAreas: BodyArea[];
  /** Consecutive days each painful area has been reported. */
  painStreaks: Partial<Record<BodyArea, number>>;
}

/** What the day-of adjustment looks at. */
export interface DayContext {
  date: DateKey;
  readinessBand: ReadinessBand;
  painAreas: BodyArea[];
  painStreaks: Partial<Record<BodyArea, number>>;
  paces: Paces | null;
  bikeZones: BikeZones | null;
}

export interface RuleResult {
  sessions: PlannedSession[];
  changes: PlanChange[];
}
