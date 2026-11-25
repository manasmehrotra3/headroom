import { WEEKDAYS, WEEKDAY_LABELS, nextWeekday, type Weekday } from './dates';

export const SESSION_TYPE_IDS = [
  'strength_lower',
  'strength_upper',
  'strength_light',
  'run_quality',
  'run_easy',
  'run_long',
  'bike_quality',
  'bike_easy',
  'bike_long',
  'swim_technique',
  'swim_endurance',
  'tennis',
  'mobility',
  'rest',
] as const;
export type SessionType = (typeof SESSION_TYPE_IDS)[number];

export type SessionKind = 'strength' | 'run' | 'bike' | 'swim' | 'tennis' | 'mobility' | 'rest';

export const SESSION_TYPES: Record<SessionType, { label: string; kind: SessionKind; heavyLower: boolean; endurance: boolean }> = {
  strength_lower: { label: 'Strength: lower body + core', kind: 'strength', heavyLower: true, endurance: false },
  strength_upper: { label: 'Strength: upper body', kind: 'strength', heavyLower: false, endurance: false },
  strength_light: { label: 'Strength: upper / core / light full body', kind: 'strength', heavyLower: false, endurance: false },
  run_quality: { label: 'Run: quality (intervals, tempo, strides)', kind: 'run', heavyLower: false, endurance: true },
  run_easy: { label: 'Run: easy aerobic', kind: 'run', heavyLower: false, endurance: true },
  run_long: { label: 'Run: long run', kind: 'run', heavyLower: false, endurance: true },
  bike_quality: { label: 'Bike: intervals / tempo', kind: 'bike', heavyLower: false, endurance: true },
  bike_easy: { label: 'Bike: easy spin', kind: 'bike', heavyLower: false, endurance: true },
  bike_long: { label: 'Bike: long ride', kind: 'bike', heavyLower: false, endurance: true },
  swim_technique: { label: 'Swim: technique and drills', kind: 'swim', heavyLower: false, endurance: true },
  swim_endurance: { label: 'Swim: endurance', kind: 'swim', heavyLower: false, endurance: true },
  tennis: { label: 'Tennis', kind: 'tennis', heavyLower: false, endurance: false },
  mobility: { label: 'Mobility (15 min) or rest', kind: 'mobility', heavyLower: false, endurance: false },
  rest: { label: 'Rest', kind: 'rest', heavyLower: false, endurance: false },
};

/** The weekend days that may run past the weekday time cap for one long session. */
export const LONG_SESSION_TYPES: SessionType[] = ['run_long', 'bike_long'];

export const isLongSession = (type: SessionType): boolean => LONG_SESSION_TYPES.includes(type);

/** Which session type each weekday gets by default. The plan engine starts from this. */
export type WeekSchedule = Record<Weekday, SessionType>;

export const DEFAULT_SCHEDULE: WeekSchedule = {
  mon: 'strength_lower',
  tue: 'strength_upper',
  wed: 'run_quality',
  thu: 'strength_light',
  fri: 'mobility',
  sat: 'run_easy',
  sun: 'tennis',
};

/** Human-readable problems with a weekly template. An empty list means it's fine. */
export function scheduleWarnings(schedule: WeekSchedule): string[] {
  const warnings: string[] = [];

  for (const day of WEEKDAYS) {
    const next = nextWeekday(day);
    const nextType = SESSION_TYPES[schedule[next]];
    // Heavy legs before any long endurance day (run or long ride) leaves you flat for it.
    const clashes = nextType.kind === 'run' || schedule[next] === 'bike_long';
    if (SESSION_TYPES[schedule[day]].heavyLower && clashes) {
      warnings.push(`${WEEKDAY_LABELS[day]} is heavy legs the day before ${WEEKDAY_LABELS[next]}'s ${nextType.kind === 'run' ? 'run' : 'long ride'}.`);
    }
  }

  const hasRecoveryDay = WEEKDAYS.some((day) => {
    const kind = SESSION_TYPES[schedule[day]].kind;
    return kind === 'rest' || kind === 'mobility';
  });
  if (!hasRecoveryDay) warnings.push('There is no rest or mobility day in the week.');

  return warnings;
}
