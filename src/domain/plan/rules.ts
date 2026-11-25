/**
 * Weekly plan rules. Each takes the sessions so far and returns adjusted sessions plus
 * one-line reasons. Order matters and is fixed in engine.ts.
 */
import { TUNABLES } from '../../config/tunables';
import { getExercise } from '../../data/exercises';
import { WORKOUT_TEMPLATES } from '../../data/workoutTemplates';
import { BODY_AREAS, type BodyArea } from '../bodyAreas';
import { buildEasySpin } from '../cycling/workouts';
import { WEEKDAY_LABELS, addDays, weekdayOf } from '../dates';
import { buildEasyRun } from '../running/workouts';
import { SESSION_TYPES } from '../schedule';
import { buildSwim } from '../swimming/workouts';
import { weekendCapMin } from './race';
import { detailFor, isBike, isEndurance, isFreeDay, isHeavyLower, isLong, isRun, isStrength, isSwim, sessionOn } from './weekBuilder';
import type { PlanChange, PlannedSession, RuleResult, WeekContext } from './types';

type Rule = (sessions: PlannedSession[], ctx: WeekContext) => RuleResult;

/** Pain here stops you running. */
export const RUN_STOPPING_AREAS: BodyArea[] = ['knee', 'ankle', 'hip', 'foot', 'shin', 'calf', 'hamstring', 'groin'];
/** Pain here also stops you riding; the rest are usually fine on a bike (that's why it's good cross-training). */
export const BIKE_STOPPING_AREAS: BodyArea[] = ['knee', 'hip', 'groin', 'lower_back'];
/** Pain here stops you swimming: freestyle is all shoulder, and a sore neck hates turning to breathe. */
export const SWIM_STOPPING_AREAS: BodyArea[] = ['shoulder', 'neck', 'elbow'];

const areaLabel = (area: BodyArea) => BODY_AREAS.find((a) => a.id === area)?.label.toLowerCase() ?? area;

function setReason(s: PlannedSession, reason: string): PlannedSession {
  return { ...s, reason: s.reason ? `${s.reason} ${reason}` : reason };
}

/**
 * Pain: runs become mobility when a lower-body area hurts, rides too if it's an area that
 * loads on the bike. Strength sessions keep going but the workout builder removes exercises
 * loading that area. Long-lasting pain gets a physio nudge.
 */
export const painRule: Rule = (sessions, ctx) => {
  const changes: PlanChange[] = [];
  if (ctx.painAreas.length === 0) return { sessions, changes };

  const runStopper = ctx.painAreas.find((a) => RUN_STOPPING_AREAS.includes(a));
  const bikeStopper = ctx.painAreas.find((a) => BIKE_STOPPING_AREAS.includes(a));
  const swimStopper = ctx.painAreas.find((a) => SWIM_STOPPING_AREAS.includes(a));

  const out = sessions.map((s) => {
    const upcoming = s.status === 'planned' && s.date >= ctx.today;
    if (!upcoming) return s;

    if (swimStopper && isSwim(s)) {
      const reason = `Swim replaced with mobility because of ${areaLabel(swimStopper)} pain.`;
      changes.push({ ruleId: 'pain', date: s.date, reason });
      return { ...s, sessionType: 'mobility' as const, targetMin: 15, detail: detailFor('mobility', 15, ctx), reason };
    }

    if (runStopper && isRun(s)) {
      const reason = `Run replaced with mobility because of ${areaLabel(runStopper)} pain. Never run through pain.`;
      changes.push({ ruleId: 'pain', date: s.date, reason });
      return { ...s, sessionType: 'mobility' as const, targetMin: 15, detail: detailFor('mobility', 15, ctx), reason };
    }
    if (bikeStopper && isBike(s)) {
      const reason = `Ride replaced with mobility because of ${areaLabel(bikeStopper)} pain.`;
      changes.push({ ruleId: 'pain', date: s.date, reason });
      return { ...s, sessionType: 'mobility' as const, targetMin: 15, detail: detailFor('mobility', 15, ctx), reason };
    }
    if (runStopper && isBike(s) && !bikeStopper) {
      return setReason(s, `Riding is fine with ${areaLabel(runStopper)} pain, so the bike sessions stay.`);
    }
    if (isStrength(s)) {
      const template = WORKOUT_TEMPLATES[(s.detail as { templateId: string }).templateId];
      const affected = template?.slots.filter((slot) => getExercise(slot.exerciseId).loads.some((l) => ctx.painAreas.includes(l))) ?? [];
      if (affected.length > 0) {
        return setReason(s, `Exercises loading the ${ctx.painAreas.map(areaLabel).join(', ')} are swapped out or removed.`);
      }
    }
    return s;
  });

  for (const area of ctx.painAreas) {
    const streak = ctx.painStreaks[area] ?? 0;
    if (streak >= TUNABLES.plan.painPhysioDays) {
      changes.push({ ruleId: 'pain_physio', date: ctx.today, reason: `${areaLabel(area)} pain has lasted ${streak} days. Worth seeing a physio rather than training around it.` });
    }
  }
  return { sessions: out, changes };
};

/** Every 4th week, or earlier after several low-readiness days, is a deload: ~40% less volume. */
export const deloadRule: Rule = (sessions, ctx) => {
  const p = TUNABLES.plan;
  const r = TUNABLES.readiness;
  const scheduled = ctx.weekIndex > 0 && ctx.weekIndex % p.deloadEveryWeeks === p.deloadEveryWeeks - 1;
  const early = ctx.lowReadinessDays >= r.lowDaysForDeload;
  if (!scheduled && !early) return { sessions, changes: [] };

  const why = scheduled ? `Week ${ctx.weekIndex + 1} is a planned deload week` : `Readiness was low on ${ctx.lowReadinessDays} of the last ${r.lowDaysWindow} days`;
  const fraction = TUNABLES.strength.deloadVolumeFraction;
  const changes: PlanChange[] = [{ ruleId: 'deload', date: ctx.weekStart, reason: `${why}: about ${Math.round((1 - fraction) * 100)}% less volume and no hard work.` }];

  const out = sessions.map((s) => {
    if (s.status !== 'planned' || s.date < ctx.today) return s;
    if (isStrength(s)) return setReason({ ...s, variant: 'deload' as const }, 'Deload week: fewer sets, same weights.');
    if (isRun(s)) {
      const targetMin = Math.round(s.targetMin * fraction);
      return setReason({ ...s, targetMin, detail: buildEasyRun(targetMin, ctx.paces, false) }, `Deload week: easy ${targetMin} min instead.`);
    }
    if (isBike(s)) {
      const targetMin = Math.round(s.targetMin * fraction);
      return setReason({ ...s, targetMin, detail: buildEasySpin(targetMin, true) }, `Deload week: easy spin, ${targetMin} min.`);
    }
    if (isSwim(s)) {
      const targetMin = Math.round(s.targetMin * fraction);
      return setReason({ ...s, targetMin, detail: buildSwim('technique', targetMin) }, `Deload week: a short technique swim, ${targetMin} min.`);
    }
    return s;
  });
  return { sessions: out, changes };
};

/** ACWR above the sweet spot: trim the next few sessions. */
export const acwrRule: Rule = (sessions, ctx) => {
  const p = TUNABLES.plan;
  if (ctx.acwr === null || ctx.acwr <= TUNABLES.load.acwrHigh) return { sessions, changes: [] };

  const pct = Math.round(ctx.acwr * 100 - 100);
  const changes: PlanChange[] = [];
  let trimmed = 0;
  const out = sessions.map((s) => {
    if (trimmed >= p.acwrTrimSessions || s.status !== 'planned' || s.date < ctx.today || isFreeDay(s) || s.sessionType === 'tennis') return s;
    trimmed += 1;
    if (isEndurance(s)) {
      const targetMin = Math.max(20, Math.round((s.targetMin * (1 - p.acwrTrimFraction)) / 5) * 5);
      const what = isRun(s) ? 'run' : isSwim(s) ? 'swim' : 'ride';
      const reason = `Cut ${WEEKDAY_LABELS[weekdayOf(s.date)]} ${what} to ${targetMin} min because load is ${pct}% above your 4-week average (ACWR ${ctx.acwr!.toFixed(2)}).`;
      changes.push({ ruleId: 'acwr', date: s.date, reason });
      return setReason({ ...s, targetMin, detail: detailFor(s.sessionType, targetMin, ctx) }, reason);
    }
    const reason = `Easier ${WEEKDAY_LABELS[weekdayOf(s.date)]} session because load is ${pct}% above your 4-week average (ACWR ${ctx.acwr!.toFixed(2)}).`;
    changes.push({ ruleId: 'acwr', date: s.date, reason });
    return setReason({ ...s, variant: s.variant === 'deload' ? 'deload' : ('easy' as const) }, reason);
  });
  return { sessions: out, changes };
};

/** Shared 10%-a-week governor for running and riding volume. */
function volumeRule(
  sessions: PlannedSession[],
  ctx: WeekContext,
  options: { id: string; what: 'run' | 'ride'; matches: (s: PlannedSession) => boolean; lastWeekMin: number; checkIntensity: boolean },
): RuleResult {
  const p = TUNABLES.plan;
  const matching = sessions.filter((s) => options.matches(s) && s.status === 'planned');
  const planned = matching.reduce((sum, s) => sum + s.targetMin, 0);
  if (matching.length === 0 || options.lastWeekMin <= 0) return { sessions, changes: [] };

  const addsIntensity =
    options.checkIntensity && matching.some((s) => s.sessionType === 'run_quality' && s.detail.kind === 'run' && s.detail.focus !== 'easy') && !ctx.lastWeekHadQuality;
  const cap = addsIntensity ? options.lastWeekMin : options.lastWeekMin * (1 + p.maxWeeklyRunGrowth);
  if (planned <= cap + 0.5) return { sessions, changes: [] };

  const scale = cap / planned;
  const why = addsIntensity
    ? "this week adds a hard session, so total time stays at last week's"
    : `weekly ${options.what} time can grow at most ${Math.round(p.maxWeeklyRunGrowth * 100)}%`;
  const changes: PlanChange[] = [];
  const out = sessions.map((s) => {
    if (!options.matches(s) || s.status !== 'planned') return s;
    const targetMin = Math.max(20, Math.floor((s.targetMin * scale) / 5) * 5);
    if (targetMin >= s.targetMin) return s;
    const reason = `${WEEKDAY_LABELS[weekdayOf(s.date)]} ${options.what} held to ${targetMin} min: ${why} (${Math.round(options.lastWeekMin)} min).`;
    changes.push({ ruleId: options.id, date: s.date, reason });
    return setReason({ ...s, targetMin, detail: detailFor(s.sessionType, targetMin, ctx) }, reason);
  });
  return { sessions: out, changes };
}

/**
 * Running volume grows at most 10% week over week, and not at all in a week that adds an
 * intensity element that wasn't there last week.
 */
export const runVolumeRule: Rule = (sessions, ctx) =>
  volumeRule(sessions, ctx, { id: 'run_volume', what: 'run', matches: isRun, lastWeekMin: ctx.lastWeekRunMin, checkIntensity: true });

/** Same governor for the bike, so a long ride can't double overnight. */
export const bikeVolumeRule: Rule = (sessions, ctx) =>
  volumeRule(sessions, ctx, { id: 'bike_volume', what: 'ride', matches: isBike, lastWeekMin: ctx.lastWeekBikeMin, checkIntensity: false });

/** A long or hard Sunday of tennis makes Monday's leg day lighter. */
export const tennisMondayRule: Rule = (sessions, ctx) => {
  const p = TUNABLES.plan;
  const t = ctx.lastTennis;
  if (!t) return { sessions, changes: [] };
  const long = t.durationMin > p.tennisLongMin;
  const hard = (t.rpe ?? 0) >= p.tennisHardRpe;
  if (!long && !hard) return { sessions, changes: [] };

  const monday = sessionOn(sessions, ctx.weekStart);
  if (!monday || !isStrength(monday) || monday.status !== 'planned' || monday.variant !== 'normal') return { sessions, changes: [] };
  const reason = `Lighter Monday: Sunday tennis was ${long ? `${Math.round(t.durationMin)} min` : ''}${long && hard ? ' and ' : ''}${hard ? `RPE ${t.rpe}` : ''}.`;
  return {
    sessions: sessions.map((s) => (s === monday ? setReason({ ...s, variant: 'easy' as const }, reason) : s)),
    changes: [{ ruleId: 'tennis_monday', date: monday.date, reason }],
  };
};

/**
 * Nothing over the daily cap. Weekdays keep the 50-minute rule; the weekend long session
 * gets its own allowance so a 3-hour ride is possible without the cap fighting it.
 */
export const timeCapRule: Rule = (sessions, ctx) => {
  const weekdayCap = TUNABLES.schedule.dailyCapMin;
  const changes: PlanChange[] = [];
  const out = sessions.map((s) => {
    let next = s;
    const cap = isLong(s) ? weekendCapMin(s.targetMin) : weekdayCap;
    if (s.targetMin > cap && s.sessionType !== 'tennis') {
      const reason = `Capped at ${cap} min.`;
      changes.push({ ruleId: 'time_cap', date: s.date, reason });
      next = setReason({ ...s, targetMin: cap, detail: detailFor(s.sessionType, cap, ctx) }, reason);
    }
    if (next.sessionType === 'run_quality') {
      next = { ...next, addOn: next.targetMin + TUNABLES.plan.addOnMin <= weekdayCap };
    }
    return next;
  });
  return { sessions: out, changes };
};

/** No heavy lower body the day before a run or a long ride: that day becomes the light session. */
export const noHeavyLowerBeforeRunRule: Rule = (sessions, ctx) => {
  const changes: PlanChange[] = [];
  const out = sessions.map((s) => {
    if (!isHeavyLower(s)) return s;
    const tomorrow = sessionOn(sessions, addDays(s.date, 1));
    if (!tomorrow || tomorrow.status !== 'planned') return s;
    const clashes = isRun(tomorrow) || isLong(tomorrow);
    if (!clashes) return s;
    const what = isRun(tomorrow) ? 'run' : 'long ride';
    const reason = `${WEEKDAY_LABELS[weekdayOf(s.date)]} switched to the light upper/core session: heavy legs the day before ${WEEKDAY_LABELS[weekdayOf(tomorrow.date)]}'s ${what}.`;
    changes.push({ ruleId: 'no_heavy_lower_before_run', date: s.date, reason });
    return setReason({ ...s, sessionType: 'strength_light' as const, detail: detailFor('strength_light', s.targetMin, ctx) }, reason);
  });
  return { sessions: out, changes };
};

export const WEEKLY_RULES: { id: string; rule: Rule }[] = [
  { id: 'pain', rule: painRule },
  { id: 'deload', rule: deloadRule },
  { id: 'acwr', rule: acwrRule },
  { id: 'run_volume', rule: runVolumeRule },
  { id: 'bike_volume', rule: bikeVolumeRule },
  { id: 'tennis_monday', rule: tennisMondayRule },
  { id: 'no_heavy_lower_before_run', rule: noHeavyLowerBeforeRunRule },
  { id: 'time_cap', rule: timeCapRule },
];

export { SESSION_TYPES };
