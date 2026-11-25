import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { eq } from 'drizzle-orm';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { db } from '@/db/client';
import { ensureWeek, markSessionDay, moveSessionTo } from '@/db/repos/planRepo';
import { currentRaceContext } from '@/db/repos/raceRepo';
import { inProgressWorkout } from '@/db/repos/workoutRepo';
import { PHASE_LABELS, RACE_TYPES, raceCountdown } from '@/domain/plan/race';
import { planChanges, plannedSessions, races, workoutLogs } from '@/db/schema';
import { useDbValue } from '@/db/useDbValue';
import { addDays, startOfWeek, todayKey, WEEKDAY_LABELS, weekdayOf, type DateKey } from '@/domain/dates';
import type { PlannedSession, SessionDetail } from '@/domain/plan/types';
import { SessionCard } from '@/features/plan/SessionCard';
import { TabHeader } from '@/features/navigation/TabHeader';
import { Body, Button, Card, RowLink, Screen, SectionLabel } from '@/ui/components';
import { formatMonthDay } from '@/ui/format';
import { colors, font, radius, space, TAP_MIN } from '@/ui/theme';

export default function TrainTab() {
  const today = todayKey();
  const [weekStart, setWeekStart] = useState(startOfWeek(today));
  useState(() => ensureWeek(weekStart, today));

  const { data: rows } = useLiveQuery(db.select().from(plannedSessions).where(eq(plannedSessions.weekStart, weekStart)), [weekStart]);
  const { data: changeRows } = useLiveQuery(db.select().from(planChanges).where(eq(planChanges.weekStart, weekStart)), [weekStart]);
  const [actionsFor, setActionsFor] = useState<PlannedSession | null>(null);
  const [moving, setMoving] = useState(false);
  // Watched so the derived reads below re-run when these tables change; the rows are unused.
  const { updatedAt: workoutsAt } = useLiveQuery(db.select({ id: workoutLogs.id }).from(workoutLogs).where(eq(workoutLogs.status, 'in_progress')));
  const { updatedAt: racesAt } = useLiveQuery(db.select({ id: races.id }).from(races));

  const open = useDbValue(() => inProgressWorkout(), [workoutsAt]);
  const race = useDbValue(() => currentRaceContext(today), [today, racesAt]);

  const sessions: PlannedSession[] = [...rows].sort((a, b) => (a.date < b.date ? -1 : 1)).map((r) => ({ ...r, detail: r.detail as unknown as SessionDetail }));

  const showWeek = (start: DateKey) => {
    ensureWeek(start, today);
    setWeekStart(start);
  };

  const act = (status: 'sick' | 'travel' | 'skipped') => {
    if (!actionsFor) return;
    markSessionDay(actionsFor.date, status);
    setActionsFor(null);
  };
  const move = (toDate: DateKey) => {
    if (!actionsFor) return;
    moveSessionTo(actionsFor.date, toDate);
    setActionsFor(null);
    setMoving(false);
  };

  const thisWeek = startOfWeek(today);
  const isThisWeek = weekStart === thisWeek;
  const weekTitle = isThisWeek
    ? 'This week'
    : weekStart === addDays(thisWeek, 7)
      ? 'Next week'
      : weekStart === addDays(thisWeek, -7)
        ? 'Last week'
        : `Week of ${formatMonthDay(weekStart)}`;

  return (
    <Screen bottomInset>
      <TabHeader
        title={weekTitle}
        subtitle={isThisWeek ? 'Every change comes with its reason. Tap Move / skip on any day.' : "Preview. Built from this week's data; it refreshes as the week goes on."}
      />
      <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.md }}>
        <View style={{ flex: 1 }}>
          <Button variant="secondary" label="‹ Week" onPress={() => showWeek(addDays(weekStart, -7))} />
        </View>
        <View style={{ flex: 1 }}>
          <Button variant="secondary" label="Week ›" onPress={() => showWeek(addDays(weekStart, 7))} />
        </View>
      </View>

      {race ? (
        <Card style={{ borderColor: colors.info }}>
          <Body>
            {race.race.name} · {RACE_TYPES[race.race.type].short} · {raceCountdown(race)}
          </Body>
          <Body dim>
            {PHASE_LABELS[race.phase]} phase{race.longRideMin ? `, long ride ${race.longRideMin} min` : ''}
            {race.longRunMin ? `, long run ${race.longRunMin} min` : ''}.
          </Body>
          <Button variant="secondary" label="Race plan" onPress={() => router.push('/insights/race')} />
        </Card>
      ) : null}

      {open ? (
        <Card style={{ borderColor: colors.accent }}>
          <Body>A workout is still open.</Body>
          <Button label="Resume workout" onPress={() => router.push(`/workout/${open.id}`)} />
        </Card>
      ) : null}

      {sessions.map((s) => (
        <SessionCard key={s.id} session={s} isToday={s.date === today} onActions={() => setActionsFor(s)} />
      ))}

      {changeRows.length > 0 ? (
        <>
          <SectionLabel>Why the plan looks like this</SectionLabel>
          {[...changeRows]
            .reverse()
            // One line per day and rule: the newest reason replaces the ones it superseded.
            .filter((c, i, all) => all.findIndex((other) => other.date === c.date && other.ruleId === c.ruleId) === i)
            .map((c) => (
              <Body key={c.id} dim>
                • {c.reason}
              </Body>
            ))}
        </>
      ) : null}

      <SectionLabel>More</SectionLabel>
      <RowLink label="Exercise library" onPress={() => router.push('/exercises')} />
      <RowLink label="Log an activity (tennis, walk, yoga…)" onPress={() => router.push('/log/activity')} />
      <RowLink label="Running paces" onPress={() => router.push('/edit/paces')} />
      <RowLink label="Run history" onPress={() => router.push('/insights/runs')} />
      <RowLink label="Races" onPress={() => router.push('/edit/races')} />

      <Modal visible={actionsFor !== null} transparent animationType="slide" onRequestClose={() => setActionsFor(null)}>
        <Pressable style={styles.backdrop} onPress={() => setActionsFor(null)} />
        <View style={styles.sheet}>
          {actionsFor ? (
            <>
              <Text style={styles.sheetTitle}>
                {WEEKDAY_LABELS[weekdayOf(actionsFor.date)]}: {actionsFor.detail.kind === 'run' ? actionsFor.detail.title : actionsFor.sessionType.replace('_', ' ')}
              </Text>
              {moving ? (
                <>
                  <Body dim>Swap with which day?</Body>
                  {sessions
                    .filter((s) => s.date !== actionsFor.date && s.status === 'planned' && s.date >= today)
                    .map((s) => (
                      <Pressable key={s.date} onPress={() => move(s.date)} style={styles.option}>
                        <Text style={styles.optionText}>
                          {WEEKDAY_LABELS[weekdayOf(s.date)]} · {s.detail.kind === 'run' ? s.detail.title : s.sessionType.replace('_', ' ')}
                        </Text>
                      </Pressable>
                    ))}
                  <Button variant="secondary" label="Back" onPress={() => setMoving(false)} />
                </>
              ) : (
                <>
                  <Pressable onPress={() => setMoving(true)} style={styles.option}>
                    <Text style={styles.optionText}>Move to another day</Text>
                  </Pressable>
                  <Pressable onPress={() => act('skipped')} style={styles.option}>
                    <Text style={styles.optionText}>Skip it (nothing moves)</Text>
                  </Pressable>
                  <Pressable onPress={() => act('sick')} style={styles.option}>
                    <Text style={styles.optionText}>Sick day (re-place if a free day fits; next day easy)</Text>
                  </Pressable>
                  <Pressable onPress={() => act('travel')} style={styles.option}>
                    <Text style={styles.optionText}>Travel day (re-place if a free day fits)</Text>
                  </Pressable>
                  <Button variant="secondary" label="Cancel" onPress={() => setActionsFor(null)} />
                </>
              )}
            </>
          ) : null}
        </View>
      </Modal>
      <View style={{ height: space.md }} />
      <Text style={{ color: colors.textDim, fontSize: font.small }}>Changes this week: {changeRows.length}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: colors.sheet, padding: space.lg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, gap: space.sm },
  sheetTitle: { color: colors.text, fontSize: font.large, fontWeight: '600', marginBottom: space.sm, textTransform: 'capitalize' },
  option: { minHeight: TAP_MIN, justifyContent: 'center', paddingHorizontal: space.md, borderRadius: radius.md, backgroundColor: colors.surfaceRaised },
  optionText: { color: colors.text, fontSize: font.body },
});
