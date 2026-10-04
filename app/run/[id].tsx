import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Text, View } from 'react-native';

import { db } from '@/db/client';
import { useDbValue } from '@/db/useDbValue';
import { upsertActivity } from '@/db/repos/activityRepo';
import { currentVdot, setSessionStatus } from '@/db/repos/planRepo';
import { activities, plannedSessions } from '@/db/schema';
import type { RunPlan } from '@/domain/running/workouts';
import { compareRun } from '@/domain/running/workouts';
import { formatPace } from '@/domain/units';
import { recomputeRange } from '@/sync/syncService';
import { Body, Button, Card, Screen, SectionLabel, Title } from '@/ui/components';
import { formatLongDate } from '@/ui/format';
import { colors, font, space } from '@/ui/theme';

/** A structured run: warmup, main set, recoveries, cooldown, with paces. Planned vs actual once synced. */
export default function RunScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = Number(id);
  const { data: rows } = useLiveQuery(db.select().from(plannedSessions).where(eq(plannedSessions.id, sessionId)));
  const session = rows[0];
  const { data: activityRows } = useLiveQuery(
    db
      .select()
      .from(activities)
      .where(eq(activities.id, session?.activityId ?? -1)),
    [session?.activityId],
  );
  const activity = activityRows[0];
  const plan = session?.detail as unknown as RunPlan | undefined;
  const vdot = useDbValue(() => currentVdot(), []);

  if (!session || !plan || plan.kind !== 'run') {
    return (
      <Screen edges={['bottom']}>
        <Body dim>Not a run.</Body>
      </Screen>
    );
  }

  const markDone = () =>
    Alert.alert('Mark as done?', "Use this if the watch didn't record it. The planned duration is logged at RPE 5.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark done',
        onPress: () => {
          const startedAt = new Date(`${session.date}T07:00:00`);
          const activityId = upsertActivity({
            source: 'manual',
            type: 'run',
            title: plan.title,
            startedAt,
            endedAt: new Date(startedAt.getTime() + plan.totalMin * 60000),
            rpe: 5,
            rpeEstimated: false,
            plannedSessionId: session.id,
          });
          setSessionStatus(session.id, 'done', activityId);
          recomputeRange(session.date, session.date);
          router.back();
        },
      },
    ]);

  const comparison = activity ? compareRun(plan, { durationSec: activity.durationSec, distanceM: activity.distanceM, avgHr: activity.avgHr }) : null;

  return (
    <>
      <Stack.Screen options={{ title: plan.title }} />
      <Screen edges={['bottom']}>
        <Title subtitle={`${formatLongDate(session.date)} · ${plan.totalMin} min · ≈${plan.estimatedMiles.toFixed(1)} mi`}>{plan.title}</Title>
        {session.reason ? <Body dim>{session.reason}</Body> : null}

        <SectionLabel>Structure</SectionLabel>
        {plan.steps.map((step, i) => (
          <Card key={i}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontSize: font.body, fontWeight: '600', flexShrink: 1 }}>
                {step.reps && step.reps > 1 ? `${step.reps} × ` : ''}
                {step.minutes} min {step.label}
              </Text>
              <Text style={{ color: colors.accent, fontSize: font.body }}>{step.paceSecPerMile ? formatPace(step.paceSecPerMile) : 'by feel'}</Text>
            </View>
          </Card>
        ))}
        <Body dim>
          {vdot ? `Paces from VDOT ${vdot.toFixed(1)}. ` : 'Add a 5K time in Settings → Running to get paces. '}
          Easy should feel conversational; tempo is "comfortably hard"; intervals are hard but repeatable.
        </Body>

        <SectionLabel>Planned vs actual</SectionLabel>
        {comparison ? (
          <Card>
            <Body>{comparison.verdict}</Body>
            <Body dim>
              Distance {comparison.actualMiles?.toFixed(2) ?? '—'} mi vs ≈{comparison.plannedMiles.toFixed(2)} · Time {Math.round(comparison.actualMin)} vs {comparison.plannedMin}{' '}
              min
              {comparison.avgHr ? ` · Avg HR ${comparison.avgHr}` : ''}
              {activity?.trimp ? ` · TRIMP ${Math.round(activity.trimp)}` : ''}
            </Body>
          </Card>
        ) : (
          <Card>
            <Body dim>Once the run syncs from your watch it appears here automatically. If it didn't record, mark it done by hand.</Body>
            {session.status === 'planned' ? <Button variant="secondary" label="Mark as done" onPress={markDone} /> : null}
          </Card>
        )}
        {session.addOn ? (
          <>
            <SectionLabel>After the run</SectionLabel>
            <Body dim>There's room under the cap for the 10-minute core & hips add-on. Start it from the Train tab once you're back.</Body>
          </>
        ) : null}
        <View style={{ height: space.md }} />
      </Screen>
    </>
  );
}
