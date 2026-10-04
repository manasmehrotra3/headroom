import { DEFAULT_SCHEDULE, scheduleWarnings, type WeekSchedule } from './schedule';

describe('scheduleWarnings', () => {
  it('accepts the default week', () => {
    expect(scheduleWarnings(DEFAULT_SCHEDULE)).toEqual([]);
  });

  it('flags heavy legs the day before a run', () => {
    const schedule: WeekSchedule = { ...DEFAULT_SCHEDULE, fri: 'strength_lower', sun: 'rest' };
    expect(scheduleWarnings(schedule)).toEqual(["Friday is heavy legs the day before Saturday's run."]);
  });

  it('checks Sunday against the following Monday', () => {
    const schedule: WeekSchedule = { ...DEFAULT_SCHEDULE, sun: 'strength_lower', mon: 'run_easy' };
    expect(scheduleWarnings(schedule)).toContain("Sunday is heavy legs the day before Monday's run.");
  });

  it('flags a week with no recovery day', () => {
    const schedule: WeekSchedule = { ...DEFAULT_SCHEDULE, fri: 'strength_upper' };
    expect(scheduleWarnings(schedule)).toEqual(['There is no rest or mobility day in the week.']);
  });
});
