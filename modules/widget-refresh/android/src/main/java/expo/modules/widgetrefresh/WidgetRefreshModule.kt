package expo.modules.widgetrefresh

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Intent
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Lets the app redraw its home and lock screen widget straight away.
 *
 * Android only refreshes a widget on its own schedule, which is half an hour at best, so without
 * this the widget kept showing yesterday's steps long after a sync had updated the database. The
 * widget reads that database itself, so all this has to do is tell it to draw again.
 *
 * The broadcast is explicit and stays inside the app, so no other app can trigger or see it.
 */
class WidgetRefreshModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("WidgetRefresh")

    /** Returns the number of placed widgets that were asked to redraw. */
    Function("refresh") {
      val context = appContext.reactContext ?: return@Function 0
      val provider = ComponentName(context.packageName, "${context.packageName}.StepsWidgetProvider")
      val ids = AppWidgetManager.getInstance(context).getAppWidgetIds(provider)
      if (ids.isEmpty()) return@Function 0

      context.sendBroadcast(
        Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE).apply {
          component = provider
          putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
        }
      )
      ids.size
    }
  }
}
