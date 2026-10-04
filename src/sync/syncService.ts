/**
 * Pulls data from the active source (the phone's health store, or demo data) into the database, then
 * recomputes the daily numbers: sleep score, readiness, training load.
 * Runs when the app opens and from the background task before the morning digest.
 */
import { and, eq, gte, lte } from 'drizzle-orm';
import { Platform } from 'react-native';

import { TUNABLES } from '@/config/tunables';
import { db } from '@/db/client';
import { activitiesBetween, firstActivityDate, upsertActivity } from '@/db/repos/activityRepo';
import { linkActivitiesToSessions } from '@/db/repos/planRepo';
import { loadProfile, loadSettings } from '@/db/repos/profileRepo';
import { dailyMetricsBetween, getCheckin, getDailyMetrics, sleepBetween, upsertDailyMetrics, upsertSleep } from '@/db/repos/recoveryRepo';
import { activities, bodyMeasurements, syncState } from '@/db/schema';
import { addDays, ageInYear, toDateKey, todayKey, type DateKey } from '@/domain/dates';
import { findDuplicates } from '@/domain/dedupe';
import { dailyLoads, estimateMaxHr, estimateRpeFromHr, loadSummary, trimp } from '@/domain/load';
import { mean, median, readiness } from '@/domain/readiness';
import { pickMainSleep, sleepScore, sleepTimingBaseline } from '@/domain/sleepScore';
import { appleHealthSource } from '@/sources/appleHealth';
import { healthConnectSource } from '@/sources/healthConnect';

import { publishWidget } from './widget';
import { mockSource } from '@/sources/mock';
import type { ActivitySource, SourceData } from '@/sources/types';

const LAST_SYNC_KEY = 'lastSyncMs';

export function getSyncValue(key: string): string | null {
  return db.select().from(syncState).where(eq(syncState.key, key)).get()?.value ?? null;
}

export function setSyncValue(key: string, value: string): void {
  db.insert(syncState).values({ key, value }).onConflictDoUpdate({ target: syncState.key, set: { value } }).run();
}

export function lastSyncAt(): Date | null {
  const value = getSyncValue(LAST_SYNC_KEY);
  return value ? new Date(Number(value)) : null;
}

export function activeSource(): ActivitySource | null {
  const settings = loadSettings();
  if (settings.dataSource === 'mock') return mockSource;
  // "health_connect" means the phone's own store: Health Connect on Android, Apple Health on iOS.
  if (!settings.healthConnectConnected) return null;
  return Platform.OS === 'ios' ? appleHealthSource : healthConnectSource;
}

export interface SyncResult {
  ok: boolean;
  message: string;
  activities: number;
  sleep: number;
}

/**
 * Full sync: read, store, dedupe, recompute. Safe to call often; reads overlap the last sync.
 * `fromMsOverride` forces a wider window than the usual overlap, which is what the backfill uses.
 */
export async function syncNow(source: ActivitySource | null = activeSource(), fromMsOverride?: number): Promise<SyncResult> {
  if (!source) return { ok: false, message: 'No data source connected.', activities: 0, sleep: 0 };

  const now = Date.now();
  const last = lastSyncAt();
  const usual = last ? last.getTime() - TUNABLES.sync.overlapDays * 86400000 : now - TUNABLES.sync.initialDays * 86400000;
  const fromMs = fromMsOverride === undefined ? usual : Math.min(usual, fromMsOverride);

  let data: SourceData;
  try {
    data = await source.read(fromMs, now);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error), activities: 0, sleep: 0 };
  }

  storeSourceData(source, data);
  const fromDate = toDateKey(new Date(fromMs));
  const toDate = todayKey();
  dedupeRange(fromDate, toDate);
  recomputeRange(fromDate, toDate);
  linkActivitiesToSessions(fromDate, toDate);
  setSyncValue(LAST_SYNC_KEY, String(now));
  publishWidget();
  return { ok: true, message: `Synced ${data.activities.length} activities and ${data.sleep.length} nights.`, activities: data.activities.length, sleep: data.sleep.length };
}

/**
 * Re-reads as far back as Health Connect will allow instead of the usual few days of overlap.
 *
 * Two reasons to run it: an update added a new metric (VO2 max, say) and its history would
 * otherwise start from today, or you have just connected Garmin and want whatever history it
 * backfilled. Reading past the oldest record simply returns nothing, and everything upserts by
 * record id, so this is safe to run more than once.
 */
export async function backfillSync(source: ActivitySource | null = activeSource()): Promise<SyncResult> {
  return syncNow(source, Date.now() - TUNABLES.sync.backfillDays * 86400000);
}

function storeSourceData(source: ActivitySource, data: SourceData): void {
  const profile = loadProfile();
  const maxHr = profile?.maxHr ?? estimateMaxHr(profile ? ageInYear(profile.birthYear) : 35);
  const sex = profile?.sex ?? 'male';

  for (const a of data.activities) {
    const date = toDateKey(new Date(a.startMs));
    const restingHr = getDailyMetrics(date)?.restingHr ?? data.daily.find((d) => d.date === date)?.restingHr ?? null;
    const estimated = estimateRpeFromHr(a.avgHr, restingHr, maxHr);
    const rpe = estimated ?? TUNABLES.load.defaultRpe[a.type];
    const durationSec = (a.endMs - a.startMs) / 1000;
    upsertActivity({
      source: source.id,
      externalId: a.externalId,
      type: a.type,
      title: a.title,
      startedAt: new Date(a.startMs),
      endedAt: new Date(a.endMs),
      distanceM: a.distanceM,
      avgHr: a.avgHr,
      maxHr: a.maxHr,
      activeKcal: a.activeKcal,
      rpe,
      rpeEstimated: true,
      trimp: a.type === 'run' && a.avgHr !== null && restingHr !== null ? trimp(durationSec, a.avgHr, restingHr, maxHr, sex) : null,
    });
  }

  for (const s of data.sleep) {
    upsertSleep({
      date: toDateKey(new Date(s.endMs)),
      externalId: s.externalId,
      source: source.id,
      startedAt: new Date(s.startMs),
      endedAt: new Date(s.endMs),
      stages: s.stages,
    });
  }

  for (const d of data.daily) {
    upsertDailyMetrics(d.date, { restingHr: d.restingHr, hrvRmssd: d.hrvRmssd, steps: d.steps, activeKcal: d.activeKcal, ...(d.vo2Max === null ? {} : { vo2Max: d.vo2Max }) });
  }

  for (const w of data.weights) {
    const measuredAt = new Date(w.ms);
    // Weigh-ins remember which phone store they came from; demo weigh-ins file as Health Connect as before.
    const row = { date: toDateKey(measuredAt), measuredAt, weightKg: w.kg, source: source.id === 'apple_health' ? ('apple_health' as const) : ('health_connect' as const), externalId: w.externalId };
    db.insert(bodyMeasurements).values(row).onConflictDoUpdate({ target: bodyMeasurements.externalId, set: row }).run();
  }
}

/** Marks activities that describe the same session (watch recording + app workout, etc). */
export function dedupeRange(from: DateKey, to: DateKey): void {
  const rows = activitiesBetween(from, to);
  const dupes = findDuplicates(rows.map((r) => ({ id: r.id, startedAt: r.startedAt.getTime(), durationSec: r.durationSec, type: r.type, source: r.source })));
  for (const row of rows) {
    const keep = dupes.get(row.id) ?? null;
    if (row.duplicateOf !== keep) db.update(activities).set({ duplicateOf: keep }).where(eq(activities.id, row.id)).run();
  }
}

export function recomputeRange(from: DateKey, to: DateKey): void {
  for (let date = from; date <= to; date = addDays(date, 1)) recomputeDay(date);
}

/** Sleep score, readiness and load for one day, from whatever data exists. */
export function recomputeDay(date: DateKey): void {
  const profile = loadProfile();
  const t = TUNABLES;

  // Sleep: main sleep ending on this date, consistency vs the previous 7 nights.
  const nights = sleepBetween(addDays(date, -t.sleep.consistencyBaselineDays), date).map((s) => ({
    date: s.date,
    startMs: s.startedAt.getTime(),
    endMs: s.endedAt.getTime(),
    stages: s.stages,
  }));
  const main = pickMainSleep(nights.filter((n) => n.date === date));
  const baseline = sleepTimingBaseline(nights.filter((n) => n.date !== date));
  const sleep = main ? sleepScore(main, profile?.sleepTargetMin ?? t.defaults.sleepTargetMin, baseline) : null;

  // Readiness: today's signals vs baselines that exclude today.
  const today = getDailyMetrics(date);
  const rhrHistory = dailyMetricsBetween(addDays(date, -t.readiness.restingHrBaselineDays), addDays(date, -1))
    .map((m) => m.restingHr)
    .filter((v): v is number => v !== null);
  const hrvHistory = dailyMetricsBetween(addDays(date, -t.readiness.hrvBaselineDays), addDays(date, -1))
    .map((m) => m.hrvRmssd)
    .filter((v): v is number => v !== null);
  const checkin = getCheckin(date);
  const ready = readiness({
    sleepScore: sleep?.score ?? null,
    restingHr: today?.restingHr ?? null,
    restingHrBaseline: median(rhrHistory),
    hrvRmssd: today?.hrvRmssd ?? null,
    hrvBaseline: mean(hrvHistory),
    checkin: checkin ? { energy: checkin.energy, soreness: checkin.soreness } : null,
  });

  // Load: ACWR from every non-duplicate activity in the last 28 days.
  const loads = dailyLoads(activitiesBetween(addDays(date, -t.load.chronicDays), date));
  const load = loadSummary(loads, date, firstActivityDate());

  upsertDailyMetrics(date, {
    sleepScore: sleep?.score ?? null,
    sleepBreakdown: sleep ? { ...sleep } : null,
    readiness: ready.score,
    readinessBreakdown: { band: ready.band, components: ready.components },
    acuteLoad: load.acute,
    chronicLoad: load.chronic,
    acwr: load.acwr,
    computedAt: new Date(),
  });
}

/** Activities in a range still counted (not duplicates). */
export function countedActivities(from: DateKey, to: DateKey) {
  return db
    .select()
    .from(activities)
    .where(and(gte(activities.date, from), lte(activities.date, to)))
    .all()
    .filter((a) => a.duplicateOf === null);
}
