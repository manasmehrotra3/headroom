import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { eq } from 'drizzle-orm';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

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
import { Body, Button, Card, RowGroup, RowLink, Screen, SectionLabel } from '@/ui/components';
import { ConnectedButtonGroup, segmentedCorners } from '@/ui/expressive';
import { formatMonthDay } from '@/ui/format';
import { M3Enter, M3Pressable } from '@/ui/motion';
import { colors, font, radius, space, TAP_MIN } from '@/ui/theme';

export default function TrainTab() {
  const today = todayKey();
  const [weekStart, setWeekStart] = useState(startOfWeek(today));
  useState(() => ensureWeek(weekStart, today));

  const { data: rows } = useLiveQuery(db.select().from(plannedSessions).where(eq(plannedSessions.weekStart, weekStart)), [weekStart]);
  const { data: changeRows } = useLiveQuery(db.select().from(planChanges).where(eq(planChanges.weekStart, weekStart)), [weekStart]);
  const [actionsFor, setActionsFor] = useState<PlannedSession | null>(null);
  const [moving, setMoving] = useState(false);
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

  const weekNavValue: 'prev' | 'current' | 'next' =
    weekStart < thisWeek ? 'prev' : weekStart > thisWeek ? 'next' : 'current';

  const onWeekNav = (id: 'prev' | 'current' | 'next') => {
    if (id === 'prev') showWeek(addDays(weekStart, -7));
    else if (id === 'next') showWeek(addDays(weekStart, 7));
    else showWeek(thisWeek);
  };

  const swappableDays = actionsFor
    ? sessions.filter((s) => s.date !== actionsFor.date && s.status === 'planned' && s.date >= today)
    : [];

  return (
    <Screen bottomInset>
      <TabHeader
        title={weekTitle}
        subtitle={isThisWeek ? 'Every change comes with its reason. Tap ▾ on any session to move or skip.' : "Preview built from this week's data."}
      />

      <M3Enter index={0} style={{ marginBottom: space.md }}>
        <ConnectedButtonGroup
          options={[
            { id: 'prev', label: '‹ Prev' },
            { id: 'current', label: 'This week' },
            { id: 'next', label: 'Next ›' },
          ]}
          value={weekNavValue}
          onChange={onWeekNav}
          size="large"
        />
      </M3Enter>

      {race ? (
        <M3Enter index={1}>
          <Card tone="tertiary">
            <View style={styles.raceTop}>
              <Text style={styles.raceTitle}>
                {race.race.name} · {RACE_TYPES[race.race.type].short}
              </Text>
              <View style={styles.racePill}>
                <Text style={styles.racePillText}>{raceCountdown(race)}</Text>
              </View>
            </View>
            <Text style={styles.raceMeta}>
              {PHASE_LABELS[race.phase]} phase{race.longRideMin ? `, long ride ${race.longRideMin} min` : ''}
              {race.longRunMin ? `, long run ${race.longRunMin} min` : ''}.
            </Text>
            <Button variant="primary" label="Open race plan" onPress={() => router.push('/insights/race')} />
          </Card>
        </M3Enter>
      ) : null}

      {open ? (
        <M3Enter index={1}>
          <Card tone="primary">
            <Text style={styles.resumeTitle}>A workout is still open.</Text>
            <Button label="Resume workout" onPress={() => router.push(`/workout/${open.id}`)} />
          </Card>
        </M3Enter>
      ) : null}

      {sessions.map((s, idx) => (
        <M3Enter key={s.id} index={Math.min(idx + 1, 6)}>
          <SessionCard session={s} isToday={s.date === today} onActions={() => setActionsFor(s)} />
        </M3Enter>
      ))}

      {changeRows.length > 0 ? (
        <M3Enter index={6}>
          <SectionLabel>Why the plan looks like this</SectionLabel>
          <Card tone="low">
            {[...changeRows]
              .reverse()
              .filter((c, i, all) => all.findIndex((other) => other.date === c.date && other.ruleId === c.ruleId) === i)
              .map((c) => (
                <Body key={c.id} dim>
                  • {c.reason}
                </Body>
              ))}
          </Card>
        </M3Enter>
      ) : null}

      <SectionLabel>More</SectionLabel>
      <RowGroup>
        <RowLink label="Exercise library" onPress={() => router.push('/exercises')} />
        <RowLink label="Log an activity (tennis, walk, yoga…)" onPress={() => router.push('/log/activity')} />
        <RowLink label="Running paces" onPress={() => router.push('/edit/paces')} />
        <RowLink label="Run history" onPress={() => router.push('/insights/runs')} />
        <RowLink label="Races" onPress={() => router.push('/edit/races')} />
      </RowGroup>

      <Modal visible={actionsFor !== null} transparent animationType="none" onRequestClose={() => { setActionsFor(null); setMoving(false); }}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Animated.View entering={FadeIn.duration(180)} style={styles.backdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => { setActionsFor(null); setMoving(false); }} />
          </Animated.View>
          <Animated.View entering={SlideInDown.springify().damping(20).stiffness(240)} style={styles.sheet}>
            <View style={styles.handle} />
            {actionsFor ? (
              <>
                <Text style={styles.sheetTitle}>
                  {WEEKDAY_LABELS[weekdayOf(actionsFor.date)]}: {actionsFor.detail.kind === 'run' ? actionsFor.detail.title : actionsFor.sessionType.replace('_', ' ')}
                </Text>
                {moving ? (
                  <>
                    <Body dim>Swap with which day?</Body>
                    <View style={styles.segStack}>
                      {swappableDays.map((s, i) => (
                        <M3Pressable
                          key={s.date}
                          onPress={() => move(s.date)}
                          haptic="select"
                          style={[styles.option, segmentedCorners(i === 0, i === swappableDays.length - 1)]}
                        >
                          <Text style={styles.optionText}>
                            {WEEKDAY_LABELS[weekdayOf(s.date)]} · {s.detail.kind === 'run' ? s.detail.title : s.sessionType.replace('_', ' ')}
                          </Text>
                        </M3Pressable>
                      ))}
                    </View>
                    <Button variant="secondary" label="Back" onPress={() => setMoving(false)} />
                  </>
                ) : (
                  <>
                    <View style={styles.segStack}>
                      {[
                        { label: 'Move to another day', onPress: () => setMoving(true) },
                        { label: 'Skip it (nothing moves)', onPress: () => act('skipped') },
                        { label: 'Sick day (re-place + next day easy)', onPress: () => act('sick') },
                        { label: 'Travel day (re-place if a free day fits)', onPress: () => act('travel') },
                      ].map((item, i, all) => (
                        <M3Pressable
                          key={item.label}
                          onPress={item.onPress}
                          haptic="tap"
                          style={[styles.option, segmentedCorners(i === 0, i === all.length - 1)]}
                        >
                          <Text style={styles.optionText}>{item.label}</Text>
                        </M3Pressable>
                      ))}
                    </View>
                    <Button variant="secondary" label="Cancel" onPress={() => setActionsFor(null)} />
                  </>
                )}
              </>
            ) : null}
          </Animated.View>
        </View>
      </Modal>

      <View style={{ height: space.sm }} />
      <Text style={{ color: colors.onSurfaceVariant, fontSize: font.small }}>Changes this week: {changeRows.length}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  raceTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  raceTitle: { color: colors.onTertiaryContainer, fontSize: font.body + 1, fontWeight: '800', flexShrink: 1 },
  racePill: { backgroundColor: 'rgba(0,0,0,0.22)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  racePillText: { color: colors.onTertiaryContainer, fontSize: font.caption + 1, fontWeight: '700' },
  raceMeta: { color: colors.onTertiaryContainer, opacity: 0.86, fontSize: font.small, lineHeight: 19 },
  resumeTitle: { color: colors.onPrimaryContainer, fontSize: font.body + 1, fontWeight: '700' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(6, 10, 14, 0.68)' },
  sheet: {
    backgroundColor: colors.sheet,
    padding: space.lg,
    paddingBottom: space.xxl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    gap: space.md,
  },
  handle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 99, backgroundColor: colors.outlineVariant },
  sheetTitle: { color: colors.onSurface, fontSize: font.large, fontWeight: '800', textTransform: 'capitalize' },
  segStack: { gap: 3 },
  option: {
    minHeight: TAP_MIN,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    backgroundColor: colors.surface,
  },
  optionText: { color: colors.onSurface, fontSize: font.body, fontWeight: '600' },
});
