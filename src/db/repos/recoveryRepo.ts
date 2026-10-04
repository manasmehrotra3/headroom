import { and, asc, desc, eq, gte, isNotNull, lte } from 'drizzle-orm';

import type { BodyArea } from '@/domain/bodyAreas';
import { addDays, todayKey, type DateKey } from '@/domain/dates';

import { db } from '../client';
import { checkins, dailyMetrics, sleepSessions } from '../schema';

export type CheckinRow = typeof checkins.$inferSelect;
export type DailyMetricsRow = typeof dailyMetrics.$inferSelect;
export type SleepRow = typeof sleepSessions.$inferSelect;

export function saveCheckin(input: { date: DateKey; energy: number; soreness: number; painAreas: BodyArea[]; note?: string }): void {
  const row = { ...input, note: input.note ?? '', createdAt: new Date() };
  db.insert(checkins).values(row).onConflictDoUpdate({ target: checkins.date, set: row }).run();
}

export function getCheckin(date: DateKey): CheckinRow | undefined {
  return db.select().from(checkins).where(eq(checkins.date, date)).get();
}

export function checkinsBetween(from: DateKey, to: DateKey): CheckinRow[] {
  return db.select().from(checkins).where(and(gte(checkins.date, from), lte(checkins.date, to))).orderBy(asc(checkins.date)).all();
}

/** Pain reported today (or yesterday if there's no check-in yet today). */
export function todaysPainAreas(today: DateKey = todayKey()): BodyArea[] {
  return (getCheckin(today) ?? getCheckin(addDays(today, -1)))?.painAreas ?? [];
}

/** How many consecutive days (ending today) an area has been reported painful. */
export function painStreakDays(area: BodyArea, today: DateKey = todayKey()): number {
  let streak = 0;
  for (let i = 0; i < 30; i += 1) {
    const checkin = getCheckin(addDays(today, -i));
    if (!checkin || !checkin.painAreas.includes(area)) break;
    streak += 1;
  }
  return streak;
}

export function upsertDailyMetrics(date: DateKey, values: Partial<Omit<DailyMetricsRow, 'date'>>): void {
  db.insert(dailyMetrics)
    .values({ date, ...values })
    .onConflictDoUpdate({ target: dailyMetrics.date, set: values })
    .run();
}

export function getDailyMetrics(date: DateKey): DailyMetricsRow | undefined {
  return db.select().from(dailyMetrics).where(eq(dailyMetrics.date, date)).get();
}

export function dailyMetricsBetween(from: DateKey, to: DateKey): DailyMetricsRow[] {
  return db.select().from(dailyMetrics).where(and(gte(dailyMetrics.date, from), lte(dailyMetrics.date, to))).orderBy(asc(dailyMetrics.date)).all();
}

export function upsertSleep(input: Omit<SleepRow, 'id'>): void {
  if (input.externalId) {
    const existing = db.select().from(sleepSessions).where(eq(sleepSessions.externalId, input.externalId)).get();
    if (existing) {
      db.update(sleepSessions).set(input).where(eq(sleepSessions.id, existing.id)).run();
      return;
    }
  }
  db.insert(sleepSessions).values(input).run();
}

export function sleepBetween(from: DateKey, to: DateKey): SleepRow[] {
  return db.select().from(sleepSessions).where(and(gte(sleepSessions.date, from), lte(sleepSessions.date, to))).orderBy(asc(sleepSessions.startedAt)).all();
}

export function latestSleep(): SleepRow | undefined {
  return db.select().from(sleepSessions).orderBy(desc(sleepSessions.endedAt)).limit(1).get();
}

/**
 * Every VO2 max reading in a range, oldest first. The watch only writes one every few runs,
 * so most days have none and the list is short.
 */
export function vo2PointsBetween(from: DateKey, to: DateKey): { date: DateKey; vo2Max: number }[] {
  return dailyMetricsBetween(from, to).flatMap((m) => (m.vo2Max === null ? [] : [{ date: m.date, vo2Max: m.vo2Max }]));
}

/** The most recent VO2 max on or before a date, however far back it was recorded. */
export function latestVo2(on: DateKey = todayKey()): { date: DateKey; vo2Max: number } | null {
  const row = db
    .select({ date: dailyMetrics.date, vo2Max: dailyMetrics.vo2Max })
    .from(dailyMetrics)
    .where(and(lte(dailyMetrics.date, on), isNotNull(dailyMetrics.vo2Max)))
    .orderBy(desc(dailyMetrics.date))
    .limit(1)
    .get();
  return row?.vo2Max == null ? null : { date: row.date, vo2Max: row.vo2Max };
}

/**
 * Records a VO2 max reading you typed in yourself.
 *
 * It goes in the same column as a reading from the phone's health store, so the trend, the tile
 * and the widget treat both the same. If the watch ever does start sharing VO2 max, a synced
 * reading for that date replaces the typed one, which is the right way round: the watch is
 * automatic and you would not want to keep correcting it.
 */
export function setManualVo2(date: DateKey, vo2Max: number): void {
  upsertDailyMetrics(date, { vo2Max });
}

/** Removes a reading for one day. */
export function clearVo2(date: DateKey): void {
  upsertDailyMetrics(date, { vo2Max: null });
}
