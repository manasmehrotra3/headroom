/**
 * Local notifications: the rest timer (so it fires with the screen locked) and the daily
 * morning digest / evening preview. Everything is scheduled on the phone; nothing goes online.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CHANNEL_REST = 'rest-timer';
const CHANNEL_DIGEST = 'daily-digest';

export const NOTIFICATION_IDS = {
  rest: 'rest-timer',
  morning: 'morning-digest',
  evening: 'evening-preview',
} as const;

let configured = false;

/** Call once at app start. Safe to call again. */
export async function configureNotifications(): Promise<void> {
  if (configured) return;
  configured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_REST, {
      name: 'Rest timer',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 400, 200, 400],
      enableVibrate: true,
    });
    await Notifications.setNotificationChannelAsync(CHANNEL_DIGEST, {
      name: 'Daily digest',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/** Fires when the rest ends, even if the screen is locked. Cancel with cancelRestNotification. */
export async function scheduleRestNotification(seconds: number, nextUp: string): Promise<void> {
  await cancelRestNotification();
  if (seconds < 1) return;
  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_IDS.rest,
    content: { title: 'Rest over', body: `Next: ${nextUp}`, vibrate: [0, 400, 200, 400] },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.round(seconds), channelId: CHANNEL_REST },
  });
}

export async function cancelRestNotification(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.rest).catch(() => undefined);
}

/** Replaces the daily notification with the given id: repeats every day at hour:minute. */
export async function scheduleDaily(id: string, hour: number, minute: number, title: string, body: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL_DIGEST },
  });
}

export async function cancelDaily(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
}
