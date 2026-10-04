import { and, asc, desc, eq, ne } from 'drizzle-orm';

import { TUNABLES } from '@/config/tunables';
import { getExercise } from '@/data/exercises';
import { toDateKey } from '@/domain/dates';
import type { SessionType } from '@/domain/schedule';
import { totalVolumeKg } from '@/domain/strength/progression';
import type { PlannedExercise } from '@/domain/strength/types';
import type { Variant } from '@/domain/strength/workoutBuilder';

import { db } from '../client';
import { plannedSessions, setLogs, workoutLogs } from '../schema';
import { upsertActivity } from './activityRepo';

export type WorkoutRow = typeof workoutLogs.$inferSelect;
export type SetRow = typeof setLogs.$inferSelect;
export type PlanEntry = WorkoutRow['plan'][number];

export function toPlanEntries(exercises: PlannedExercise[]): PlanEntry[] {
  return exercises.map((e) => ({ exerciseId: e.exercise.id, sets: e.sets, reps: e.reps, restSec: e.restSec }));
}

export function startWorkout(input: {
  sessionType: SessionType;
  templateId: string;
  variant: Variant;
  exercises: PlannedExercise[];
  plannedSessionId?: number | null;
}): number {
  const now = new Date();
  return db
    .insert(workoutLogs)
    .values({
      date: toDateKey(now),
      sessionType: input.sessionType,
      templateId: input.templateId,
      variant: input.variant,
      startedAt: now,
      plan: toPlanEntries(input.exercises),
      plannedSessionId: input.plannedSessionId ?? null,
    })
    .returning({ id: workoutLogs.id })
    .get().id;
}

export function getWorkout(id: number): WorkoutRow | undefined {
  return db.select().from(workoutLogs).where(eq(workoutLogs.id, id)).get();
}

/** A workout left open. Older than abandonAfterHours is closed as abandoned instead of resumed. */
export function inProgressWorkout(): WorkoutRow | undefined {
  const open = db.select().from(workoutLogs).where(eq(workoutLogs.status, 'in_progress')).orderBy(desc(workoutLogs.startedAt)).get();
  if (!open) return undefined;
  const ageHours = (Date.now() - open.startedAt.getTime()) / 3_600_000;
  if (ageHours > TUNABLES.strength.abandonAfterHours) {
    db.update(workoutLogs).set({ status: 'abandoned', endedAt: new Date() }).where(eq(workoutLogs.id, open.id)).run();
    return undefined;
  }
  return open;
}

export function updatePlan(workoutId: number, plan: PlanEntry[]): void {
  db.update(workoutLogs).set({ plan }).where(eq(workoutLogs.id, workoutId)).run();
}

export function logSet(input: { workoutId: number; exerciseId: string; setIndex: number; weightKg: number; reps: number; rpe: number; note: string }): void {
  db.insert(setLogs).values({ ...input, loggedAt: new Date() }).run();
}

export function deleteSet(id: number): void {
  db.delete(setLogs).where(eq(setLogs.id, id)).run();
}

export function setsForWorkout(workoutId: number): SetRow[] {
  return db.select().from(setLogs).where(eq(setLogs.workoutId, workoutId)).orderBy(asc(setLogs.loggedAt)).all();
}

/**
 * Sets from the last `limit` finished workouts that included this exercise, newest first.
 * Feeds the double-progression suggestion.
 */
export function exerciseHistory(exerciseId: string, excludeWorkoutId: number | null, limit = 4): { workoutId: number; date: string; sets: SetRow[] }[] {
  const rows = db
    .select({ set: setLogs, date: workoutLogs.date, workoutId: workoutLogs.id, startedAt: workoutLogs.startedAt })
    .from(setLogs)
    .innerJoin(workoutLogs, eq(setLogs.workoutId, workoutLogs.id))
    .where(and(eq(setLogs.exerciseId, exerciseId), ne(workoutLogs.status, 'abandoned')))
    .orderBy(desc(workoutLogs.startedAt), asc(setLogs.setIndex))
    .all();

  const byWorkout = new Map<number, { workoutId: number; date: string; sets: SetRow[] }>();
  for (const row of rows) {
    if (row.workoutId === excludeWorkoutId) continue;
    const entry = byWorkout.get(row.workoutId) ?? { workoutId: row.workoutId, date: row.date, sets: [] };
    entry.sets.push(row.set);
    byWorkout.set(row.workoutId, entry);
  }
  return [...byWorkout.values()].slice(0, limit);
}

/** Closes the workout, stores volume and session RPE, and records it as an activity for training load. */
export function finishWorkout(workoutId: number, sessionRpe: number): void {
  const workout = getWorkout(workoutId);
  if (!workout) return;
  const sets = setsForWorkout(workoutId);
  const endedAt = new Date();
  const volume = totalVolumeKg(sets);

  db.transaction((tx) => {
    tx.update(workoutLogs).set({ status: 'done', endedAt, sessionRpe, totalVolumeKg: volume }).where(eq(workoutLogs.id, workoutId)).run();
    if (workout.plannedSessionId) {
      tx.update(plannedSessions).set({ status: 'done', workoutLogId: workoutId }).where(eq(plannedSessions.id, workout.plannedSessionId)).run();
    }
  });

  const exerciseNames = [...new Set(sets.map((s) => getExercise(s.exerciseId).name))];
  upsertActivity({
    source: 'workout',
    externalId: `workout:${workoutId}`,
    type: 'strength',
    title: workout.templateId === 'mobility' ? 'Mobility' : 'Strength',
    startedAt: workout.startedAt,
    endedAt,
    rpe: sessionRpe,
    rpeEstimated: false,
    workoutLogId: workoutId,
    plannedSessionId: workout.plannedSessionId,
    note: exerciseNames.slice(0, 4).join(', '),
  });
}

export function abandonWorkout(workoutId: number): void {
  db.update(workoutLogs).set({ status: 'abandoned', endedAt: new Date() }).where(eq(workoutLogs.id, workoutId)).run();
}

export function recentWorkouts(limit = 20): WorkoutRow[] {
  return db.select().from(workoutLogs).where(eq(workoutLogs.status, 'done')).orderBy(desc(workoutLogs.startedAt)).limit(limit).all();
}

/** Every logged set of every finished workout, for PR tracking. */
export function allDoneSets(): { set: SetRow; date: string }[] {
  return db
    .select({ set: setLogs, date: workoutLogs.date })
    .from(setLogs)
    .innerJoin(workoutLogs, eq(setLogs.workoutId, workoutLogs.id))
    .where(eq(workoutLogs.status, 'done'))
    .orderBy(asc(workoutLogs.startedAt))
    .all();
}
