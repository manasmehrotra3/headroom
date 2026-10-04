/**
 * Early-morning background sync so the digest is ready when you wake up.
 * Android runs the task roughly every hour (WorkManager decides exactly when). Between
 * earliestSyncHour and the notification time, if today hasn't been synced yet, it syncs,
 * recomputes, and re-schedules today's notification with the fresh summary.
 */
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import { TUNABLES } from '@/config/tunables';
import { loadSettings } from '@/db/repos/profileRepo';
import { adjustToday, ensureWeek, linkActivitiesToSessions } from '@/db/repos/planRepo';
import { addDays, parseTimeOfDay, startOfWeek, todayKey } from '@/domain/dates';

import { scheduleDailyNotifications } from './digest';
import { activeSource, getSyncValue, setSyncValue, syncNow } from './syncService';

export const BACKGROUND_SYNC_TASK = 'fitness-morning-sync';
const DIGEST_DATE_KEY = 'digestPreparedFor';

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const today = todayKey();
    const now = new Date();
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    const notifyAt = parseTimeOfDay(loadSettings().notificationTime) ?? 390;

    // Only work in the early-morning window, once per day.
    if (minutesNow < TUNABLES.sync.earliestSyncHour * 60 || minutesNow > notifyAt + 60) return BackgroundTask.BackgroundTaskResult.Success;
    if (getSyncValue(DIGEST_DATE_KEY) === today) return BackgroundTask.BackgroundTaskResult.Success;

    ensureWeek(startOfWeek(today), today);
    if (activeSource()) {
      const result = await syncNow();
      if (!result.ok) return BackgroundTask.BackgroundTaskResult.Failed;
      linkActivitiesToSessions(addDays(today, -7), today);
    }
    adjustToday(today);
    await scheduleDailyNotifications();
    setSyncValue(DIGEST_DATE_KEY, today);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundSync(): Promise<void> {
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
    if (await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK)) return;
    await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, { minimumInterval: TUNABLES.sync.backgroundIntervalMin });
  } catch {
    // Background tasks are best-effort; the app also syncs on open.
  }
}
