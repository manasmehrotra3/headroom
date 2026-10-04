import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Text, View } from 'react-native';

import { db } from '@/db/client';
import { useDbValue } from '@/db/useDbValue';
import { upsertActivity } from '@/db/repos/activityRepo';
import { setSessionStatus } from '@/db/repos/planRepo';
import { currentBikeZones } from '@/db/repos/raceRepo';
import { activities, plannedSessions } from '@/db/schema';
import { zoneTarget, type BikePlan } from '@/domain/cycling/workouts';
import { formatDuration } from '@/domain/units';
import { metersToMiles } from '@/domain/units';
import { recomputeRange } from '@/sync/syncService';
import { Body, Button, Card, Screen, SectionLabel, Title } from '@/ui/components';
import { formatLongDate } from '@/ui/format';
import { colors, font, space } from '@/ui/theme';

/** A structured ride: warmup, intervals or steady endurance, cooldown, and the brick run. */
export default function RideScreen() {
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
  const plan = session?.detail as unknown as BikePlan | undefined;
  const zones = useDbValue(() => currentBikeZones(), []);

  if (!session || !plan || plan.kind !== 'bike') {
    return (
      <Screen edges={['bottom']}>
        <Body dim>Not a ride.</Body>
      </Screen>
    );
  }

  const markDone = () =>
    Alert.alert('Mark as done?', "Use this if the watch didn't record it. The planned duration is logged at RPE 5.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark done',
        onPress: () => {
          const startedAt = new Date(`${session.date}T08:00:00`);
          const activityId = upsertActivity({
            source: 'manual',
            type: 'cycling',
            title: plan.title,
            startedAt,
            endedAt: new Date(startedAt.getTime() + (plan.totalMin + plan.brickRunMin) * 60000),
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

  return (
    <>
      <Stack.Screen options={{ title: plan.title }} />
      <Screen edges={['bottom']}>
        <Title
          subtitle={`${formatLongDate(session.date)} · ${plan.totalMin} min${plan.brickRunMin ? ` + ${plan.brickRunMin} min run` : ''} · ${plan.indoor ? 'indoors on the trainer' : 'outdoors'}`}
        >
          {plan.title}
        </Title>
        {session.reason ? <Body dim>{session.reason}</Body> : null}

        <SectionLabel>Structure</SectionLabel>
        {plan.steps.map((step, i) => (
          <Card key={i}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontSize: font.body, fontWeight: '600', flexShrink: 1 }}>
                {step.reps && step.reps > 1 ? `${step.reps} × ` : ''}
                {step.minutes} min {step.label}
              </Text>
              <Text style={{ color: colors.accent, fontSize: font.small, textAlign: 'right', flexShrink: 1 }}>{zoneTarget(step.zone, zones)}</Text>
            </View>
            <Body dim>{step.cadence}</Body>
          </Card>
        ))}

        {plan.brickRunMin > 0 ? (
          <Card style={{ borderColor: colors.info }}>
            <Text style={{ color: colors.text, fontSize: font.body, fontWeight: '600' }}>Brick run: {plan.brickRunMin} min straight off the bike</Text>
            <Body dim>Rack the bike and go. The first few minutes feel strange; that's the point. Run easy, shorter strides, higher cadence.</Body>
          </Card>
        ) : null}

        <Body dim>
          {zones
            ? `Zones from an estimated cycling max of ${zones.maxHr} bpm (about 10 below your running max).`
            : 'Add your max heart rate in Settings → Running to get heart-rate zones; until then use the RPE cues.'}
        </Body>

        <SectionLabel>Planned vs actual</SectionLabel>
        {activity ? (
          <Card>
            <Body>
              Rode {activity.distanceM ? `${metersToMiles(activity.distanceM).toFixed(1)} mi` : ''} in {Math.round(activity.durationSec / 60)} min (planned {plan.totalMin}).
            </Body>
            <Body dim>
              {activity.avgHr ? `Avg HR ${activity.avgHr}` : 'No heart rate'}
              {activity.distanceM ? ` · ${((activity.distanceM / 1000 / activity.durationSec) * 3600).toFixed(1)} km/h average` : ''}
            </Body>
          </Card>
        ) : (
          <Card>
            <Body dim>Once the ride syncs from your watch it appears here. If it didn't record, mark it done by hand.</Body>
            {session.status === 'planned' ? <Button variant="secondary" label="Mark as done" onPress={markDone} /> : null}
          </Card>
        )}
        <View style={{ height: space.md }} />
      </Screen>
    </>
  );
}
