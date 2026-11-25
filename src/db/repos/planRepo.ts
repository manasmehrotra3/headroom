/**
 * Glue between the pure plan engine (src/domain/plan) and the database: gathers the
 * context the rules need, stores the resulting week, and applies moves / sick days.
 */
import { and, asc, desc, eq, gte, lte } from 'drizzle-orm';

import { TUNABLES } from '@/config/tunables';
import type { BodyArea } from '@/domain/bodyAreas';
import { addDays, ageInYear, daysBetween, startOfWeek, todayKey, weekDates, weekdayOf, type DateKey } from '@/domain/dates';
import { estimateMaxHr } from '@/domain/load';
import { adjustForDay, applyRules, buildWeek } from '@/domain/plan/engine';
import { markDay, moveSession } from '@/domain/plan/reschedule';
import { makeSession, scheduleFor } from '@/domain/plan/weekBuilder';
import type { DayContext, PlanChange, PlannedSession, SessionDetail, SessionStatus, WeekContext } from '@/domain/plan/types';
import type { ReadinessBand } from '@/domain/readiness';
import { reestimateVdot, trainingPaces, vdotFromEasyPace, vdotFromRace, type Paces } from '@/domain/running/vdot';
import { SESSION_TYPES } from '@/domain/schedule';

import { currentBikeZones, currentRaceContext } from './raceRepo';
import { db } from '../client';
import { activities, planChanges, plannedSessions, runFitness } from '../schema';
import { activitiesBetween } from './activityRepo';
import { loadProfile, loadSchedule, loadSettings } from './profileRepo';
import { checkinsBetween, dailyMetricsBetween, getCheckin, getDailyMetrics, painStreakDays } from './recoveryRepo';

export type PlannedSessionRow = typeof plannedSessions.$inferSelect;

const PLAN_START_KEY = 'planStartWeek';

function rowToSession(row: PlannedSessionRow): PlannedSession {
  return {
    id: row.id,
    date: row.date,
    weekStart: row.weekStart,
    sessionType: row.sessionType,
    status: row.status,
    variant: row.variant,
    targetMin: row.targetMin,
    detail: row.detail as unknown as SessionDetail,
    reason: row.reason,
    movedFrom: row.movedFrom,
    addOn: row.addOn,
  };
}

function sessionToRow(s: PlannedSession): typeof plannedSessions.$inferInsert {
  return {
    date: s.date,
    weekStart: s.weekStart,
    sessionType: s.sessionType,
    status: s.status,
    variant: s.variant,
    targetMin: s.targetMin,
    detail: s.detail as unknown as Record<string, unknown>,
    reason: s.reason,
    movedFrom: s.movedFrom,
    addOn: s.addOn,
  };
}

// ───────────────────────────── running fitness ─────────────────────────────

export function currentVdot(): number | null {
  return db.select().from(runFitness).orderBy(desc(runFitness.effectiveDate), desc(runFitness.id)).limit(1).get()?.vdot ?? null;
}

export function currentPaces(): Paces | null {
  const vdot = currentVdot();
  return vdot === null ? null : trainingPaces(vdot);
}

/** Seeds VDOT from the onboarding 5K time or easy pace, once. */
export function ensureRunFitness(): void {
  if (currentVdot() !== null) return;
  const profile = loadProfile();
  if (!profile) return;
  let vdot: number | null = null;
  let basis = '';
  if (profile.fiveKTimeSec) {
    vdot = vdotFromRace(5000, profile.fiveKTimeSec);
    basis = `5K time from onboarding`;
  } else if (profile.easyPaceSecPerMile) {
    vdot = vdotFromEasyPace(profile.easyPaceSecPerMile);
    basis = `easy pace from onboarding`;
  }
  if (vdot !== null) db.insert(runFitness).values({ effectiveDate: todayKey(), vdot: Math.round(vdot * 10) / 10, source: 'onboarding', basis }).run();
}

/** Every few weeks, re-estimate VDOT from recent runs so paces stay realistic. */
export function maybeReestimateVdot(today: DateKey = todayKey()): { vdot: number; basis: string } | null {
  const latest = db.select().from(runFitness).orderBy(desc(runFitness.effectiveDate), desc(runFitness.id)).limit(1).get();
  if (latest && daysBetween(latest.effectiveDate, today) < TUNABLES.plan.vdotReestimateWeeks * 7) return null;

  const profile = loadProfile();
  const maxHr = profile?.maxHr ?? estimateMaxHr(profile ? ageInYear(profile.birthYear) : 35);
  const runs = activitiesBetween(addDays(today, -TUNABLES.plan.vdotLookbackDays), today)
    .filter((a) => a.type === 'run' && a.duplicateOf === null && a.distanceM !== null)
    .map((a) => ({ distanceM: a.distanceM!, durationSec: a.durationSec, avgHr: a.avgHr }));
  const restingHrs = dailyMetricsBetween(addDays(today, -28), today).map((m) => m.restingHr).filter((v): v is number => v !== null);
  const restingHr = restingHrs.length ? restingHrs.sort((a, b) => a - b)[Math.floor(restingHrs.length / 2)] : null;

  const result = reestimateVdot(latest?.vdot ?? null, runs, restingHr, maxHr);
  if (!result) return null;
  db.insert(runFitness).values({ effectiveDate: today, vdot: result.vdot, source: 'estimate', basis: result.basis }).run();
  return result;
}

export function setManualVdot(vdot: number): void {
  db.insert(runFitness).values({ effectiveDate: todayKey(), vdot, source: 'manual', basis: 'set by hand' }).run();
}

// ───────────────────────────── context ─────────────────────────────

function planStartWeek(weekStart: DateKey): DateKey {
  const stored = db.select().from(plannedSessions).orderBy(asc(plannedSessions.weekStart)).limit(1).get()?.weekStart;
  return stored ?? weekStart;
}

export function gatherWeekContext(weekStart: DateKey, today: DateKey = todayKey()): WeekContext {
  const profile = loadProfile();
  const lastWeekStart = addDays(weekStart, -7);
  const lastWeekEnd = addDays(weekStart, -1);

  const lastWeekRuns = activitiesBetween(lastWeekStart, lastWeekEnd).filter((a) => a.type === 'run' && a.duplicateOf === null);
  const lastWeekPlannedRows = db.select().from(plannedSessions).where(eq(plannedSessions.weekStart, lastWeekStart)).all();
  const lastQuality = lastWeekPlannedRows.find((r) => r.sessionType === 'run_quality');
  const lastEasy = lastWeekPlannedRows.find((r) => r.sessionType === 'run_easy');
  const lastWeekHadQuality = lastQuality?.status === 'done' || lastWeekRuns.some((a) => (a.avgHr ?? 0) > 0 && a.rpe !== null && a.rpe >= 7);

  const metrics = getDailyMetrics(addDays(today, -1)) ?? getDailyMetrics(today);
  const recent = dailyMetricsBetween(addDays(today, -(TUNABLES.readiness.lowDaysWindow - 1)), today);
  const lowReadinessDays = recent.filter((m) => m.readiness !== null && m.readiness < TUNABLES.readiness.moderate).length;

  const lastWeekBike = activitiesBetween(lastWeekStart, lastWeekEnd).filter((a) => a.type === 'cycling' && a.duplicateOf === null);
  const tennis = activitiesBetween(lastWeekEnd, lastWeekEnd).find((a) => a.type === 'tennis' && a.duplicateOf === null);

  const recentPain = checkinsBetween(addDays(today, -2), today).flatMap((c) => c.painAreas);
  const painAreas = [...new Set<BodyArea>([...(profile?.injuries.map((i) => i.area) ?? []), ...recentPain])];
  const painStreaks: Partial<Record<BodyArea, number>> = {};
  for (const area of recentPain) painStreaks[area] = painStreakDays(area, today);

  return {
    weekStart,
    today,
    schedule: loadSchedule(),
    weekIndex: Math.max(0, Math.round(daysBetween(planStartWeek(weekStart), weekStart) / 7)),
    lastWeekRunMin: lastWeekRuns.reduce((sum, a) => sum + a.durationSec / 60, 0),
    lastWeekBikeMin: lastWeekBike.reduce((sum, a) => sum + a.durationSec / 60, 0),
    lastWeekHadQuality,
    lastWeekPlanned: lastQuality || lastEasy ? { quality: lastQuality?.targetMin ?? TUNABLES.plan.startingRunMin.quality, easy: lastEasy?.targetMin ?? TUNABLES.plan.startingRunMin.easy } : null,
    acwr: metrics?.acwr ?? null,
    acwrLabel: metrics?.acwr === null || metrics?.acwr === undefined ? 'insufficient' : metrics.acwr < 0.8 ? 'low' : metrics.acwr <= 1.3 ? 'sweet_spot' : metrics.acwr <= 1.5 ? 'caution' : 'high',
    lowReadinessDays,
    lastTennis: tennis ? { durationMin: tennis.durationSec / 60, rpe: tennis.rpe } : null,
    painAreas,
    painStreaks,
    paces: currentPaces(),
    bikeZones: currentBikeZones(),
    race: currentRaceContext(today),
    useRaceTemplate: loadSettings().useRaceTemplate,
  };
}

export function gatherDayContext(date: DateKey = todayKey()): DayContext {
  const metrics = getDailyMetrics(date);
  const breakdown = metrics?.readinessBreakdown as { band?: ReadinessBand } | null | undefined;
  const checkin = getCheckin(date);
  const painAreas = checkin?.painAreas ?? [];
  const painStreaks: Partial<Record<BodyArea, number>> = {};
  for (const area of painAreas) painStreaks[area] = painStreakDays(area, date);
  return { date, readinessBand: breakdown?.band ?? 'unknown', painAreas, painStreaks, paces: currentPaces(), bikeZones: currentBikeZones() };
}

// ───────────────────────────── week storage ─────────────────────────────

export function weekSessions(weekStart: DateKey): PlannedSession[] {
  return db.select().from(plannedSessions).where(eq(plannedSessions.weekStart, weekStart)).orderBy(asc(plannedSessions.date)).all().map(rowToSession);
}

export function sessionOnDate(date: DateKey): PlannedSession | undefined {
  const row = db.select().from(plannedSessions).where(eq(plannedSessions.date, date)).get();
  return row ? rowToSession(row) : undefined;
}

function recordChanges(weekStart: DateKey, changes: PlanChange[]): void {
  const now = new Date();
  for (const c of changes) db.insert(planChanges).values({ weekStart, date: c.date, ruleId: c.ruleId, reason: c.reason, createdAt: now }).run();
}

export function changesForWeek(weekStart: DateKey) {
  return db.select().from(planChanges).where(eq(planChanges.weekStart, weekStart)).orderBy(asc(planChanges.createdAt)).all();
}

/** Writes a whole week back, matching rows by date. */
function saveWeek(sessions: PlannedSession[]): void {
  db.transaction((tx) => {
    for (const s of sessions) {
      const row = sessionToRow(s);
      if (s.id) tx.update(plannedSessions).set(row).where(eq(plannedSessions.id, s.id)).run();
      else tx.insert(plannedSessions).values(row).run();
    }
  });
}

/** Builds and stores the week if it doesn't exist yet. */
export function ensureWeek(weekStart: DateKey, today: DateKey = todayKey()): PlannedSession[] {
  const existing = weekSessions(weekStart);
  if (existing.length > 0) return existing;
  ensureRunFitness();
  const plan = buildWeek(gatherWeekContext(weekStart, today));
  saveWeek(plan.sessions);
  recordChanges(weekStart, plan.changes);
  return weekSessions(weekStart);
}

/**
 * Re-plans the days still to come with fresh context. Because it starts from the template
 * again, an adjustment undoes itself once its reason is gone: clear the knee pain and the
 * ride comes back; let the load settle and the durations return.
 */
export function refreshWeek(weekStart: DateKey, today: DateKey = todayKey()): void {
  rebuildUpcomingDays(weekStart, today);
}

/**
 * Rebuilds the days that haven't happened yet from the current template. Called when the
 * template itself changes: a race is added or removed, or the race-template switch is flipped.
 * Days already done, skipped or in the past are left exactly as they are.
 */
export function rebuildUpcomingDays(weekStart: DateKey, today: DateKey = todayKey()): void {
  const existing = weekSessions(weekStart);
  if (existing.length === 0) return;
  const ctx = gatherWeekContext(weekStart, today);
  const schedule = scheduleFor(ctx);

  const rebuilt = existing.map((session) => {
    // Leave the past, anything already done or marked, and days you moved by hand.
    if (session.date < today || session.status !== 'planned' || session.movedFrom) return session;
    // Always rebuild from the template rather than adjusting what's stored: the rules trim
    // durations, so re-running them over an already-trimmed session would shrink it again on
    // every app open. Starting fresh each time means one trim, and it undoes itself when the
    // reason for it goes away.
    return { ...makeSession(session.date, weekStart, schedule[weekdayOf(session.date)], ctx), id: session.id };
  });

  const plan = applyRules(rebuilt, ctx);
  saveWeek(plan.sessions);

  // Reasons for days still to come are re-derived every time, so clear the old ones rather
  // than leaving a trail of superseded explanations. Past days keep their history.
  db.delete(planChanges).where(and(eq(planChanges.weekStart, weekStart), gte(planChanges.date, today))).run();
  const known = new Set(changesForWeek(weekStart).map((c) => `${c.ruleId}|${c.date}|${c.reason}`));
  recordChanges(
    weekStart,
    plan.changes.filter((c) => c.date >= today || !known.has(`${c.ruleId}|${c.date}|${c.reason}`)),
  );
}

/** Both the current week and the one after it, after a template change. */
export function rebuildFromToday(today: DateKey = todayKey()): void {
  rebuildUpcomingDays(startOfWeek(today), today);
  const next = addDays(startOfWeek(today), 7);
  if (weekSessions(next).length > 0) rebuildUpcomingDays(next, today);
}

/** Applies the morning check-in and readiness to today's session. */
export function adjustToday(date: DateKey = todayKey()): void {
  const session = sessionOnDate(date);
  if (!session) return;
  const { session: next, changes } = adjustForDay(session, gatherDayContext(date));
  if (next === session) return;
  saveWeek([next]);
  const known = new Set(changesForWeek(session.weekStart).map((c) => `${c.ruleId}|${c.date}|${c.reason}`));
  recordChanges(session.weekStart, changes.filter((c) => !known.has(`${c.ruleId}|${c.date}|${c.reason}`)));
}

export function markSessionDay(date: DateKey, status: 'sick' | 'travel' | 'skipped'): void {
  const weekStart = startOfWeek(date);
  const sessions = ensureWeek(weekStart);
  const result = markDay(sessions, date, status, gatherWeekContext(weekStart));
  saveWeek(result.sessions);
  recordChanges(weekStart, result.changes);
}

export function moveSessionTo(fromDate: DateKey, toDate: DateKey): void {
  const weekStart = startOfWeek(fromDate);
  if (startOfWeek(toDate) !== weekStart) return;
  const sessions = ensureWeek(weekStart);
  const result = moveSession(sessions, fromDate, toDate, gatherWeekContext(weekStart));
  saveWeek(result.sessions);
  recordChanges(weekStart, result.changes);
}

export function setSessionStatus(id: number, status: SessionStatus, activityId?: number | null): void {
  db.update(plannedSessions).set({ status, ...(activityId !== undefined ? { activityId } : {}) }).where(eq(plannedSessions.id, id)).run();
}

/** Marks run, swim, tennis and strength sessions done when a matching activity exists on that day. */
export function linkActivitiesToSessions(from: DateKey, to: DateKey): void {
  const rows = db.select().from(plannedSessions).where(and(gte(plannedSessions.date, from), lte(plannedSessions.date, to), eq(plannedSessions.status, 'planned'))).all();
  for (const row of rows) {
    const kind = SESSION_TYPES[row.sessionType].kind;
    if (kind !== 'run' && kind !== 'swim' && kind !== 'tennis' && kind !== 'strength') continue;
    const match = db
      .select()
      .from(activities)
      .where(and(eq(activities.date, row.date), eq(activities.type, kind)))
      .all()
      .find((a) => a.duplicateOf === null);
    if (match) db.update(plannedSessions).set({ status: 'done', activityId: match.id }).where(eq(plannedSessions.id, row.id)).run();
  }
}

/** Runs the rebuild for the coming week on Sunday evening (or any time after), so the review can preview it. */
export function ensureNextWeek(today: DateKey = todayKey()): PlannedSession[] {
  return ensureWeek(addDays(startOfWeek(today), 7), today);
}

export function weekDatesOf(weekStart: DateKey): DateKey[] {
  return weekDates(weekStart);
}
