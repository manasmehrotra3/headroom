/**
 * Default strength sessions for each strength day. The workout builder swaps exercises
 * for alternatives when equipment is missing or an area hurts, and the plan engine
 * trims sets for easy / deload variants.
 *
 * Each session is designed to finish in about 40–45 minutes including the warmup.
 */
import type { SessionType } from '@/domain/schedule';
import type { WorkoutTemplate } from '@/domain/strength/types';

export const WORKOUT_TEMPLATES: Record<string, WorkoutTemplate> = {
  /** Monday: heaviest leg day of the week + core. */
  lower_core: {
    id: 'lower_core',
    name: 'Lower body + core',
    slots: [
      { exerciseId: 'leg_press', sets: 3 },
      { exerciseId: 'dumbbell_rdl', sets: 3 },
      { exerciseId: 'split_squat', sets: 2 },
      { exerciseId: 'seated_leg_curl', sets: 2 },
      { exerciseId: 'standing_calf_raise', sets: 2 },
      { exerciseId: 'plank', sets: 2 },
      { exerciseId: 'dead_bug', sets: 2 },
    ],
  },

  /** Tuesday: upper body, push and pull balanced. */
  upper: {
    id: 'upper',
    name: 'Upper body',
    slots: [
      { exerciseId: 'chest_press_machine', sets: 3 },
      { exerciseId: 'lat_pulldown', sets: 3 },
      { exerciseId: 'dumbbell_shoulder_press', sets: 2 },
      { exerciseId: 'seated_cable_row', sets: 2 },
      { exerciseId: 'triceps_pushdown', sets: 2 },
      { exerciseId: 'dumbbell_curl', sets: 2 },
      { exerciseId: 'face_pull', sets: 2 },
    ],
  },

  /** Thursday: upper / core / light full body. No heavy legs (Saturday is a run). */
  upper_light: {
    id: 'upper_light',
    name: 'Upper, core & light full body',
    slots: [
      { exerciseId: 'incline_dumbbell_press', sets: 3 },
      { exerciseId: 'one_arm_dumbbell_row', sets: 3 },
      { exerciseId: 'lateral_raise', sets: 2 },
      { exerciseId: 'straight_arm_pulldown', sets: 2 },
      { exerciseId: 'single_leg_glute_bridge', sets: 2 },
      { exerciseId: 'cable_crunch', sets: 2 },
      { exerciseId: 'lying_leg_raise', sets: 2 },
      { exerciseId: 'band_pull_apart', sets: 2 },
    ],
  },

  /** Wednesday add-on after the quality run, only when it fits under the cap. ~10 min. */
  run_addon: {
    id: 'run_addon',
    name: 'Post-run core & hips',
    slots: [
      { exerciseId: 'pallof_press', sets: 2 },
      { exerciseId: 'side_plank', sets: 2 },
      { exerciseId: 'single_leg_glute_bridge', sets: 2 },
      { exerciseId: 'monster_walk', sets: 2 },
    ],
  },

  /** Friday: 15 minutes of mobility. */
  mobility: {
    id: 'mobility',
    name: 'Mobility',
    slots: [
      { exerciseId: 'cat_cow', sets: 1, reps: [10, 10] },
      { exerciseId: 'worlds_greatest_stretch', sets: 1, reps: [6, 6] },
      { exerciseId: 'hip_flexor_stretch', sets: 2 },
      { exerciseId: 'hamstring_stretch', sets: 2 },
      { exerciseId: 'calf_stretch', sets: 2 },
      { exerciseId: 'glute_stretch', sets: 2 },
      { exerciseId: 'adductor_stretch', sets: 1 },
      { exerciseId: 'neck_stretch', sets: 1 },
    ],
  },
};

/** Which template each session type uses; runs and tennis have none. */
export const TEMPLATE_FOR_SESSION: Partial<Record<SessionType, string>> = {
  strength_lower: 'lower_core',
  strength_upper: 'upper',
  strength_light: 'upper_light',
  mobility: 'mobility',
};
