const fs = require('fs');
const path = require('path');
const { AndroidConfig, withAndroidManifest, withDangerousMod, withStringsXml } = require('expo/config-plugins');

/**
 * Home and lock screen widget showing today's steps against your goal, next to the latest
 * VO2 max from the watch and which way it has moved.
 *
 * Widgets can't be written in JavaScript, so this plugin drops a small Kotlin
 * AppWidgetProvider and its layout into the generated android/ project. The widget reads the
 * app's own SQLite database directly (daily_metrics.steps, daily_metrics.vo2_max and
 * settings.step_goal), which means no JavaScript has to run to refresh it: cheap on battery
 * and reliable when Android has put the app to sleep. It refreshes every 30 minutes and
 * whenever you tap it.
 *
 * The numbers are therefore as fresh as the last sync (app open, or the hourly background task).
 *
 * The class and resource names still say "steps" because renaming them would orphan any widget
 * already placed on a home screen.
 */

/**
 * The Kotlin has to live in the app's own package so it can see the generated R class, so both
 * the package statement and the directory are derived from app.json rather than written twice.
 */
const providerKt = (androidPackage) => `package ${androidPackage}

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.widget.RemoteViews
import java.io.File
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Today's steps against the daily goal, plus the latest VO2 max, read straight from the app's
 * database. No JavaScript runs for this: the widget opens headroom.db and reads a few rows.
 */
class StepsWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val views = buildViews(context)
        for (id in appWidgetIds) {
            appWidgetManager.updateAppWidget(id, views)
        }
    }

    private data class StepData(
        val steps: Int?,
        val goal: Int,
        val asOf: Long?,
        val vo2: Double?
    )

    private fun openDatabase(file: File): SQLiteDatabase {
        // Read-write first: expo-sqlite keeps the database in WAL mode, and a strictly
        // read-only connection can fail to open the shared-memory file that WAL needs.
        return try {
            SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READWRITE)
        } catch (error: Exception) {
            SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READONLY)
        }
    }

    private fun readSteps(context: Context): StepData {
        val file = File(context.filesDir, "SQLite/headroom.db")
        if (!file.exists()) return StepData(null, DEFAULT_GOAL, null, null)

        var database: SQLiteDatabase? = null
        try {
            database = openDatabase(file)
            val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

            var steps: Int? = null
            var asOf: Long? = null
            database.rawQuery("SELECT steps, computed_at FROM daily_metrics WHERE date = ?", arrayOf(today)).use { cursor ->
                if (cursor.moveToFirst()) {
                    if (!cursor.isNull(0)) steps = cursor.getInt(0)
                    if (!cursor.isNull(1)) asOf = cursor.getLong(1)
                }
            }

            var goal = DEFAULT_GOAL
            database.rawQuery("SELECT step_goal FROM settings WHERE id = 1", null).use { cursor ->
                if (cursor.moveToFirst() && !cursor.isNull(0)) goal = cursor.getInt(0)
            }

            // VO2 max is written every few runs, not daily, so take the newest reading in the
            // window. The widget shows the number alone; the trend lives in the app.
            var vo2: Double? = null
            val since = SimpleDateFormat("yyyy-MM-dd", Locale.US)
                .format(Date(System.currentTimeMillis() - TREND_WINDOW_DAYS * 86400000L))
            database.rawQuery(
                "SELECT vo2_max FROM daily_metrics WHERE vo2_max IS NOT NULL AND date >= ? ORDER BY date DESC",
                arrayOf(since)
            ).use { cursor ->
                if (cursor.moveToFirst()) vo2 = cursor.getDouble(0)
            }

            return StepData(steps, if (goal > 0) goal else DEFAULT_GOAL, asOf, vo2)
        } catch (error: Exception) {
            return StepData(null, DEFAULT_GOAL, null, null)
        } finally {
            database?.close()
        }
    }

    private fun footerText(data: StepData): String {
        val steps = data.steps ?: return "Open the app to sync"
        val time = if (data.asOf == null) "" else " · " + TIME_FORMAT.format(Date(data.asOf!!))
        if (steps >= data.goal) return "Goal hit" + time
        return NUMBER_FORMAT.format((data.goal - steps).toLong()) + " to go" + time
    }

    private fun buildViews(context: Context): RemoteViews {
        val data = readSteps(context)
        val views = RemoteViews(context.packageName, R.layout.steps_widget)

        views.setTextViewText(R.id.steps_value, if (data.steps == null) "—" else NUMBER_FORMAT.format(data.steps!!.toLong()))
        views.setTextViewText(R.id.steps_goal, "steps of " + NUMBER_FORMAT.format(data.goal.toLong()))
        views.setProgressBar(R.id.steps_progress, data.goal, minOf(data.steps ?: 0, data.goal), false)
        views.setTextViewText(R.id.steps_footer, footerText(data))
        views.setTextViewText(R.id.vo2_value, if (data.vo2 == null) "\u2014" else String.format(Locale.US, "%.1f", data.vo2!!))

        val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
        if (launch != null) {
            val pending = PendingIntent.getActivity(
                context,
                0,
                launch,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
            views.setOnClickPendingIntent(R.id.steps_root, pending)
        }
        return views
    }

    companion object {
        private const val DEFAULT_GOAL = 8000

        // Keep this in step with TUNABLES.vo2 in src/config/tunables.ts.
        private const val TREND_WINDOW_DAYS = 90
        private val NUMBER_FORMAT: NumberFormat = NumberFormat.getIntegerInstance(Locale.US)
        private val TIME_FORMAT = SimpleDateFormat("h:mm a", Locale.US)
    }
}
`;

const WIDGET_LAYOUT = `<?xml version="1.0" encoding="utf-8"?>
<!-- Generated by plugins/withStepsWidget.js -->
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/steps_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/steps_widget_background"
    android:baselineAligned="false"
    android:gravity="center_vertical"
    android:orientation="horizontal"
    android:paddingStart="22dp"
    android:paddingEnd="10dp"
    android:paddingTop="8dp"
    android:paddingBottom="8dp"
    android:theme="@style/Theme.StepsWidget">

    <!-- Steps read like the date on the clock widget: one bold line, quiet detail underneath. -->
    <LinearLayout
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:layout_weight="1"
        android:orientation="vertical">

        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:baselineAligned="true"
            android:orientation="horizontal">

            <TextView
                android:id="@+id/steps_value"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="\u2014"
                android:textColor="#FFFFFF"
                android:textSize="24sp"
                android:textStyle="bold" />

            <TextView
                android:id="@+id/steps_goal"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginStart="7dp"
                android:text=""
                android:textColor="#B8FFFFFF"
                android:textSize="13sp" />
        </LinearLayout>

        <ProgressBar
            android:id="@+id/steps_progress"
            style="?android:attr/progressBarStyleHorizontal"
            android:layout_width="match_parent"
            android:layout_height="5dp"
            android:layout_marginTop="6dp"
            android:layout_marginEnd="8dp"
            android:max="10000"
            android:progress="0"
            android:progressBackgroundTint="#40FFFFFF"
            android:progressTint="#4ADE80" />

        <TextView
            android:id="@+id/steps_footer"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="5dp"
            android:maxLines="1"
            android:text=""
            android:textColor="#99FFFFFF"
            android:textSize="11sp" />
    </LinearLayout>

    <!-- VO2 max in the scalloped disc, the way the weather widget shows its temperature. -->
    <FrameLayout
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginStart="10dp">

        <ImageView
            android:layout_width="78dp"
            android:layout_height="78dp"
            android:contentDescription="@null"
            android:src="@drawable/vo2_badge" />

        <LinearLayout
            android:layout_width="78dp"
            android:layout_height="78dp"
            android:gravity="center"
            android:orientation="vertical">

            <TextView
                android:id="@+id/vo2_value"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="\u2014"
                android:textColor="#FFFFFF"
                android:textSize="24sp"
                android:textStyle="bold" />
        </LinearLayout>
    </FrameLayout>
</LinearLayout>
`;

const WIDGET_INFO = `<?xml version="1.0" encoding="utf-8"?>
<!-- Generated by plugins/withStepsWidget.js -->
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:description="@string/steps_widget_description"
    android:initialLayout="@layout/steps_widget"
    android:minHeight="58dp"
    android:minWidth="180dp"
    android:previewLayout="@layout/steps_widget"
    android:resizeMode="horizontal|vertical"
    android:targetCellHeight="1"
    android:targetCellWidth="3"
    android:updatePeriodMillis="1800000"
    android:widgetCategory="home_screen|keyguard" />
`;

const WIDGET_BACKGROUND = `<?xml version="1.0" encoding="utf-8"?>
<!-- Generated by plugins/withStepsWidget.js -->
<!--
  A capsule like the clock and weather widget: fully rounded ends, and translucent rather than
  solid so the wallpaper shows through and tints it the same way theirs does.
-->
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <corners android:radius="999dp" />
    <solid android:color="#B31E1A16" />
</shape>
`;

/**
 * The scalloped disc the VO2 max number sits in, the same shape as the weather badge.
 *
 * Built here rather than drawn by hand: the outline is the polar curve r = R(1 - a + a·cos(nθ)),
 * which is a circle with `lobes` gentle bumps around it, sampled closely enough to look smooth.
 */
function scallopedDisc(lobes = 12, amplitude = 0.055, samples = 240) {
  const centre = 50;
  const radius = 50;
  const points = [];
  for (let i = 0; i < samples; i++) {
    const angle = (i / samples) * Math.PI * 2;
    const r = radius * (1 - amplitude + amplitude * Math.cos(lobes * angle));
    points.push(`${(centre + r * Math.cos(angle)).toFixed(2)},${(centre + r * Math.sin(angle)).toFixed(2)}`);
  }
  return `M${points.join('L')}Z`;
}

const VO2_BADGE = `<?xml version="1.0" encoding="utf-8"?>
<!-- Generated by plugins/withStepsWidget.js -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="96dp"
    android:height="96dp"
    android:viewportWidth="100"
    android:viewportHeight="100">
    <path android:fillColor="#B7A03A" android:pathData="${scallopedDisc()}" />
</vector>
`;

const WIDGET_THEME = `<?xml version="1.0" encoding="utf-8"?>
<!-- Generated by plugins/withStepsWidget.js -->
<resources>
    <style name="Theme.StepsWidget" parent="@android:style/Theme.DeviceDefault.DayNight" />
</resources>
`;

function write(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
}

module.exports = function withStepsWidget(config) {
  // 1. Drop the Kotlin provider and its resources into the generated project.
  config = withDangerousMod(config, [
    'android',
    (config) => {
      const android = config.modRequest.platformProjectRoot;
      const main = path.join(android, 'app', 'src', 'main');
      const androidPackage = config.android?.package;
      if (!androidPackage) throw new Error('withStepsWidget needs expo.android.package to be set in app.json.');
      write(path.join(main, 'java', androidPackage.replace(/\./g, '/'), 'StepsWidgetProvider.kt'), providerKt(androidPackage));
      write(path.join(main, 'res', 'layout', 'steps_widget.xml'), WIDGET_LAYOUT);
      write(path.join(main, 'res', 'xml', 'steps_widget_info.xml'), WIDGET_INFO);
      write(path.join(main, 'res', 'drawable', 'steps_widget_background.xml'), WIDGET_BACKGROUND);
      write(path.join(main, 'res', 'drawable', 'vo2_badge.xml'), VO2_BADGE);
      write(path.join(main, 'res', 'values', 'steps_widget_theme.xml'), WIDGET_THEME);
      return config;
    },
  ]);

  // 2. The name shown in the widget picker.
  config = withStringsXml(config, (config) => {
    config.modResults = AndroidConfig.Strings.setStringItem(
      [{ $: { name: 'steps_widget_description', translatable: 'false' }, _: 'Steps today and your latest VO2 max' }],
      config.modResults,
    );
    return config;
  });

  // 3. Register the provider so Android offers it in the widget picker.
  return withAndroidManifest(config, (config) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    application.receiver = application.receiver ?? [];
    const already = application.receiver.some((receiver) => receiver.$['android:name'] === '.StepsWidgetProvider');
    if (!already) {
      application.receiver.push({
        // Widget providers must be exported: the broadcast that tells the widget to redraw comes
        // from the system's widget service, not from this app's own process, and a launcher or
        // lock screen can only offer a provider it is allowed to see.
        $: { 'android:name': '.StepsWidgetProvider', 'android:exported': 'true', 'android:label': 'Steps and VO2 max' },
        'intent-filter': [{ action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }] }],
        'meta-data': [{ $: { 'android:name': 'android.appwidget.provider', 'android:resource': '@xml/steps_widget_info' } }],
      });
    }
    return config;
  });
};
