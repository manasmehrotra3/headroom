/**
 * Moving, skipping, and sick/travel days. The week is rebalanced without cramming:
 * a missed session only lands on a free day (rest or mobility) that satisfies the rules,
 * otherwise it's dropped with a reason.
 */
import { WEEKDAY_LABELS, addDays, weekdayOf, type DateKey } from '../dates';
import { SESSION_TYPES, type SessionType } from '../schedule';
import type { PlanChange, PlannedSession, WeekContext } from './types';
import { detailFor, isFreeDay, isLong, isRun, makeSession, sessionOn } from './weekBuilder';

/** Which missed sessions are worth re-placing, most important first. */
const PRIORITY: SessionType[] = ['run_quality', 'run_easy', 'strength_lower', 'strength_upper', 'strength_light', 'tennis', 'mobility', 'rest'];

const label = (date: DateKey) => WEEKDAY_LABELS[weekdayOf(date)];

function violates(sessions: PlannedSession[], candidate: PlannedSession): string | null {
  const dayBefore = sessionOn(sessions, addDays(candidate.date, -1));
  const dayAfter = sessionOn(sessions, addDays(candidate.date, 1));
  const heavy = (s?: PlannedSession) => !!s && s.status === 'planned' && SESSION_TYPES[s.sessionType].heavyLower;
  const run = (s?: PlannedSession) => !!s && s.status === 'planned' && isRun(s);
  // A long ride asks as much of the legs as a run, so it gets the same protection.
  const endurance = (s?: PlannedSession) => !!s && s.status === 'planned' && (isRun(s) || isLong(s));
  if (endurance(candidate) && heavy(dayBefore)) return 'heavy legs the day before';
  if (SESSION_TYPES[candidate.sessionType].heavyLower && endurance(dayAfter)) return 'a run or long ride the next day';
  if (isRun(candidate) && (run(dayBefore) || run(dayAfter))) return 'a run on the neighbouring day';
  return null;
}

export interface RescheduleResult {
  sessions: PlannedSession[];
  changes: PlanChange[];
}

/**
 * Marks a day as sick or travel (or skipped) and tries to re-place the lost session on a
 * later free day of the same week. Sick days also make the following day easy.
 */
export function markDay(sessions: PlannedSession[], date: DateKey, status: 'sick' | 'travel' | 'skipped', ctx: WeekContext): RescheduleResult {
  const target = sessionOn(sessions, date);
  if (!target) return { sessions, changes: [] };
  const changes: PlanChange[] = [];
  let out = sessions.map((s) => (s.date === date ? { ...s, status } : s));
  const wording = status === 'sick' ? 'sick day' : status === 'travel' ? 'travelling' : 'skipped';
  changes.push({ ruleId: 'mark_day', date, reason: `${label(date)} marked as ${wording}.` });

  if (status === 'sick') {
    const next = sessionOn(out, addDays(date, 1));
    if (next && next.status === 'planned' && !isFreeDay(next) && next.variant === 'normal') {
      const reason = `${label(next.date)} made easy after a sick day.`;
      out = out.map((s) => (s === next ? { ...s, variant: 'easy', reason: s.reason ? `${s.reason} ${reason}` : reason } : s));
      changes.push({ ruleId: 'sick_recovery', date: next.date, reason });
    }
  }

  if (status !== 'skipped' && !isFreeDay(target) && target.status === 'planned') {
    const placed = placeSession(out, target, ctx);
    out = placed.sessions;
    changes.push(...placed.changes);
  }
  return { sessions: out, changes };
}

/** Finds a free day after `lost.date` this week where the session fits the rules. */
export function placeSession(sessions: PlannedSession[], lost: PlannedSession, ctx: WeekContext): RescheduleResult {
  const candidates = sessions
    .filter((s) => s.date > lost.date && s.date >= ctx.today && s.status === 'planned' && isFreeDay(s))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  for (const free of candidates) {
    const candidate: PlannedSession = { ...makeSession(free.date, ctx.weekStart, lost.sessionType, ctx), targetMin: lost.targetMin, detail: lost.detail, variant: lost.variant, movedFrom: lost.date };
    const problem = violates(sessions.filter((s) => s.date !== free.date), candidate);
    if (problem) continue;
    const reason = `${SESSION_TYPES[lost.sessionType].label} moved from ${label(lost.date)} to ${label(free.date)}.`;
    return {
      sessions: sessions.map((s) => (s === free ? { ...candidate, reason } : s)),
      changes: [{ ruleId: 'reschedule', date: free.date, reason }],
    };
  }
  const reason = `${label(lost.date)}'s ${SESSION_TYPES[lost.sessionType].label.toLowerCase()} dropped this week: no free day fits without cramming.`;
  return { sessions: sessions.map((s) => (s.date === lost.date && s.status === 'planned' ? { ...s, status: 'dropped', reason } : s)), changes: [{ ruleId: 'reschedule', date: lost.date, reason }] };
}

/**
 * Moves a session to another day of the week. The two days swap. A heavy-legs day landing
 * before a run becomes the light session instead, with a reason.
 */
export function moveSession(sessions: PlannedSession[], fromDate: DateKey, toDate: DateKey, ctx: WeekContext): RescheduleResult {
  const from = sessionOn(sessions, fromDate);
  const to = sessionOn(sessions, toDate);
  if (!from || !to || from === to || from.status !== 'planned' || to.status !== 'planned') return { sessions, changes: [] };

  const changes: PlanChange[] = [];
  let out = sessions.map((s) => {
    if (s === from) return { ...to, date: from.date, movedFrom: to.date, reason: '' };
    if (s === to) return { ...from, date: to.date, movedFrom: from.date, reason: '' };
    return s;
  });
  changes.push({ ruleId: 'move', date: toDate, reason: `${SESSION_TYPES[from.sessionType].label} moved from ${label(fromDate)} to ${label(toDate)}.` });

  out = out.map((s) => {
    const problem = s.status === 'planned' && SESSION_TYPES[s.sessionType].heavyLower ? violates(out, s) : null;
    if (!problem) return s;
    const reason = `${label(s.date)} switched to the light upper/core session: ${problem}.`;
    changes.push({ ruleId: 'no_heavy_lower_before_run', date: s.date, reason });
    return { ...s, sessionType: 'strength_light' as const, detail: detailFor('strength_light', s.targetMin, ctx), reason };
  });
  return { sessions: out, changes };
}
