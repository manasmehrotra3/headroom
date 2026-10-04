import { TUNABLES } from '@/config/tunables';
import { WEEKDAYS } from '@/domain/dates';
import { EQUIPMENT } from '@/domain/equipment';
import { DEFAULT_SCHEDULE } from '@/domain/schedule';

import { db } from '../client';
import { equipment, scheduleTemplate, settings } from '../schema';
import { seedFoods } from './nutritionRepo';

/**
 * Creates default rows that must always exist. Safe to run on every launch:
 * existing rows are left alone, and equipment added in an app update shows up ticked.
 */
export function ensureDefaults(): void {
  db.transaction((tx) => {
    tx.insert(settings)
      .values({ id: 1, notificationTime: TUNABLES.defaults.notificationTime })
      .onConflictDoNothing()
      .run();

    for (const weekday of WEEKDAYS) {
      tx.insert(scheduleTemplate)
        .values({ weekday, sessionType: DEFAULT_SCHEDULE[weekday] })
        .onConflictDoNothing()
        .run();
    }

    for (const item of EQUIPMENT) {
      tx.insert(equipment).values({ id: item.id, available: true }).onConflictDoNothing().run();
    }
  });
  seedFoods();
}
