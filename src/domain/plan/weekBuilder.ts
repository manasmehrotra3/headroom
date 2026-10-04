import { TUNABLES } from '../../config/tunables';
import { TEMPLATE_FOR_SESSION } from '../../data/workoutTemplates';
import { bikeFocusForWeek, buildBikeQuality, buildEasySpin, buildLongRide } from '../cycling/workouts';
import { addDays, WEEKDAYS, weekDates, weekdayOf, type DateKey } from '../dates';
import { buildEasyRun, buildQualityRun, qualityFocusForWeek } from '../running/workouts';
import { SESSION_TYPES, isLongSession, type SessionType } from '../schedule';
import { raceWeekSchedule } from './race';
import type { DetailContext, PlannedSession, SessionDetail, WeekContext } from './types';

/** Minutes each session type aims for before any rule adjusts it. */
export function baseTargetMin(type: SessionType, ctx: Pick<WeekContext, 'lastWeekPlanned' | 'race'>): number {
  const p = TUNABLES.plan;
  const c = TUNABLES.cycling;
  switch (type) {
    case 'strength_lower':
    case 'strength_upper':
    case 'strength_light':
      return TUNABLES.schedule.targetSessionMin;

    // Runs start at the starting minutes and grow up to 10% a week toward the cap.
    case 'run_quality':
      if (!ctx.lastWeekPlanned) return p.startingRunMin.quality;
      return Math.min(p.maxRunMin.quality, Math.round(ctx.lastWeekPlanned.quality * (1 + p.maxWeeklyRunGrowth)));
    case 'run_easy':
      if (!ctx.lastWeekPlanned) return p.startingRunMin.easy;
      return Math.min(p.maxRunMin.easy, Math.round(ctx.lastWeekPlanned.easy * (1 + p.maxWeeklyRunGrowth)));

    // Long sessions follow the race progression when there's a race, otherwise a steady default.
    case 'run_long':
      return ctx.race ? ctx.race.longRunMin : TUNABLES.race.startLongRunMin;
    case 'bike_long':
      return ctx.race ? ctx.race.longRideMin || c.defaultLongMin : c.defaultLongMin;

    case 'bike_quality':
      return c.defaultQualityMin;
    case 'bike_easy':
      return c.defaultEasyMin;
    case 'tennis':
      return 90;
    case 'mobility':
      return 15;
    case 'rest':
      return 0;
  }
}

export function detailFor(type: SessionType, targetMin: number, ctx: DetailContext): SessionDetail {
  const phase = ctx.race?.phase ?? 'off_season';
  switch (type) {
    case 'run_quality':
      return buildQualityRun(qualityFocusForWeek(ctx.weekIndex), targetMin, ctx.paces);
    case 'run_easy':
      return buildEasyRun(targetMin, ctx.paces, ctx.weekIndex % 2 === 1);
    case 'run_long':
      // A long run is an easy run with the distance doing the work; strides only when short.
      return buildEasyRun(targetMin, ctx.paces, targetMin <= 60 && ctx.weekIndex % 2 === 1);
    case 'bike_quality':
      // Intervals hold their zones better indoors on the trainer.
      return buildBikeQuality(bikeFocusForWeek(ctx.weekIndex), targetMin, true);
    case 'bike_easy':
      return buildEasySpin(targetMin, true);
    case 'bike_long':
      // Long rides go outdoors; tempo blocks appear once base is done.
      return buildLongRide(targetMin, ctx.race?.brickRunMin ?? 0, phase === 'build' || phase === 'peak', false);
    case 'strength_lower':
    case 'strength_upper':
    case 'strength_light':
      return { kind: 'strength', templateId: TEMPLATE_FOR_SESSION[type]! };
    case 'mobility':
      return { kind: 'mobility', templateId: TEMPLATE_FOR_SESSION.mobility! };
    case 'tennis':
      return { kind: 'tennis' };
    case 'rest':
      return { kind: 'rest' };
  }
}

export function makeSession(date: DateKey, weekStart: DateKey, type: SessionType, ctx: WeekContext): PlannedSession {
  const targetMin = baseTargetMin(type, ctx);
  return { date, weekStart, sessionType: type, status: 'planned', variant: 'normal', targetMin, detail: detailFor(type, targetMin, ctx), reason: '', movedFrom: null, addOn: false };
}

/** The week that applies: your own template, or the race template when a race is booked. */
export function scheduleFor(ctx: WeekContext) {
  if (ctx.race && ctx.useRaceTemplate && ctx.race.phase !== 'off_season') return raceWeekSchedule(ctx.race.race.type, ctx.schedule);
  return ctx.schedule;
}

/** The week straight from the template, before any rule runs. */
export function buildBaseWeek(ctx: WeekContext): PlannedSession[] {
  const schedule = scheduleFor(ctx);
  return weekDates(ctx.weekStart).map((date) => makeSession(date, ctx.weekStart, schedule[weekdayOf(date)], ctx));
}

export const isRun = (s: PlannedSession) => SESSION_TYPES[s.sessionType].kind === 'run';
export const isBike = (s: PlannedSession) => SESSION_TYPES[s.sessionType].kind === 'bike';
export const isEndurance = (s: PlannedSession) => SESSION_TYPES[s.sessionType].endurance;
export const isStrength = (s: PlannedSession) => SESSION_TYPES[s.sessionType].kind === 'strength';
export const isHeavyLower = (s: PlannedSession) => SESSION_TYPES[s.sessionType].heavyLower && s.status === 'planned';
export const isFreeDay = (s: PlannedSession) => s.sessionType === 'rest' || s.sessionType === 'mobility';
export const isLong = (s: PlannedSession) => isLongSession(s.sessionType);

export function sessionOn(sessions: PlannedSession[], date: DateKey): PlannedSession | undefined {
  return sessions.find((s) => s.date === date);
}

export function nextDay(date: DateKey): DateKey {
  return addDays(date, 1);
}

export { WEEKDAYS };
