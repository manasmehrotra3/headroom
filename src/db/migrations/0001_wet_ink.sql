CREATE TABLE `activities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`source` text NOT NULL,
	`external_id` text,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer NOT NULL,
	`duration_sec` integer NOT NULL,
	`distance_m` real,
	`avg_hr` integer,
	`max_hr` integer,
	`active_kcal` real,
	`rpe` real,
	`rpe_estimated` integer DEFAULT false NOT NULL,
	`srpe_load` real DEFAULT 0 NOT NULL,
	`trimp` real,
	`tennis_format` text,
	`duplicate_of` integer,
	`workout_log_id` integer,
	`planned_session_id` integer,
	`note` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `activities_external_id_unique` ON `activities` (`external_id`);--> statement-breakpoint
CREATE INDEX `activities_date_idx` ON `activities` (`date`);--> statement-breakpoint
CREATE INDEX `activities_started_idx` ON `activities` (`started_at`);--> statement-breakpoint
CREATE TABLE `checkins` (
	`date` text PRIMARY KEY NOT NULL,
	`energy` integer NOT NULL,
	`soreness` integer NOT NULL,
	`pain_areas` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `daily_metrics` (
	`date` text PRIMARY KEY NOT NULL,
	`resting_hr` integer,
	`hrv_rmssd` real,
	`steps` integer,
	`active_kcal` real,
	`sleep_score` integer,
	`sleep_breakdown` text,
	`readiness` integer,
	`readiness_breakdown` text,
	`acute_load` real,
	`chronic_load` real,
	`acwr` real,
	`computed_at` integer
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`food_id` text PRIMARY KEY NOT NULL,
	`added_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `food_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`slot` text NOT NULL,
	`food_id` text NOT NULL,
	`food_name` text NOT NULL,
	`serving_label` text NOT NULL,
	`quantity` real NOT NULL,
	`grams` real NOT NULL,
	`kcal` real NOT NULL,
	`protein_g` real NOT NULL,
	`carbs_g` real NOT NULL,
	`fat_g` real NOT NULL,
	`fiber_g` real NOT NULL,
	`logged_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `food_logs_date_idx` ON `food_logs` (`date`);--> statement-breakpoint
CREATE TABLE `food_servings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`food_id` text NOT NULL,
	`label` text NOT NULL,
	`grams` real NOT NULL,
	`is_default` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `food_servings_food_idx` ON `food_servings` (`food_id`);--> statement-breakpoint
CREATE TABLE `foods` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`source` text NOT NULL,
	`is_estimate` integer DEFAULT false NOT NULL,
	`source_ref` text DEFAULT '' NOT NULL,
	`kcal_100` real NOT NULL,
	`protein_100` real NOT NULL,
	`carbs_100` real NOT NULL,
	`fat_100` real NOT NULL,
	`fiber_100` real DEFAULT 0 NOT NULL,
	`is_dish` integer DEFAULT false NOT NULL,
	`slots` text DEFAULT '[]' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`grocery` text DEFAULT '[]' NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `meal_plan_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`week_start` text NOT NULL,
	`date` text NOT NULL,
	`slot` text NOT NULL,
	`food_id` text NOT NULL,
	`grams` real NOT NULL,
	`pinned` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `meal_plan_week_idx` ON `meal_plan_items` (`week_start`);--> statement-breakpoint
CREATE UNIQUE INDEX `meal_plan_date_slot` ON `meal_plan_items` (`date`,`slot`);--> statement-breakpoint
CREATE TABLE `nutrition_targets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`effective_from` text NOT NULL,
	`kcal` real NOT NULL,
	`protein_g` real NOT NULL,
	`fat_g` real NOT NULL,
	`carbs_g` real NOT NULL,
	`bmr` real NOT NULL,
	`tdee` real NOT NULL,
	`deficit_kcal` real NOT NULL,
	`adjust_kcal` real DEFAULT 0 NOT NULL,
	`reason` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plan_changes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`week_start` text NOT NULL,
	`date` text NOT NULL,
	`rule_id` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `planned_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`week_start` text NOT NULL,
	`session_type` text NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`variant` text DEFAULT 'normal' NOT NULL,
	`target_min` integer NOT NULL,
	`detail` text NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`moved_from` text,
	`add_on` integer DEFAULT false NOT NULL,
	`activity_id` integer,
	`workout_log_id` integer
);
--> statement-breakpoint
CREATE INDEX `planned_sessions_week_idx` ON `planned_sessions` (`week_start`);--> statement-breakpoint
CREATE INDEX `planned_sessions_date_idx` ON `planned_sessions` (`date`);--> statement-breakpoint
CREATE TABLE `progress_photos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`uri` text NOT NULL,
	`note` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recipe_ingredients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipe_id` integer NOT NULL,
	`food_id` text NOT NULL,
	`grams` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`food_id` text NOT NULL,
	`name` text NOT NULL,
	`servings` real NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `run_fitness` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`effective_date` text NOT NULL,
	`vdot` real NOT NULL,
	`source` text NOT NULL,
	`basis` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `set_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workout_id` integer NOT NULL,
	`exercise_id` text NOT NULL,
	`set_index` integer NOT NULL,
	`weight_kg` real NOT NULL,
	`reps` integer NOT NULL,
	`rpe` real NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`logged_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `set_logs_workout_idx` ON `set_logs` (`workout_id`);--> statement-breakpoint
CREATE INDEX `set_logs_exercise_idx` ON `set_logs` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `sleep_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`external_id` text,
	`source` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer NOT NULL,
	`stages` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sleep_sessions_external_id_unique` ON `sleep_sessions` (`external_id`);--> statement-breakpoint
CREATE INDEX `sleep_sessions_date_idx` ON `sleep_sessions` (`date`);--> statement-breakpoint
CREATE TABLE `sync_state` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workout_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`session_type` text NOT NULL,
	`template_id` text NOT NULL,
	`variant` text DEFAULT 'normal' NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`session_rpe` integer,
	`total_volume_kg` real DEFAULT 0 NOT NULL,
	`plan` text NOT NULL,
	`planned_session_id` integer
);
--> statement-breakpoint
CREATE INDEX `workout_logs_date_idx` ON `workout_logs` (`date`);--> statement-breakpoint
ALTER TABLE `settings` ADD `evening_preview_time` text DEFAULT '20:00' NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `data_source` text DEFAULT 'health_connect' NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `health_connect_connected` integer DEFAULT false NOT NULL;