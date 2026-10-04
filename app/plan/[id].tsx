import { and, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TUNABLES } from '@/config/tunables';
import { db } from '@/db/client';
import { exerciseHistory } from '@/db/repos/workoutRepo';
import { activities, planChanges, plannedSessions, workoutLogs } from '@/db/schema';
import { todayKey, WEEKDAY_LABELS, weekdayOf } from '@/domain/dates';
import type { SessionDetail } from '@/domain/plan/types';
import { SESSION_TYPES } from '@/domain/schedule';
import { suggestWeight } from '@/domain/strength/progression';
import { estimateSessionSec } from '@/domain/strength/sessionTime';
import { plannedSets } from '@/domain/strength/workoutBuilder';
import { beginWorkout, previewWorkout, templateName } from '@/features/workout/startWorkout';
import { Body, Button, Card, Screen, SectionLabel, Title } from '@/ui/components';
import { formatLb, formatLongDate } from '@/ui/format';
import { colors, font, space } from '@/ui/theme';

const STATUS_NOTE: Partial<Record<string, string>> = {
  done: 'Done.',
  skipped: 'Skipped. Nothing was moved.',
  sick: 'Sick day.',
  travel: 'Travel day.',
  dropped: "Dropped: it didn't fit anywhere without breaking a rule.",
};

/**
 * The whole plan for one day, read only: what was scheduled, why it looks like this, and the
 * full structure. Runs and rides have their own screens; this covers strength, mobility,
 * tennis and rest days.
 */
export default function PlanDayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = Number(id);
  const today = todayKey();

  const { data: rows } = useLiveQuery(db.select().from(plannedSessions).where(eq(plannedSessions.id, sessionId)), [sessionId]);
  const row = rows[0];
  const date = row?.date ?? '';
  const { data: changeRows } = useLiveQuery(db.select().from(planChanges).where(eq(planChanges.date, date)), [date]);
  const { data: workoutRows } = useLiveQuery(db.select().from(workoutLogs).where(eq(workoutLogs.plannedSessionId, sessionId)), [sessionId]);
  const { data: activityRows } = useLiveQuery(
    db
      .select()
      .from(activities)
      .where(and(eq(activities.date, date), eq(activities.plannedSessionId, sessionId))),
    [date, sessionId],
  );

  const detail = row?.detail as unknown as SessionDetail | undefined;
  const isStrength = detail?.kind === 'strength' || detail?.kind === 'mobility';

  // Built with today's equipment and pain areas, exactly as Start would build it.
  const built = useMemo(() => (row && isStrength ? previewWorkout(row.sessionType, row.variant) : null), [row?.sessionType, row?.variant, isStrength]);
  const suggestions = useMemo(
    () =>
      built?.exercises.map((e) =>
        suggestWeight(
          e.exercise,
          e.reps,
          exerciseHistory(e.exercise.id, null, 4).map((h) => ({ sets: h.sets })),
        ),
      ) ?? [],
    [built],
  );

  if (!row || !detail) {
    return (
      <Screen edges={['bottom']}>
        <Body dim>That day isn't in the plan any more.</Body>
      </Screen>
    );
  }

  const type = SESSION_TYPES[row.sessionType];
  const heading = templateName(row.sessionType) ?? type.label;
  const variant = row.variant === 'easy' ? 'easy version' : row.variant === 'deload' ? 'deload week' : null;
  const subtitle = [
    formatLongDate(row.date),
    row.sessionType === 'rest' ? 'rest' : `${row.targetMin} min`,
    variant,
    row.addOn ? `+${TUNABLES.plan.addOnMin} min core add-on` : null,
    row.movedFrom ? `moved from ${WEEKDAY_LABELS[weekdayOf(row.movedFrom)]}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const workout = workoutRows.find((w) => w.status !== 'abandoned');
  const estimateMin = built ? Math.round(estimateSessionSec(built.exercises) / 60) : null;

  return (
    <>
      <Stack.Screen options={{ title: heading }} />
      <Screen edges={['bottom']}>
        <Title subtitle={subtitle}>{heading}</Title>
        {row.status !== 'planned' ? <Body>{STATUS_NOTE[row.status]}</Body> : null}
        {row.reason ? <Body dim>{row.reason}</Body> : null}

        {isStrength && built ? (
          <>
            <SectionLabel>
              {built.exercises.length} exercises · {plannedSets(built.exercises)} sets
            </SectionLabel>
            {built.exercises.map((e, i) => {
              const suggestion = suggestions[i];
              const unit = e.exercise.loadType === 'time' ? 's' : 'reps';
              // A fixed prescription (10 reps, not 8-12) reads better as one number.
              const range = e.reps[0] === e.reps[1] ? `${e.reps[0]}` : `${e.reps[0]}–${e.reps[1]}`;
              return (
                <Pressable key={e.exercise.id} onPress={() => router.push(`/exercises/${e.exercise.id}`)}>
                  <Card>
                    <View style={styles.row}>
                      <Text style={styles.name} numberOfLines={2}>
                        {i + 1}. {e.exercise.name}
                      </Text>
                      <Text style={styles.sets}>
                        {e.sets} × {range} {unit}
                      </Text>
                    </View>
                    <Body dim>
                      {e.exercise.station} · rest {e.restSec}s{suggestion?.weightKg ? ` · suggested ${formatLb(suggestion.weightKg, 0)}` : ''}
                    </Body>
                    {suggestion?.weightKg ? <Text style={styles.suggestion}>{suggestion.reason}</Text> : null}
                    {e.swapReason ? <Text style={styles.swap}>{e.swapReason}</Text> : null}
                  </Card>
                </Pressable>
              );
            })}
            {built.notes.map((note, i) => (
              <Body key={i} dim>
                • {note}
              </Body>
            ))}
            {estimateMin ? <Body dim>About {estimateMin} min including the warm-up, counting the top of every rep range.</Body> : null}
            <Body dim>Tap an exercise for the setup, cues and alternatives. Weights are rebuilt from your last sessions when you press Start.</Body>
          </>
        ) : null}

        {detail.kind === 'tennis' ? (
          <>
            <SectionLabel>The session</SectionLabel>
            <Card>
              <Body>{row.targetMin} min of tennis.</Body>
              <Body dim>It syncs from the watch on its own if you record it. If you don't, log it by hand so the week's load stays right.</Body>
            </Card>
          </>
        ) : null}

        {detail.kind === 'rest' ? (
          <>
            <SectionLabel>The session</SectionLabel>
            <Card>
              <Body>Nothing scheduled.</Body>
              <Body dim>Walking, stretching and an early night all count. A rest day is what makes the rest of the week work.</Body>
            </Card>
          </>
        ) : null}

        {row.addOn ? (
          <Card style={{ borderColor: colors.info }}>
            <Text style={styles.name}>Core & hips add-on: {TUNABLES.plan.addOnMin} min</Text>
            <Body dim>There's room under the {TUNABLES.schedule.dailyCapMin}-minute cap for it. Start it after the main session.</Body>
          </Card>
        ) : null}

        {activityRows.length > 0 ? (
          <>
            <SectionLabel>What you actually did</SectionLabel>
            {activityRows.map((a) => (
              <Card key={a.id}>
                <Body>
                  {a.title ?? a.type} · {Math.round(a.durationSec / 60)} min
                  {a.avgHr ? ` · avg HR ${a.avgHr}` : ''}
                </Body>
              </Card>
            ))}
          </>
        ) : null}

        {changeRows.length > 0 ? (
          <>
            <SectionLabel>Why this day looks like this</SectionLabel>
            {[...changeRows]
              .reverse()
              // One line per rule: the newest reason replaces the ones it superseded.
              .filter((c, i, all) => all.findIndex((other) => other.ruleId === c.ruleId) === i)
              .map((c) => (
                <Body key={c.id} dim>
                  • {c.reason}
                </Body>
              ))}
          </>
        ) : null}

        {workout ? (
          <Button
            variant={workout.status === 'in_progress' ? 'primary' : 'secondary'}
            label={workout.status === 'in_progress' ? 'Resume this workout' : 'See the logged sets'}
            onPress={() => router.push(`/workout/${workout.id}`)}
          />
        ) : isStrength && row.status === 'planned' && row.date <= today ? (
          <Button
            label="Start the session"
            onPress={() => {
              const { workoutId } = beginWorkout(row.sessionType, row.variant, row.id);
              router.replace(`/workout/${workoutId}`);
            }}
          />
        ) : null}
        {detail.kind === 'tennis' && row.status === 'planned' ? <Button variant="secondary" label="Log tennis" onPress={() => router.push('/log/activity')} /> : null}

        <View style={{ height: space.md }} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  name: { color: colors.text, fontSize: font.body, fontWeight: '600', flexShrink: 1 },
  sets: { color: colors.accent, fontSize: font.body, fontWeight: '600' },
  suggestion: { color: colors.textDim, fontSize: font.small },
  swap: { color: colors.info, fontSize: font.small },
});
