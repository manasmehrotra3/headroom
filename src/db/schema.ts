/**
 * Database tables (SQLite via Drizzle). All values are SI units.
 *
 * Changing this file? Run `npm run db:generate` to create a migration; the app applies
 * it on the next launch, so your existing data is kept.
 *
 * Relative imports only: drizzle-kit reads this file outside of Metro.
 */
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import type { BodyArea } from '../domain/bodyAreas';
import { WEEKDAYS } from '../domain/dates';
import type { Injury } from '../domain/profile';
import { SESSION_TYPE_IDS } from '../domain/schedule';

// ───────────────────────────── profile & settings ─────────────────────────────

/** Single row (id = 1). */
export const profile = sqliteTable('profile', {
  id: integer('id').primaryKey(),
  /** First name for the greeting on Today; empty string when not given. */
  name: text('name').notNull().default(''),
  sex: text('sex', { enum: ['male', 'female'] }).notNull(),
  birthYear: integer('birth_year').notNull(),
  heightCm: real('height_cm').notNull(),
  startWeightKg: real('start_weight_kg').notNull(),
  goalWeightKg: real('goal_weight_kg').notNull(),
  dailyActivity: text('daily_activity', { enum: ['sedentary', 'light', 'active'] }).notNull(),
  fiveKTimeSec: integer('five_k_time_sec'),
  easyPaceSecPerMile: integer('easy_pace_sec_per_mile'),
  maxHr: integer('max_hr'),
  garminModel: text('garmin_model').notNull(),
  eatsEggs: integer('eats_eggs', { mode: 'boolean' }).notNull(),
  wheyOk: integer('whey_ok', { mode: 'boolean' }).notNull(),
  dislikedFoods: text('disliked_foods', { mode: 'json' }).$type<string[]>().notNull(),
  injuries: text('injuries', { mode: 'json' }).$type<Injury[]>().notNull(),
  sleepTargetMin: integer('sleep_target_min').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

/** Single row (id = 1). */
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey(),
  onboardingComplete: integer('onboarding_complete', { mode: 'boolean' }).notNull().default(false),
  /** "HH:MM", 24h. */
  notificationTime: text('notification_time').notNull(),
  /** Log effort as RPE (1-10) or reps in reserve. */
  effortScale: text('effort_scale', { enum: ['rpe', 'rir'] }).notNull().default('rpe'),
  /** Evening preview of tomorrow, "HH:MM"; empty string = off. */
  eveningPreviewTime: text('evening_preview_time').notNull().default('20:00'),
  /** Where activity/sleep data comes from: the phone's health store, Garmin Connect directly, or generated demo data. */
  dataSource: text('data_source', { enum: ['health_connect', 'garmin_api', 'mock'] }).notNull().default('health_connect'),
  healthConnectConnected: integer('health_connect_connected', { mode: 'boolean' }).notNull().default(false),
  /** Daily step goal (Today tile and the home/lock screen widget). */
  stepGoal: integer('step_goal').notNull().default(8000),
  /** "Cook once, eat twice": repeat dinner the next day as leftovers. */
  cookOnce: integer('cook_once', { mode: 'boolean' }).notNull().default(false),
  /** Let the next A race reshape the weekly template (long ride / long run days). */
  useRaceTemplate: integer('use_race_template', { mode: 'boolean' }).notNull().default(true),
});

/** One row per item in domain/equipment.ts. */
export const equipment = sqliteTable('equipment', {
  id: text('id').primaryKey(),
  available: integer('available', { mode: 'boolean' }).notNull(),
});

export const scheduleTemplate = sqliteTable('schedule_template', {
  weekday: text('weekday', { enum: WEEKDAYS }).primaryKey(),
  sessionType: text('session_type', { enum: SESSION_TYPE_IDS }).notNull(),
});

/** Small key/value store for sync bookkeeping (last sync time, etc). */
export const syncState = sqliteTable('sync_state', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

// ───────────────────────────── body ─────────────────────────────

export const bodyMeasurements = sqliteTable(
  'body_measurements',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** Local "YYYY-MM-DD". */
    date: text('date').notNull(),
    measuredAt: integer('measured_at', { mode: 'timestamp_ms' }).notNull(),
    weightKg: real('weight_kg'),
    waistCm: real('waist_cm'),
    source: text('source', { enum: ['manual', 'health_connect', 'apple_health', 'garmin_api'] }).notNull(),
    /** Health Connect record id, so re-syncing never duplicates a weigh-in. */
    externalId: text('external_id').unique(),
  },
  (table) => [index('body_measurements_date_idx').on(table.date)],
);

export const progressPhotos = sqliteTable('progress_photos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  /** file:// URI inside the app's private documents folder. Never leaves the phone. */
  uri: text('uri').notNull(),
  note: text('note').notNull().default(''),
});

// ───────────────────────────── strength workouts ─────────────────────────────

export const workoutLogs = sqliteTable(
  'workout_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    date: text('date').notNull(),
    sessionType: text('session_type', { enum: SESSION_TYPE_IDS }).notNull(),
    templateId: text('template_id').notNull(),
    variant: text('variant', { enum: ['normal', 'easy', 'deload'] }).notNull().default('normal'),
    startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
    endedAt: integer('ended_at', { mode: 'timestamp_ms' }),
    status: text('status', { enum: ['in_progress', 'done', 'abandoned'] }).notNull().default('in_progress'),
    /** Session RPE (CR-10) asked at the end; feeds the training load. */
    sessionRpe: integer('session_rpe'),
    totalVolumeKg: real('total_volume_kg').notNull().default(0),
    /** The exercise list as built for this session (ids, sets, reps), so a resumed session is identical. */
    plan: text('plan', { mode: 'json' }).$type<{ exerciseId: string; sets: number; reps: [number, number]; restSec: number }[]>().notNull(),
    plannedSessionId: integer('planned_session_id'),
  },
  (table) => [index('workout_logs_date_idx').on(table.date)],
);

export const setLogs = sqliteTable(
  'set_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    workoutId: integer('workout_id').notNull(),
    exerciseId: text('exercise_id').notNull(),
    setIndex: integer('set_index').notNull(),
    weightKg: real('weight_kg').notNull(),
    reps: integer('reps').notNull(),
    rpe: real('rpe').notNull(),
    note: text('note').notNull().default(''),
    loggedAt: integer('logged_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('set_logs_workout_idx').on(table.workoutId), index('set_logs_exercise_idx').on(table.exerciseId)],
);

// ───────────────────────────── activities & recovery ─────────────────────────────

export const ACTIVITY_TYPES = ['run', 'tennis', 'strength', 'walk', 'yoga', 'cycling', 'swim', 'other'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/**
 * Everything that counts toward training load: synced sessions, manual logs,
 * and finished strength workouts from this app.
 */
export const activities = sqliteTable(
  'activities',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    date: text('date').notNull(),
    source: text('source', { enum: ['health_connect', 'apple_health', 'garmin_api', 'manual', 'workout', 'mock'] }).notNull(),
    /** Health Connect record id (or workout log id), so re-syncing upserts instead of duplicating. */
    externalId: text('external_id').unique(),
    type: text('type', { enum: ACTIVITY_TYPES }).notNull(),
    title: text('title').notNull(),
    startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
    endedAt: integer('ended_at', { mode: 'timestamp_ms' }).notNull(),
    durationSec: integer('duration_sec').notNull(),
    distanceM: real('distance_m'),
    avgHr: integer('avg_hr'),
    maxHr: integer('max_hr'),
    activeKcal: real('active_kcal'),
    /** Session RPE 1-10. */
    rpe: real('rpe'),
    /** True while the RPE is estimated from heart rate rather than entered. */
    rpeEstimated: integer('rpe_estimated', { mode: 'boolean' }).notNull().default(false),
    /** RPE × minutes. */
    srpeLoad: real('srpe_load').notNull().default(0),
    /** Banister TRIMP, runs with heart rate only. */
    trimp: real('trimp'),
    /** Tennis details. */
    tennisFormat: text('tennis_format', { enum: ['singles', 'doubles'] }),
    /** When another record covers the same session (e.g. app workout + watch recording). */
    duplicateOf: integer('duplicate_of'),
    workoutLogId: integer('workout_log_id'),
    plannedSessionId: integer('planned_session_id'),
    note: text('note').notNull().default(''),
  },
  (table) => [index('activities_date_idx').on(table.date), index('activities_started_idx').on(table.startedAt)],
);

export const sleepSessions = sqliteTable(
  'sleep_sessions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** The morning you woke up, local date. */
    date: text('date').notNull(),
    externalId: text('external_id').unique(),
    source: text('source', { enum: ['health_connect', 'apple_health', 'garmin_api', 'manual', 'mock'] }).notNull(),
    startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
    endedAt: integer('ended_at', { mode: 'timestamp_ms' }).notNull(),
    /** Stage segments as Health Connect gives them (stage codes in domain/sleepScore.ts). */
    stages: text('stages', { mode: 'json' }).$type<{ start: number; end: number; stage: number }[]>().notNull(),
  },
  (table) => [index('sleep_sessions_date_idx').on(table.date)],
);

/** One row per day: raw signals from the watch plus the scores computed from them. */
export const dailyMetrics = sqliteTable('daily_metrics', {
  date: text('date').primaryKey(),
  restingHr: integer('resting_hr'),
  hrvRmssd: real('hrv_rmssd'),
  steps: integer('steps'),
  activeKcal: real('active_kcal'),
  /** VO2 max in ml/kg/min, as Garmin reports it through Health Connect. */
  vo2Max: real('vo2_max'),
  sleepScore: integer('sleep_score'),
  sleepBreakdown: text('sleep_breakdown', { mode: 'json' }).$type<Record<string, unknown>>(),
  readiness: integer('readiness'),
  readinessBreakdown: text('readiness_breakdown', { mode: 'json' }).$type<Record<string, unknown>>(),
  acuteLoad: real('acute_load'),
  chronicLoad: real('chronic_load'),
  acwr: real('acwr'),
  computedAt: integer('computed_at', { mode: 'timestamp_ms' }),
});

/** The 3-tap morning check-in. */
export const checkins = sqliteTable('checkins', {
  date: text('date').primaryKey(),
  /** 1 = low, 2 = ok, 3 = great. */
  energy: integer('energy').notNull(),
  /** 1 = fresh, 2 = a bit sore, 3 = very sore. */
  soreness: integer('soreness').notNull(),
  painAreas: text('pain_areas', { mode: 'json' }).$type<BodyArea[]>().notNull(),
  note: text('note').notNull().default(''),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

// ───────────────────────────── plan ─────────────────────────────

export const plannedSessions = sqliteTable(
  'planned_sessions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    date: text('date').notNull(),
    weekStart: text('week_start').notNull(),
    sessionType: text('session_type', { enum: SESSION_TYPE_IDS }).notNull(),
    status: text('status', { enum: ['planned', 'done', 'skipped', 'sick', 'travel', 'dropped'] }).notNull().default('planned'),
    variant: text('variant', { enum: ['normal', 'easy', 'deload'] }).notNull().default('normal'),
    targetMin: integer('target_min').notNull(),
    /** Structured run (steps) or strength details; shape in domain/plan/types.ts. */
    detail: text('detail', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
    /** Short explanation of any adjustment, e.g. "Cut to 35 min because load jumped 30%". */
    reason: text('reason').notNull().default(''),
    /** Set when the session was moved from another day. */
    movedFrom: text('moved_from'),
    /** Whether the Wednesday add-on fits after the run. */
    addOn: integer('add_on', { mode: 'boolean' }).notNull().default(false),
    activityId: integer('activity_id'),
    workoutLogId: integer('workout_log_id'),
  },
  (table) => [index('planned_sessions_week_idx').on(table.weekStart), index('planned_sessions_date_idx').on(table.date)],
);

export const planChanges = sqliteTable('plan_changes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  weekStart: text('week_start').notNull(),
  date: text('date').notNull(),
  ruleId: text('rule_id').notNull(),
  reason: text('reason').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const runFitness = sqliteTable('run_fitness', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  effectiveDate: text('effective_date').notNull(),
  vdot: real('vdot').notNull(),
  source: text('source', { enum: ['onboarding', 'estimate', 'manual'] }).notNull(),
  basis: text('basis').notNull().default(''),
});

/** Races you're training for. The next "A" race drives the plan's phase and long sessions. */
export const races = sqliteTable('races', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type', {
    enum: ['five_k', 'ten_k', 'half_marathon', 'marathon', 'sprint_tri', 'olympic_tri', 'ironman_70_3'],
  }).notNull(),
  /** Local "YYYY-MM-DD". */
  date: text('date').notNull(),
  /** A = the race the plan is built around; B = train through it. */
  priority: text('priority', { enum: ['A', 'B'] }).notNull().default('A'),
  goalTimeSec: integer('goal_time_sec'),
  note: text('note').notNull().default(''),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

// ───────────────────────────── nutrition ─────────────────────────────

/** The meals the weekly plan builds around. */
export const MEAL_SLOTS = ['breakfast', 'lunch', 'snack', 'dinner'] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

/**
 * What a food log can be filed under. "extra" is everything eaten outside the planned meals:
 * fruit through the day, a yoghurt, anything picked at. The plan has nothing to say about those,
 * which is why they are a logging slot only and never appear in `meal_plan_items`.
 */
export const LOG_SLOTS = [...MEAL_SLOTS, 'extra'] as const;
export type LogSlot = (typeof LOG_SLOTS)[number];

/**
 * Foods and dishes. Macros are per 100 g so any serving size works; the servings table
 * maps household units (1 roti, 1 katori) to grams.
 */
export const foods = sqliteTable('foods', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  source: text('source', { enum: ['seed', 'custom', 'usda', 'off', 'recipe'] }).notNull(),
  /** True when values are estimated (recipe-derived dish) rather than from a composition table. */
  isEstimate: integer('is_estimate', { mode: 'boolean' }).notNull().default(false),
  /** Where the numbers came from: "IFCT 2017", a USDA fdcId, an OFF barcode, or "recipe". */
  sourceRef: text('source_ref').notNull().default(''),
  kcal100: real('kcal_100').notNull(),
  protein100: real('protein_100').notNull(),
  carbs100: real('carbs_100').notNull(),
  fat100: real('fat_100').notNull(),
  fiber100: real('fiber_100').notNull().default(0),
  /** Dishes appear in the meal plan; ingredients don't. */
  isDish: integer('is_dish', { mode: 'boolean' }).notNull().default(false),
  /** Which meal slots a dish suits. */
  slots: text('slots', { mode: 'json' }).$type<MealSlot[]>().notNull().default([]),
  /** Tags such as "protein_anchor", "egg", "whey", "soy", "paneer", "dairy". */
  tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().default([]),
  /** Grocery ingredients for a dish, one serving: "paneer 100 g, onion 1". */
  grocery: text('grocery', { mode: 'json' }).$type<{ item: string; qty: number; unit: string }[]>().notNull().default([]),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }),
});

export const foodServings = sqliteTable(
  'food_servings',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    foodId: text('food_id').notNull(),
    /** "1 roti", "1 katori", "1 cup", "100 g". */
    label: text('label').notNull(),
    grams: real('grams').notNull(),
    isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => [index('food_servings_food_idx').on(table.foodId)],
);

export const recipes = sqliteTable('recipes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  /** The food row this recipe produces (source = 'recipe'). */
  foodId: text('food_id').notNull(),
  name: text('name').notNull(),
  servings: real('servings').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const recipeIngredients = sqliteTable('recipe_ingredients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  recipeId: integer('recipe_id').notNull(),
  foodId: text('food_id').notNull(),
  grams: real('grams').notNull(),
});

export const foodLogs = sqliteTable(
  'food_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    date: text('date').notNull(),
    slot: text('slot', { enum: LOG_SLOTS }).notNull(),
    foodId: text('food_id').notNull(),
    foodName: text('food_name').notNull(),
    /** What was picked, e.g. "2 × 1 roti". */
    servingLabel: text('serving_label').notNull(),
    quantity: real('quantity').notNull(),
    grams: real('grams').notNull(),
    /** Snapshot so edits to the food later don't rewrite history. */
    kcal: real('kcal').notNull(),
    proteinG: real('protein_g').notNull(),
    carbsG: real('carbs_g').notNull(),
    fatG: real('fat_g').notNull(),
    fiberG: real('fiber_g').notNull(),
    loggedAt: integer('logged_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('food_logs_date_idx').on(table.date)],
);

export const favorites = sqliteTable('favorites', {
  foodId: text('food_id').primaryKey(),
  addedAt: integer('added_at', { mode: 'timestamp_ms' }).notNull(),
});

export const nutritionTargets = sqliteTable('nutrition_targets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  effectiveFrom: text('effective_from').notNull(),
  /** Base daily calories before the day-type carb shift. */
  kcal: real('kcal').notNull(),
  proteinG: real('protein_g').notNull(),
  fatG: real('fat_g').notNull(),
  carbsG: real('carbs_g').notNull(),
  bmr: real('bmr').notNull(),
  tdee: real('tdee').notNull(),
  deficitKcal: real('deficit_kcal').notNull(),
  /** Running adjustment from the fortnightly weight-trend reviews. */
  adjustKcal: real('adjust_kcal').notNull().default(0),
  reason: text('reason').notNull(),
});

export const mealPlanItems = sqliteTable(
  'meal_plan_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    weekStart: text('week_start').notNull(),
    date: text('date').notNull(),
    slot: text('slot', { enum: MEAL_SLOTS }).notNull(),
    foodId: text('food_id').notNull(),
    grams: real('grams').notNull(),
    /** Set when the user swapped this meal manually so a regenerate keeps it. */
    pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => [index('meal_plan_week_idx').on(table.weekStart), uniqueIndex('meal_plan_date_slot').on(table.date, table.slot)],
);
