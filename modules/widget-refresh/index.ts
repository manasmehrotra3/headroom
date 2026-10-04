import { requireOptionalNativeModule } from 'expo-modules-core';

interface WidgetRefreshModule {
  refresh(): number;
}

// Android only. `requireOptional` returns null elsewhere rather than throwing.
const native = requireOptionalNativeModule<WidgetRefreshModule>('WidgetRefresh');

/**
 * Redraws the Android home and lock screen widget now, and reports how many placed widgets were
 * asked to redraw. Zero means the widget is not on a home screen. Does nothing on other platforms.
 */
export function refreshAndroidWidget(): number {
  return native?.refresh() ?? 0;
}
