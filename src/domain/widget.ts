/**
 * What the iOS home and lock screen widget shows, computed here so the widget itself only
 * formats. The Android widget reads the database directly; iOS widgets can't reach the app's
 * database, so the app hands them this small snapshot instead.
 *
 * Keeping the VO2 max trend here means it uses the same window and noise threshold as the app,
 * from tunables, rather than a copy of those numbers in Swift.
 */
import type { DateKey } from './dates';
import { vo2Summary, type Vo2Point, type Vo2Trend } from './vo2';

export interface WidgetSnapshot {
  steps: number | null;
  stepGoal: number;
  vo2: number | null;
  vo2Change: number | null;
  vo2Trend: Vo2Trend;
  /** When the numbers were last refreshed, epoch ms. */
  updatedAt: number;
}

export function widgetSnapshot(input: { today: DateKey; stepsToday: number | null; stepGoal: number; vo2Points: Vo2Point[]; now: number }): WidgetSnapshot {
  const vo2 = vo2Summary(input.vo2Points, input.today);
  return {
    // Whole numbers only: the widget decodes steps as an integer.
    steps: input.stepsToday === null ? null : Math.round(input.stepsToday),
    stepGoal: Math.max(1, Math.round(input.stepGoal)),
    vo2: vo2.latest ? Math.round(vo2.latest.vo2Max * 10) / 10 : null,
    vo2Change: vo2.change,
    vo2Trend: vo2.trend,
    updatedAt: input.now,
  };
}
