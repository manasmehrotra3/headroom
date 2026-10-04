CREATE TABLE `body_measurements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`measured_at` integer NOT NULL,
	`weight_kg` real,
	`waist_cm` real,
	`source` text NOT NULL,
	`external_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `body_measurements_external_id_unique` ON `body_measurements` (`external_id`);--> statement-breakpoint
CREATE INDEX `body_measurements_date_idx` ON `body_measurements` (`date`);--> statement-breakpoint
CREATE TABLE `equipment` (
	`id` text PRIMARY KEY NOT NULL,
	`available` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profile` (
	`id` integer PRIMARY KEY NOT NULL,
	`sex` text NOT NULL,
	`birth_year` integer NOT NULL,
	`height_cm` real NOT NULL,
	`start_weight_kg` real NOT NULL,
	`goal_weight_kg` real NOT NULL,
	`daily_activity` text NOT NULL,
	`five_k_time_sec` integer,
	`easy_pace_sec_per_mile` integer,
	`max_hr` integer,
	`garmin_model` text NOT NULL,
	`eats_eggs` integer NOT NULL,
	`whey_ok` integer NOT NULL,
	`disliked_foods` text NOT NULL,
	`injuries` text NOT NULL,
	`sleep_target_min` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `schedule_template` (
	`weekday` text PRIMARY KEY NOT NULL,
	`session_type` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`onboarding_complete` integer DEFAULT false NOT NULL,
	`notification_time` text NOT NULL,
	`effort_scale` text DEFAULT 'rpe' NOT NULL
);
