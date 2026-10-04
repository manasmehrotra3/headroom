import { EQUIPMENT } from '../equipment';
import { EXERCISES } from '../../data/exercises';
import { WORKOUT_TEMPLATES } from '../../data/workoutTemplates';
import { buildWorkout, pickExercise, plannedSets, swapOptions } from './workoutBuilder';

const ALL = EQUIPMENT.map((e) => e.id);

describe('exercise data integrity', () => {
  it('has unique ids and valid alternatives, equipment and images', () => {
    const ids = new Set(EXERCISES.map((e) => e.id));
    expect(ids.size).toBe(EXERCISES.length);
    for (const e of EXERCISES) {
      for (const alt of e.alternatives) expect(ids.has(alt)).toBe(true);
      for (const need of e.needs) expect(ALL).toContain(need);
      expect(e.cues.length).toBeGreaterThanOrEqual(2);
      expect(e.cues.length).toBeLessThanOrEqual(4);
      expect(e.mistakes.length).toBeGreaterThanOrEqual(1);
      expect(e.reps[0]).toBeLessThanOrEqual(e.reps[1]);
    }
    expect(EXERCISES.length).toBeGreaterThanOrEqual(70);
  });

  it('every template slot points at a real exercise', () => {
    for (const template of Object.values(WORKOUT_TEMPLATES)) {
      for (const slot of template.slots) expect(EXERCISES.some((e) => e.id === slot.exerciseId)).toBe(true);
    }
  });
});

describe('pickExercise', () => {
  it('keeps the exercise when everything fits', () => {
    expect(pickExercise('leg_press', { availableEquipment: ALL, painAreas: [] })?.exercise.id).toBe('leg_press');
  });

  it('swaps to the first alternative when the machine is missing', () => {
    const picked = pickExercise('leg_press', { availableEquipment: ALL.filter((id) => id !== 'leg_press'), painAreas: [] });
    expect(picked?.exercise.id).toBe('goblet_squat');
    expect(picked?.swapReason).toContain('equipment not available');
  });

  it('avoids exercises that load a painful area, including alternatives', () => {
    const picked = pickExercise('leg_press', { availableEquipment: ALL, painAreas: ['knee'] });
    expect(picked).toBeNull();
    const rdl = pickExercise('dumbbell_rdl', { availableEquipment: ALL, painAreas: ['knee'] });
    expect(rdl?.exercise.id).toBe('dumbbell_rdl');
  });

  it('skips excluded exercises', () => {
    const picked = pickExercise('chest_press_machine', { availableEquipment: ALL, painAreas: [], excludeIds: ['chest_press_machine'] });
    expect(picked?.exercise.id).toBe('dumbbell_bench_press');
  });
});

describe('buildWorkout', () => {
  const template = WORKOUT_TEMPLATES.lower_core;

  it('builds the full template with all equipment', () => {
    const result = buildWorkout({ template, availableEquipment: ALL, painAreas: [], variant: 'normal' });
    expect(result.exercises.map((e) => e.exercise.id)).toEqual(template.slots.map((s) => s.exerciseId));
    expect(result.notes).toEqual([]);
  });

  it('removes knee-loading work when the knee hurts and explains it', () => {
    const result = buildWorkout({ template, availableEquipment: ALL, painAreas: ['knee'], variant: 'normal' });
    expect(result.exercises.some((e) => e.exercise.loads.includes('knee'))).toBe(false);
    expect(result.notes.some((n) => n.includes('Leg press'))).toBe(true);
  });

  it('never plans the same exercise twice after swaps', () => {
    const noMachines = ALL.filter((id) => !['leg_press', 'leg_curl', 'calf_raise_machine'].includes(id));
    const result = buildWorkout({ template, availableEquipment: noMachines, painAreas: [], variant: 'normal' });
    const ids = result.exercises.map((e) => e.exercise.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('trims sets for easy and deload variants', () => {
    const normal = buildWorkout({ template, availableEquipment: ALL, painAreas: [], variant: 'normal' });
    const easy = buildWorkout({ template, availableEquipment: ALL, painAreas: [], variant: 'easy' });
    const deload = buildWorkout({ template, availableEquipment: ALL, painAreas: [], variant: 'deload' });
    expect(plannedSets(easy.exercises)).toBe(plannedSets(normal.exercises) - 2); // two primaries lose a set
    expect(plannedSets(deload.exercises)).toBeLessThanOrEqual(Math.ceil(plannedSets(normal.exercises) * 0.65));
    expect(easy.notes.at(-1)).toContain('RPE ≤ 7');
  });
});

describe('swapOptions', () => {
  it('offers up to three available alternatives', () => {
    const options = swapOptions(EXERCISES.find((e) => e.id === 'leg_press')!, { availableEquipment: ALL, painAreas: [] });
    expect(options.length).toBeGreaterThanOrEqual(2);
    expect(options.length).toBeLessThanOrEqual(3);
    expect(options.map((e) => e.id)).toContain('goblet_squat');
  });

  it('hides alternatives that need missing equipment', () => {
    const onlyBodyweight = ['mat'] as const;
    const options = swapOptions(EXERCISES.find((e) => e.id === 'leg_press')!, { availableEquipment: [...onlyBodyweight], painAreas: [] });
    expect(options.every((e) => e.needs.every((n) => n === 'mat'))).toBe(true);
  });
});
