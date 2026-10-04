/**
 * JSON export / import of every table, for backups and moving to a new phone.
 * The export is a plain file you can keep anywhere; import replaces the current data.
 */
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { db, sqlite } from '@/db/client';
import * as schema from '@/db/schema';
import { todayKey } from '@/domain/dates';

const TABLES = {
  profile: schema.profile,
  settings: schema.settings,
  equipment: schema.equipment,
  schedule_template: schema.scheduleTemplate,
  sync_state: schema.syncState,
  body_measurements: schema.bodyMeasurements,
  progress_photos: schema.progressPhotos,
  workout_logs: schema.workoutLogs,
  set_logs: schema.setLogs,
  activities: schema.activities,
  sleep_sessions: schema.sleepSessions,
  daily_metrics: schema.dailyMetrics,
  checkins: schema.checkins,
  planned_sessions: schema.plannedSessions,
  plan_changes: schema.planChanges,
  run_fitness: schema.runFitness,
  foods: schema.foods,
  food_servings: schema.foodServings,
  recipes: schema.recipes,
  recipe_ingredients: schema.recipeIngredients,
  food_logs: schema.foodLogs,
  favorites: schema.favorites,
  nutrition_targets: schema.nutritionTargets,
  meal_plan_items: schema.mealPlanItems,
} as const;

export interface Backup {
  /** 'fitness' is the old marker, kept so exports made before the app was renamed still import. */
  app: 'headroom' | 'fitness';
  version: 1;
  exportedAt: string;
  tables: Record<string, Record<string, unknown>[]>;
}

/** Dates are stored as epoch ms in SQLite; read the raw rows so the JSON round-trips exactly. */
export function buildBackup(): Backup {
  const tables: Backup['tables'] = {};
  for (const name of Object.keys(TABLES)) tables[name] = sqlite.getAllSync(`SELECT * FROM ${name}`) as Record<string, unknown>[];
  return { app: 'headroom', version: 1, exportedAt: new Date().toISOString(), tables };
}

/** Writes the backup to a file and opens the share sheet (Drive, email, Files…). */
export async function exportBackup(): Promise<string> {
  const backup = buildBackup();
  const uri = `${FileSystem.cacheDirectory}headroom-backup-${todayKey()}.json`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(backup));
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Save your Headroom backup' });
  return uri;
}

/** Picks a backup file and replaces every table with its contents. Photos are not included. */
export async function importBackup(): Promise<{ ok: boolean; message: string }> {
  const picked = await DocumentPicker.getDocumentAsync({ type: ['application/json', '*/*'], copyToCacheDirectory: true });
  if (picked.canceled || !picked.assets[0]) return { ok: false, message: 'Cancelled.' };
  const text = await FileSystem.readAsStringAsync(picked.assets[0].uri);
  let backup: Backup;
  try {
    backup = JSON.parse(text) as Backup;
  } catch {
    return { ok: false, message: 'That file is not valid JSON.' };
  }
  if ((backup.app !== 'headroom' && backup.app !== 'fitness') || !backup.tables) return { ok: false, message: 'That file is not a Headroom backup.' };

  let rows = 0;
  sqlite.withTransactionSync(() => {
    for (const name of Object.keys(TABLES)) {
      const data = backup.tables[name];
      if (!data) continue;
      sqlite.runSync(`DELETE FROM ${name}`);
      for (const row of data) {
        const columns = Object.keys(row);
        if (columns.length === 0) continue;
        sqlite.runSync(
          `INSERT INTO ${name} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
          columns.map((c) => row[c] as string | number | null),
        );
        rows += 1;
      }
    }
  });
  void db;
  return { ok: true, message: `Restored ${rows} rows from ${backup.exportedAt.slice(0, 10)}. Restart the app to be safe.` };
}
