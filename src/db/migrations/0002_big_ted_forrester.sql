CREATE TABLE `races` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`date` text NOT NULL,
	`priority` text DEFAULT 'A' NOT NULL,
	`goal_time_sec` integer,
	`note` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `settings` ADD `step_goal` integer DEFAULT 8000 NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `cook_once` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `use_race_template` integer DEFAULT true NOT NULL;