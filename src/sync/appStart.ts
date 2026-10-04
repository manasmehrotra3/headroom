/**
 * What happens when the app opens: sync from the data source, make sure this week's plan
 * exists, apply today's check-in, and keep the daily notifications scheduled.
 */
import { addDays, startOfWeek, todayKey } from '@/domain/dates';
import { adjustToday, ensureWeek, linkActivitiesToSessions, maybeReestimateVdot, refreshWeek } from '@/db/repos/planRepo';
import { ensureNutritionTargets } from '@/db/repos/nutritionRepo';

import { registerBackgroundSync } from './backgroundTask';
import { publishWidget } from './widget';
import { configureNotifications } from './notifications';
import { scheduleDailyNotifications } from './digest';
import { activeSource, syncNow } from './syncService';

let started = false;

export async function onAppStart(): Promise<void> {
  const today = todayKey();
  const weekStart = startOfWeek(today);

  // Cheap, synchronous, must happen before screens render their first frame.
  ensureWeek(weekStart, today);
  ensureNutritionTargets(today);
  adjustToday(today);

  if (started) return;
  started = true;

  await configureNotifications();
  await registerBackgroundSync();

  if (activeSource()) {
    await syncNow();
    linkActivitiesToSessions(addDays(today, -7), today);
    maybeReestimateVdot(today);
    refreshWeek(weekStart, today);
    adjustToday(today);
  }
  publishWidget();
  await scheduleDailyNotifications();
}

/** Lighter refresh when the app returns to the foreground during the day. */
export async function onAppForeground(): Promise<void> {
  const today = todayKey();
  ensureWeek(startOfWeek(today), today);
  adjustToday(today);
  if (activeSource()) {
    await syncNow();
    linkActivitiesToSessions(addDays(today, -7), today);
  }
  publishWidget();
  await scheduleDailyNotifications();
}
