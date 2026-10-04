import { desc, eq } from 'drizzle-orm';
import * as FileSystem from 'expo-file-system/legacy';

import { todayKey } from '@/domain/dates';

import { db } from '../client';
import { progressPhotos } from '../schema';

const DIR = `${FileSystem.documentDirectory}progress-photos/`;

/** Copies a picked image into the app's private folder (never synced anywhere) and records it. */
export async function addProgressPhoto(sourceUri: string, note = ''): Promise<void> {
  await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
  const date = todayKey();
  const uri = `${DIR}${date}-${Date.now()}.jpg`;
  await FileSystem.copyAsync({ from: sourceUri, to: uri });
  db.insert(progressPhotos).values({ date, uri, note }).run();
}

export async function deleteProgressPhoto(id: number): Promise<void> {
  const row = db.select().from(progressPhotos).where(eq(progressPhotos.id, id)).get();
  if (!row) return;
  await FileSystem.deleteAsync(row.uri, { idempotent: true });
  db.delete(progressPhotos).where(eq(progressPhotos.id, id)).run();
}

export function listProgressPhotos() {
  return db.select().from(progressPhotos).orderBy(desc(progressPhotos.date), desc(progressPhotos.id)).all();
}
