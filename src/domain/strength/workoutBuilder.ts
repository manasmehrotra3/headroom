import { TUNABLES } from '../../config/tunables';
import { EXERCISE_BY_ID } from '../../data/exercises';
import type { BodyArea } from '../bodyAreas';
import type { EquipmentId } from '../equipment';
import type { Exercise, PlannedExercise, WorkoutTemplate } from './types';

export type Variant = 'normal' | 'easy' | 'deload';

export interface BuildInput {
  template: WorkoutTemplate;
  availableEquipment: EquipmentId[];
  /** Areas that hurt (from today's check-in) or are flagged in the profile as injuries. */
  painAreas: BodyArea[];
  variant: Variant;
  /** Exercises removed for this session by the user (e.g. "skip"), with their alternatives skipped too. */
  excludeIds?: string[];
}

export interface BuildResult {
  exercises: PlannedExercise[];
  /** Human-readable notes: what was swapped or removed and why. */
  notes: string[];
}

export function isAvailable(exercise: Exercise, available: EquipmentId[]): boolean {
  return exercise.needs.every((need) => available.includes(need));
}

export function loadsPainArea(exercise: Exercise, painAreas: BodyArea[]): boolean {
  return exercise.loads.some((area) => painAreas.includes(area));
}

/**
 * Picks the exercise itself or the first alternative that fits: equipment ticked, no painful
 * area loaded, not excluded. Returns null when nothing fits.
 */
export function pickExercise(
  exerciseId: string,
  input: Pick<BuildInput, 'availableEquipment' | 'painAreas' | 'excludeIds'>,
): { exercise: Exercise; swapReason?: string } | null {
  const wanted = EXERCISE_BY_ID[exerciseId];
  if (!wanted) return null;
  const excluded = input.excludeIds ?? [];

  const fits = (e: Exercise) =>
    !excluded.includes(e.id) && isAvailable(e, input.availableEquipment) && !loadsPainArea(e, input.painAreas);

  if (fits(wanted)) return { exercise: wanted };

  const whyNot = !isAvailable(wanted, input.availableEquipment)
    ? 'equipment not available'
    : loadsPainArea(wanted, input.painAreas)
      ? 'it loads an area that hurts'
      : 'skipped';

  for (const altId of wanted.alternatives) {
    const alt = EXERCISE_BY_ID[altId];
    if (alt && fits(alt)) return { exercise: alt, swapReason: `Replaces ${wanted.name} (${whyNot}).` };
  }
  return null;
}

/** Alternatives to offer from the Swap button: same muscles, equipment ticked, best first. */
export function swapOptions(exercise: Exercise, input: Pick<BuildInput, 'availableEquipment' | 'painAreas'>): Exercise[] {
  const direct = exercise.alternatives.map((id) => EXERCISE_BY_ID[id]).filter((e): e is Exercise => !!e);
  const sameCategory = Object.values(EXERCISE_BY_ID).filter(
    (e) => e.category === exercise.category && e.id !== exercise.id && !direct.includes(e) && e.muscles[0] === exercise.muscles[0],
  );
  return [...direct, ...sameCategory]
    .filter((e) => isAvailable(e, input.availableEquipment) && !loadsPainArea(e, input.painAreas))
    .slice(0, 3);
}

/**
 * Turns a template into today's exercise list. Applies equipment and pain substitutions, then
 * the variant: easy removes a set from each primary and deload keeps deloadVolumeFraction of sets.
 */
export function buildWorkout(input: BuildInput): BuildResult {
  const s = TUNABLES.strength;
  const notes: string[] = [];
  const exercises: PlannedExercise[] = [];
  const used = new Set<string>();

  for (const slot of input.template.slots) {
    const picked = pickExercise(slot.exerciseId, { ...input, excludeIds: [...(input.excludeIds ?? []), ...used] });
    const original = EXERCISE_BY_ID[slot.exerciseId];
    if (!picked) {
      notes.push(`${original?.name ?? slot.exerciseId} removed: no alternative fits your equipment and today's pain areas.`);
      continue;
    }
    if (picked.swapReason) notes.push(`${picked.exercise.name} ${picked.swapReason.charAt(0).toLowerCase()}${picked.swapReason.slice(1)}`);
    used.add(picked.exercise.id);

    let sets = slot.sets;
    if (input.variant === 'easy' && picked.exercise.tier === 'primary') {
      sets = Math.max(1, sets - s.easyVariant.setsRemovedFromPrimaries);
    } else if (input.variant === 'deload') {
      sets = Math.max(1, Math.round(sets * s.deloadVolumeFraction));
    }

    exercises.push({
      exercise: picked.exercise,
      sets,
      reps: slot.reps ?? picked.exercise.reps,
      restSec: slot.restSec ?? picked.exercise.restSec,
      swapReason: picked.swapReason,
    });
  }

  if (input.variant === 'easy') notes.push(`Easy version: one set fewer on the main lifts, keep every set at RPE ≤ ${s.easyVariant.rpeCap}.`);
  if (input.variant === 'deload') notes.push(`Deload week: about ${Math.round((1 - s.deloadVolumeFraction) * 100)}% fewer sets. Same weights, stop well short of failure.`);

  return { exercises, notes };
}

/** Total planned sets, for the deload/volume maths in the plan engine. */
export function plannedSets(exercises: PlannedExercise[]): number {
  return exercises.reduce((sum, e) => sum + e.sets, 0);
}
