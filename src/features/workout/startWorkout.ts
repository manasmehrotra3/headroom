import { WORKOUT_TEMPLATES, TEMPLATE_FOR_SESSION } from '@/data/workoutTemplates';
import { loadAvailableEquipment, loadProfile } from '@/db/repos/profileRepo';
import { inProgressWorkout, startWorkout } from '@/db/repos/workoutRepo';
import { todaysPainAreas } from '@/db/repos/recoveryRepo';
import type { SessionType } from '@/domain/schedule';
import { buildWorkout, type BuildResult, type Variant } from '@/domain/strength/workoutBuilder';

/**
 * The exercise list a strength or mobility session would use, without writing anything.
 *
 * Same inputs as `beginWorkout`, so the read-only plan preview shows exactly what pressing
 * Start would open. Returns null for session types that have no strength template.
 */
export function previewWorkout(sessionType: SessionType, variant: Variant): BuildResult | null {
  const templateId = TEMPLATE_FOR_SESSION[sessionType];
  if (!templateId) return null;
  const template = WORKOUT_TEMPLATES[templateId];

  const profile = loadProfile();
  const painAreas = [...new Set([...(profile?.injuries.map((i) => i.area) ?? []), ...todaysPainAreas()])];

  return buildWorkout({ template, availableEquipment: loadAvailableEquipment(), painAreas, variant });
}

/** The name of the template a session type uses, e.g. "Lower body + core". */
export function templateName(sessionType: SessionType): string | null {
  const templateId = TEMPLATE_FOR_SESSION[sessionType];
  return templateId ? WORKOUT_TEMPLATES[templateId].name : null;
}

/**
 * Builds today's workout for a strength or mobility session and opens it in the database.
 * Returns the id to navigate to. Resumes an open session if one exists.
 */
export function beginWorkout(sessionType: SessionType, variant: Variant, plannedSessionId?: number | null): { workoutId: number; notes: string[] } {
  const open = inProgressWorkout();
  if (open) return { workoutId: open.id, notes: ['Resumed the session you left open.'] };

  const templateId = TEMPLATE_FOR_SESSION[sessionType];
  const built = previewWorkout(sessionType, variant);
  if (!templateId || !built) throw new Error(`No strength template for ${sessionType}`);

  const workoutId = startWorkout({ sessionType, templateId, variant, exercises: built.exercises, plannedSessionId });
  return { workoutId, notes: built.notes };
}
