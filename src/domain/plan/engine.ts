import { TUNABLES } from '../../config/tunables';
import { BODY_AREAS, type BodyArea } from '../bodyAreas';
import { buildEasySpin } from '../cycling/workouts';
import { buildEasyRun } from '../running/workouts';
import { buildSwim } from '../swimming/workouts';
import { BIKE_STOPPING_AREAS, RUN_STOPPING_AREAS, SWIM_STOPPING_AREAS, WEEKLY_RULES } from './rules';
import type { DayContext, DetailContext, PlanChange, PlannedSession, WeekContext } from './types';
import { buildBaseWeek, detailFor, isBike, isRun, isStrength, isSwim } from './weekBuilder';

export interface WeekPlan {
  sessions: PlannedSession[];
  changes: PlanChange[];
}

/** Builds a week from the template and runs every weekly rule in order. */
export function buildWeek(ctx: WeekContext): WeekPlan {
  return applyRules(buildBaseWeek(ctx), ctx);
}

/** Re-runs the rules over an existing week (after a move, a sick day, new load data...). */
export function applyRules(sessions: PlannedSession[], ctx: WeekContext): WeekPlan {
  let current = sessions;
  const changes: PlanChange[] = [];
  for (const { rule } of WEEKLY_RULES) {
    const result = rule(current, ctx);
    current = result.sessions;
    changes.push(...result.changes);
  }
  return { sessions: current, changes };
}

const areaLabel = (area: BodyArea) => BODY_AREAS.find((a) => a.id === area)?.label.toLowerCase() ?? area;

/**
 * Day-of adjustment from the morning check-in and readiness:
 *  - pain in a running area turns a run into mobility; the same for rides on bike-loading areas
 *    and swims on a sore shoulder, neck or elbow
 *  - low readiness swaps in the easier version of the same session, never a skip
 * Returns the session unchanged when nothing applies.
 */
export function adjustForDay(session: PlannedSession, ctx: DayContext): { session: PlannedSession; changes: PlanChange[] } {
  if (session.status !== 'planned' || session.date !== ctx.date) return { session, changes: [] };
  const changes: PlanChange[] = [];
  const detailCtx: DetailContext = { weekIndex: 0, paces: ctx.paces, bikeZones: ctx.bikeZones, race: null };
  let next = session;

  const runStopper = ctx.painAreas.find((a) => RUN_STOPPING_AREAS.includes(a));
  const bikeStopper = ctx.painAreas.find((a) => BIKE_STOPPING_AREAS.includes(a));
  const swimStopper = ctx.painAreas.find((a) => SWIM_STOPPING_AREAS.includes(a));

  if (swimStopper && isSwim(next)) {
    const reason = `Today's swim is mobility instead: you reported ${areaLabel(swimStopper)} pain.`;
    changes.push({ ruleId: 'pain', date: ctx.date, reason });
    next = { ...next, sessionType: 'mobility', targetMin: 15, detail: detailFor('mobility', 15, detailCtx), reason };
  } else if (runStopper && isRun(next)) {
    const reason = `Today's run is mobility instead: you reported ${areaLabel(runStopper)} pain. Never push through pain.`;
    changes.push({ ruleId: 'pain', date: ctx.date, reason });
    next = { ...next, sessionType: 'mobility', targetMin: 15, detail: detailFor('mobility', 15, detailCtx), reason };
  } else if (bikeStopper && isBike(next)) {
    const reason = `Today's ride is mobility instead: you reported ${areaLabel(bikeStopper)} pain.`;
    changes.push({ ruleId: 'pain', date: ctx.date, reason });
    next = { ...next, sessionType: 'mobility', targetMin: 15, detail: detailFor('mobility', 15, detailCtx), reason };
  } else if (ctx.painAreas.length > 0 && isStrength(next)) {
    const reason = `Exercises loading the ${ctx.painAreas.map(areaLabel).join(', ')} are left out today.`;
    changes.push({ ruleId: 'pain', date: ctx.date, reason });
    next = { ...next, reason: next.reason ? `${next.reason} ${reason}` : reason };
  }

  if (ctx.readinessBand === 'low' && next.variant === 'normal') {
    if (isStrength(next)) {
      const reason = `Easier version today: readiness is low. One set fewer on the main lifts, RPE ≤ ${TUNABLES.strength.easyVariant.rpeCap}.`;
      changes.push({ ruleId: 'low_readiness', date: ctx.date, reason });
      next = { ...next, variant: 'easy', reason: next.reason ? `${next.reason} ${reason}` : reason };
    } else if (next.sessionType === 'run_quality') {
      const reason = `Easy run instead of the quality session today: readiness is low. Same time on your feet.`;
      changes.push({ ruleId: 'low_readiness', date: ctx.date, reason });
      next = { ...next, variant: 'easy', detail: buildEasyRun(next.targetMin, ctx.paces, false), reason: next.reason ? `${next.reason} ${reason}` : reason };
    } else if (next.sessionType === 'bike_quality') {
      const reason = `Easy spin instead of the intervals today: readiness is low.`;
      changes.push({ ruleId: 'low_readiness', date: ctx.date, reason });
      next = { ...next, variant: 'easy', detail: buildEasySpin(next.targetMin, true), reason: next.reason ? `${next.reason} ${reason}` : reason };
    } else if (next.sessionType === 'swim_endurance') {
      const reason = `Technique swim instead of the endurance set today: readiness is low. Same time in the water.`;
      changes.push({ ruleId: 'low_readiness', date: ctx.date, reason });
      next = { ...next, variant: 'easy', detail: buildSwim('technique', next.targetMin), reason: next.reason ? `${next.reason} ${reason}` : reason };
    }
  }

  for (const area of ctx.painAreas) {
    const streak = ctx.painStreaks[area] ?? 0;
    if (streak >= TUNABLES.plan.painPhysioDays) {
      changes.push({ ruleId: 'pain_physio', date: ctx.date, reason: `${areaLabel(area)} pain has lasted ${streak} days. Worth seeing a physio rather than training around it.` });
    }
  }

  return { session: next, changes };
}
