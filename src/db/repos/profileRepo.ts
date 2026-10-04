import { eq } from 'drizzle-orm';

import { WEEKDAYS, toDateKey } from '@/domain/dates';
import { EQUIPMENT, type EquipmentId } from '@/domain/equipment';
import type { Profile } from '@/domain/profile';
import { DEFAULT_SCHEDULE, type WeekSchedule } from '@/domain/schedule';

import { db } from '../client';
import { bodyMeasurements, equipment, profile, scheduleTemplate, settings } from '../schema';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbOrTx = typeof db | Tx;

export function loadProfile(): Profile | null {
  const row = db.select().from(profile).get();
  if (!row) return null;
  const { id: _id, updatedAt: _updatedAt, ...rest } = row;
  return rest;
}

export function rowsToSchedule(rows: (typeof scheduleTemplate.$inferSelect)[]): WeekSchedule {
  const schedule: WeekSchedule = { ...DEFAULT_SCHEDULE };
  for (const row of rows) schedule[row.weekday] = row.sessionType;
  return schedule;
}

export function loadSchedule(): WeekSchedule {
  return rowsToSchedule(db.select().from(scheduleTemplate).all());
}

export function loadAvailableEquipment(): EquipmentId[] {
  const available = new Set(
    db
      .select()
      .from(equipment)
      .where(eq(equipment.available, true))
      .all()
      .map((row) => row.id),
  );
  return EQUIPMENT.map((item) => item.id).filter((id) => available.has(id));
}

export function loadSettings() {
  return db.select().from(settings).where(eq(settings.id, 1)).get()!;
}

export function saveProfile(p: Profile, tx: DbOrTx = db): void {
  const row = { ...p, updatedAt: new Date() };
  tx.insert(profile)
    .values({ id: 1, ...row })
    .onConflictDoUpdate({ target: profile.id, set: row })
    .run();
}

export function saveSchedule(schedule: WeekSchedule, tx: DbOrTx = db): void {
  for (const weekday of WEEKDAYS) {
    tx.insert(scheduleTemplate)
      .values({ weekday, sessionType: schedule[weekday] })
      .onConflictDoUpdate({ target: scheduleTemplate.weekday, set: { sessionType: schedule[weekday] } })
      .run();
  }
}

export function saveEquipment(available: EquipmentId[], tx: DbOrTx = db): void {
  tx.update(equipment).set({ available: false }).run();
  for (const id of available) {
    tx.update(equipment).set({ available: true }).where(eq(equipment.id, id)).run();
  }
}

export function saveNotificationTime(time: string, tx: DbOrTx = db): void {
  tx.update(settings).set({ notificationTime: time }).where(eq(settings.id, 1)).run();
}

export interface OnboardingResult {
  profile: Profile;
  schedule: WeekSchedule;
  equipment: EquipmentId[];
  notificationTime: string;
}

/** Saves everything from onboarding in one go and records your starting weight. */
export function completeOnboarding(result: OnboardingResult): void {
  db.transaction((tx) => {
    saveProfile(result.profile, tx);
    saveSchedule(result.schedule, tx);
    saveEquipment(result.equipment, tx);
    saveNotificationTime(result.notificationTime, tx);
    const now = new Date();
    tx.insert(bodyMeasurements)
      .values({ date: toDateKey(now), measuredAt: now, weightKg: result.profile.startWeightKg, source: 'manual' })
      .run();
    tx.update(settings).set({ onboardingComplete: true }).where(eq(settings.id, 1)).run();
  });
}
