import { eq } from 'drizzle-orm';

import { toDateKey } from '@/domain/dates';

import { db } from '../client';
import { bodyMeasurements } from '../schema';

export function addWeighIn(weightKg: number, measuredAt: Date = new Date(), waistCm: number | null = null): void {
  db.insert(bodyMeasurements)
    .values({ date: toDateKey(measuredAt), measuredAt, weightKg, waistCm, source: 'manual' })
    .run();
}

export function deleteMeasurement(id: number): void {
  db.delete(bodyMeasurements).where(eq(bodyMeasurements.id, id)).run();
}
