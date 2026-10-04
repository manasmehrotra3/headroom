import { and, asc, desc, eq, gte, isNull, lte } from 'drizzle-orm';

import { TUNABLES } from '@/config/tunables';
import { addDays, toDateKey, todayKey, type DateKey } from '@/domain/dates';
import { sessionRpeLoad } from '@/domain/load';

import { db } from '../client';
import { activities, type ActivityType } from '../schema';

export type ActivityRow = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;

/** Inserts or (by externalId) updates an activity, recomputing its load. */
export function upsertActivity(input: Omit<NewActivity, 'srpeLoad' | 'date' | 'durationSec'> & { srpeLoad?: number }): number {
  const startedAt = input.startedAt;
  const endedAt = input.endedAt;
  const durationSec = Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000));
  const row: NewActivity = {
    ...input,
    date: toDateKey(startedAt),
    durationSec,
    srpeLoad: input.rpe === null || input.rpe === undefined ? 0 : sessionRpeLoad(input.rpe, durationSec),
  };

  if (input.externalId) {
    const existing = db.select().from(activities).where(eq(activities.externalId, input.externalId)).get();
    if (existing) {
      // Keep a rating the user entered by hand; refresh everything else from the source.
      const keepRpe = !existing.rpeEstimated && existing.rpe !== null;
      const merged = keepRpe
        ? { ...row, rpe: existing.rpe, rpeEstimated: false, srpeLoad: sessionRpeLoad(existing.rpe!, durationSec) }
        : row;
      db.update(activities).set(merged).where(eq(activities.id, existing.id)).run();
      return existing.id;
    }
  }
  return db.insert(activities).values(row).returning({ id: activities.id }).get().id;
}

export function setActivityRpe(id: number, rpe: number): void {
  const row = db.select().from(activities).where(eq(activities.id, id)).get();
  if (!row) return;
  db.update(activities)
    .set({ rpe, rpeEstimated: false, srpeLoad: sessionRpeLoad(rpe, row.durationSec) })
    .where(eq(activities.id, id))
    .run();
}

export function deleteActivity(id: number): void {
  db.delete(activities).where(eq(activities.id, id)).run();
}

export function activitiesBetween(from: DateKey, to: DateKey): ActivityRow[] {
  return db
    .select()
    .from(activities)
    .where(and(gte(activities.date, from), lte(activities.date, to)))
    .orderBy(asc(activities.startedAt))
    .all();
}

export function activitiesOn(date: DateKey): ActivityRow[] {
  return activitiesBetween(date, date);
}

/** Synced sessions still waiting for a "how hard was it?" rating. */
/**
 * Sessions still carrying an estimated RPE, recent enough to be worth asking about. Anything older
 * than `load.rpePromptDays` keeps its estimate rather than nagging forever.
 */
export function activitiesNeedingRpe(limit = 5, today: DateKey = todayKey()): ActivityRow[] {
  const from = addDays(today, -TUNABLES.load.rpePromptDays);
  return db
    .select()
    .from(activities)
    .where(and(eq(activities.rpeEstimated, true), isNull(activities.duplicateOf), gte(activities.date, from), lte(activities.date, today)))
    .orderBy(desc(activities.startedAt))
    .limit(limit)
    .all();
}

export function recentActivities(type: ActivityType | null, limit = 50): ActivityRow[] {
  const query = db.select().from(activities);
  return (type ? query.where(eq(activities.type, type)) : query).orderBy(desc(activities.startedAt)).limit(limit).all();
}

export function firstActivityDate(): DateKey | null {
  return db.select({ date: activities.date }).from(activities).orderBy(asc(activities.date)).limit(1).get()?.date ?? null;
}
