import { isPlannedSlot, LOG_SLOTS, LOG_SLOT_LABELS, MEAL_SLOT_LABELS, type MealSlot } from './types';

describe('meal slots', () => {
  it('logs into the planned meals plus extras, in the order the day runs', () => {
    expect(LOG_SLOTS).toEqual(['breakfast', 'lunch', 'snack', 'dinner', 'extra']);
  });

  it('labels every slot it can log into', () => {
    for (const slot of LOG_SLOTS) expect(LOG_SLOT_LABELS[slot]).toBeTruthy();
  });

  it('keeps the planned meals' + ' labelled as they were', () => {
    for (const slot of Object.keys(MEAL_SLOT_LABELS) as MealSlot[]) expect(LOG_SLOT_LABELS[slot]).toBe(MEAL_SLOT_LABELS[slot]);
  });

  it('treats only extras as unplanned, so the plan never tries to fill them', () => {
    expect(isPlannedSlot('extra')).toBe(false);
    expect(isPlannedSlot('breakfast')).toBe(true);
    expect(isPlannedSlot('dinner')).toBe(true);
  });
});
