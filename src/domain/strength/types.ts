import type { BodyArea } from '../bodyAreas';
import type { EquipmentId } from '../equipment';

export type ExerciseCategory = 'lower' | 'push' | 'pull' | 'core' | 'mobility';

/** primary = the big lift of the day; accessory sets get dropped first when time runs out. */
export type ExerciseTier = 'primary' | 'secondary' | 'accessory';

/** weight = log a load; bodyweight = reps only (or added weight); time = seconds held. */
export type LoadType = 'weight' | 'bodyweight' | 'time';

export type LoadFamily = 'machine' | 'dumbbell' | 'barbell' | 'cable' | 'kettlebell' | 'none';

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  /** Everything needed; the exercise is only offered when all of these are ticked. */
  needs: EquipmentId[];
  /** What to look for in the gym, e.g. "Leg press machine (plate-loaded or selectorized)". */
  station: string;
  muscles: string[];
  /** Body areas this exercise loads; reported pain in any of them removes it. */
  loads: BodyArea[];
  /** Heavy lower body work: never scheduled the day before a run. */
  heavyLower: boolean;
  tier: ExerciseTier;
  loadType: LoadType;
  family: LoadFamily;
  /** Smallest sensible weight jump, in lb (how the gym's plates and stacks are labelled). */
  incrementLb: number;
  /** Default rep range (or seconds for time-based). */
  reps: [number, number];
  restSec: number;
  setup: string;
  cues: string[];
  mistakes: string[];
  /** Other exercises hitting the same muscles, best first. */
  alternatives: string[];
  /** free-exercise-db id for the two bundled frames. */
  image: string;
}

/** One line of a workout template: which exercise, how many sets, what rep range. */
export interface TemplateSlot {
  exerciseId: string;
  sets: number;
  /** Overrides the exercise default when set. */
  reps?: [number, number];
  restSec?: number;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  slots: TemplateSlot[];
}

/** A concrete exercise in a planned/active workout after equipment and injury substitutions. */
export interface PlannedExercise {
  exercise: Exercise;
  sets: number;
  reps: [number, number];
  restSec: number;
  /** Why this exercise replaced the template's one, if it did. */
  swapReason?: string;
}

export interface LoggedSet {
  exerciseId: string;
  setIndex: number;
  weightKg: number;
  reps: number;
  /** CR-10 RPE. Reps-in-reserve entries are converted: RPE = 10 − RIR. */
  rpe: number;
}
