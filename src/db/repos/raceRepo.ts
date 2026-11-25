import { asc, eq } from 'drizzle-orm';

import { ageInYear, todayKey, type DateKey } from '@/domain/dates';
import { bikeZones, type BikeZones } from '@/domain/cycling/workouts';
import { estimateMaxHr } from '@/domain/load';
import { nextRace, raceContext, type Race, type RaceContext } from '@/domain/plan/race';

import { db } from '../client';
import { activities, races } from '../schema';
import { loadProfile } from './profileRepo';

export type RaceRow = typeof races.$inferSelect;

function toRace(row: RaceRow): Race {
  return { id: row.id, name: row.name, type: row.type, date: row.date, priority: row.priority, goalTimeSec: row.goalTimeSec };
}

export function listRaces(): Race[] {
  return db.select().from(races).orderBy(asc(races.date)).all().map(toRace);
}

export function saveRace(race: Race): number {
  if (race.id) {
    db.update(races).set({ name: race.name, type: race.type, date: race.date, priority: race.priority, goalTimeSec: race.goalTimeSec }).where(eq(races.id, race.id)).run();
    return race.id;
  }
  return db
    .insert(races)
    .values({ name: race.name, type: race.type, date: race.date, priority: race.priority, goalTimeSec: race.goalTimeSec, createdAt: new Date() })
    .returning({ id: races.id })
    .get().id;
}

export function deleteRace(id: number): void {
  db.delete(races).where(eq(races.id, id)).run();
}

/** The race the plan is currently built around, with its phase and long-session targets. */
export function currentRaceContext(today: DateKey = todayKey()): RaceContext | null {
  const race = nextRace(listRaces(), today);
  return race ? raceContext(race, today) : null;
}

/** Cycling heart-rate zones, from your max HR (or an age estimate). */
export function currentBikeZones(): BikeZones | null {
  const profile = loadProfile();
  if (!profile) return null;
  return bikeZones(profile.maxHr ?? estimateMaxHr(ageInYear(profile.birthYear)));
}

/** Longest single run and ride actually completed, for the race-readiness check. */
export function longestSessions(): { runMin: number; rideMin: number; swimM: number } {
  const rows = db.select().from(activities).all().filter((a) => a.duplicateOf === null);
  const longest = (type: 'run' | 'cycling') =>
    rows.filter((a) => a.type === type).reduce((max, a) => Math.max(max, a.durationSec / 60), 0);
  const swimM = rows.filter((a) => a.type === 'swim').reduce((max, a) => Math.max(max, a.distanceM ?? 0), 0);
  return { runMin: longest('run'), rideMin: longest('cycling'), swimM };
}

/** Recent rides, for the average-speed estimate used in the race prediction. */
export function recentRides(limit = 20): { distanceM: number | null; durationSec: number }[] {
  return db
    .select()
    .from(activities)
    .where(eq(activities.type, 'cycling'))
    .all()
    .filter((a) => a.duplicateOf === null)
    .slice(-limit)
    .map((a) => ({ distanceM: a.distanceM, durationSec: a.durationSec }));
}
