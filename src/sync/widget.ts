/**
 * Keeps the home and lock screen widget in step with the app, on both platforms.
 *
 * The two work differently. The Android widget reads the app's database itself, so it only needs
 * telling to draw again. An iOS widget runs in its own process and cannot open that database, so
 * the app writes a small JSON snapshot to the App Group they share and asks WidgetKit to redraw.
 *
 * Either way this runs after anything that changes steps, the step goal or VO2 max. Without it,
 * Android would only redraw on its own schedule, half an hour at best, and the widget would sit
 * there showing old numbers long after a sync.
 */
import { ExtensionStorage } from '@bacons/apple-targets';
import { Platform } from 'react-native';

import { refreshAndroidWidget } from '../../modules/widget-refresh';

import { TUNABLES } from '@/config/tunables';
import { loadSettings } from '@/db/repos/profileRepo';
import { getDailyMetrics, vo2PointsBetween } from '@/db/repos/recoveryRepo';
import { addDays, todayKey } from '@/domain/dates';
import { widgetSnapshot } from '@/domain/widget';

/** Must match app.json's ios.entitlements and the widget's Swift code. */
export const APP_GROUP = 'group.com.manasmehrotra.headroom';
/** The key the Swift widget reads. */
export const WIDGET_SNAPSHOT_KEY = 'widget';

export function publishWidget(): void {
  try {
    if (Platform.OS === 'android') {
      refreshAndroidWidget();
      return;
    }
    if (Platform.OS !== 'ios') return;

    const today = todayKey();
    const snapshot = widgetSnapshot({
      today,
      stepsToday: getDailyMetrics(today)?.steps ?? null,
      stepGoal: loadSettings().stepGoal,
      vo2Points: vo2PointsBetween(addDays(today, -TUNABLES.vo2.trendWindowDays), today),
      now: Date.now(),
    });
    // One JSON string rather than separate keys: the storage module saves plain numbers as
    // integers, which would turn a VO2 max of 45.3 into 45.
    new ExtensionStorage(APP_GROUP).set(WIDGET_SNAPSHOT_KEY, JSON.stringify(snapshot));
    ExtensionStorage.reloadWidget();
  } catch {
    // The widget is a nicety; never let it break a sync.
  }
}
