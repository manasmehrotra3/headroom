/**
 * The one-line morning digest and the evening preview of tomorrow, as notification text,
 * and the scheduling of both.
 */
import { loadSettings } from '@/db/repos/profileRepo';
import { ensureNextWeek, ensureWeek, sessionOnDate } from '@/db/repos/planRepo';
import { getDailyMetrics } from '@/db/repos/recoveryRepo';
import { dayTargets, plannedMealsOn } from '@/db/repos/nutritionRepo';
import { addDays, parseTimeOfDay, startOfWeek, todayKey, type DateKey } from '@/domain/dates';
import { ACWR_LABELS, type AcwrLabel } from '@/domain/load';
import type { PlannedSession } from '@/domain/plan/types';
import { READINESS_LABELS, type ReadinessBand } from '@/domain/readiness';
import { SESSION_TYPES } from '@/domain/schedule';

import { NOTIFICATION_IDS, cancelDaily, ensureNotificationPermission, scheduleDaily } from './notifications';

export function sessionLine(session: PlannedSession | undefined): string {
  if (!session) return 'No session planned';
  if (session.status === 'sick' || session.status === 'travel' || session.status === 'skipped') return `${SESSION_TYPES[session.sessionType].label} (${session.status})`;
  if (session.sessionType === 'rest') return 'Rest day';
  const variant = session.variant === 'easy' ? ' (easy version)' : session.variant === 'deload' ? ' (deload)' : '';
  const title = session.detail.kind === 'run' || session.detail.kind === 'bike' ? session.detail.title : SESSION_TYPES[session.sessionType].label;
  return `${title}${variant}, ${session.targetMin} min`;
}

/** e.g. "Sleep 82 · Readiness good · Load sweet spot · Lower body + core, 45 min · 1,900 kcal / 150 g protein" */
export function morningDigestLine(date: DateKey = todayKey()): string {
  const metrics = getDailyMetrics(date);
  const band = (metrics?.readinessBreakdown as { band?: ReadinessBand } | null)?.band ?? 'unknown';
  const acwrLabel: AcwrLabel = metrics?.acwr === null || metrics?.acwr === undefined ? 'insufficient' : metrics.acwr < 0.8 ? 'low' : metrics.acwr <= 1.3 ? 'sweet_spot' : metrics.acwr <= 1.5 ? 'caution' : 'high';
  const parts = [
    metrics?.sleepScore !== null && metrics?.sleepScore !== undefined ? `Sleep ${metrics.sleepScore}` : null,
    band !== 'unknown' ? `Readiness ${READINESS_LABELS[band].toLowerCase()}` : null,
    acwrLabel !== 'insufficient' ? `Load ${ACWR_LABELS[acwrLabel].toLowerCase()}` : null,
    sessionLine(sessionOnDate(date)),
  ].filter(Boolean);
  const targets = dayTargets(date);
  if (targets) parts.push(`${Math.round(targets.kcal)} kcal / ${Math.round(targets.proteinG)} g protein`);
  return parts.join(' · ');
}

/** e.g. "Tomorrow: Tempo run, 33 min · Meals: poha, rajma chawal, curd + sprouts, paneer bhurji" */
export function eveningPreviewLine(date: DateKey = todayKey()): string {
  const tomorrow = addDays(date, 1);
  const session = sessionOnDate(tomorrow);
  const meals = plannedMealsOn(tomorrow).map((m) => m.name);
  const parts = [`Tomorrow: ${sessionLine(session)}`];
  if (meals.length) parts.push(`Meals: ${meals.join(', ')}`);
  return parts.join(' · ');
}

/** (Re)schedules both daily notifications with today's text. Called after every sync. */
export async function scheduleDailyNotifications(): Promise<void> {
  const settings = loadSettings();
  const morning = parseTimeOfDay(settings.notificationTime);
  const evening = settings.eveningPreviewTime ? parseTimeOfDay(settings.eveningPreviewTime) : null;
  if (morning === null && evening === null) return;
  if (!(await ensureNotificationPermission())) return;

  const today = todayKey();
  ensureWeek(startOfWeek(today), today);
  // The evening preview may describe next Monday, so the coming week must exist by Sunday.
  ensureNextWeek(today);

  if (morning !== null) {
    await scheduleDaily(NOTIFICATION_IDS.morning, Math.floor(morning / 60), morning % 60, 'Good morning', morningDigestLine(today));
  } else {
    await cancelDaily(NOTIFICATION_IDS.morning);
  }
  if (evening !== null) {
    await scheduleDaily(NOTIFICATION_IDS.evening, Math.floor(evening / 60), evening % 60, 'Tomorrow', eveningPreviewLine(today));
  } else {
    await cancelDaily(NOTIFICATION_IDS.evening);
  }
}
