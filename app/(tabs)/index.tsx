import { and, asc, desc, eq, gte, lte } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text } from 'react-native';

import { db } from '@/db/client';
import { dayTargets, totalsOn } from '@/db/repos/nutritionRepo';
import { sessionOnDate } from '@/db/repos/planRepo';
import { currentRaceContext } from '@/db/repos/raceRepo';
import { activities, bodyMeasurements, checkins, dailyMetrics, foodLogs, nutritionTargets, plannedSessions, races, settings } from '@/db/schema';
import { useDbValue } from '@/db/useDbValue';
import { addDays, startOfWeek, todayKey } from '@/domain/dates';
import { ACWR_LABELS, type AcwrLabel } from '@/domain/load';
import { raceCountdown, RACE_TYPES } from '@/domain/plan/race';
import type { PlannedSession, SessionDetail } from '@/domain/plan/types';
import { READINESS_LABELS, type ReadinessBand } from '@/domain/readiness';
import { RANGE_DAYS } from '@/domain/trends';
import { trendArrow, vo2Summary } from '@/domain/vo2';
import { TabHeader } from '@/features/navigation/TabHeader';
import { SessionCard } from '@/features/plan/SessionCard';
import { DoneToday } from '@/features/today/DoneToday';
import { StepsCard } from '@/features/today/StepsCard';
import { RpePrompt } from '@/features/recovery/RpePrompt';
import { TrendsCard } from '@/features/today/TrendsCard';
import { WeekList } from '@/features/today/WeekList';
import { beginWorkout } from '@/features/workout/startWorkout';
import { PHONE_HEALTH } from '@/sources/phoneHealth';
import { ensureNotificationPermission } from '@/sync/notifications';
import { ListGroup, ListRow, PagedStatCards, SectionHeader, StatPair, type StatCardProps, type Tone } from '@/ui/cards';
import { Body, Button, Card, Screen } from '@/ui/components';
import { HeartIcon } from '@/ui/icons';
import { colors, font } from '@/ui/theme';

const ACWR_TONES: Record<AcwrLabel, Tone> = { low: 'neutral', sweet_spot: 'accent', caution: 'warning', high: 'danger', insufficient: 'neutral' };
const READY_TONES: Record<ReadinessBand, Tone> = { good: 'accent', moderate: 'warning', low: 'danger', unknown: 'neutral' };

function hoursMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** The morning dashboard: greeting, the day's key numbers, today's session, trends and the week ahead. */
export default function TodayTab() {
  const today = todayKey();
  const weekStart = startOfWeek(today);
  const { data: metricsRows } = useLiveQuery(db.select().from(dailyMetrics).where(eq(dailyMetrics.date, today)));
  const { data: checkinRows } = useLiveQuery(db.select().from(checkins).where(eq(checkins.date, today)));
  const { data: sessionRows, updatedAt: sessionsAt } = useLiveQuery(db.select().from(plannedSessions).where(eq(plannedSessions.date, today)));
  const { data: weekRows } = useLiveQuery(
    db
      .select()
      .from(plannedSessions)
      .where(and(gte(plannedSessions.date, weekStart), lte(plannedSessions.date, addDays(weekStart, 6)))),
  );
  const { data: logRows } = useLiveQuery(db.select().from(foodLogs).where(eq(foodLogs.date, today)));
  // Watched only so the derived reads below re-run when these tables change; the rows are unused.
  const { updatedAt: targetsAt } = useLiveQuery(db.select({ id: nutritionTargets.id }).from(nutritionTargets).orderBy(desc(nutritionTargets.id)).limit(1));
  const { updatedAt: racesAt } = useLiveQuery(db.select({ id: races.id }).from(races));
  const { data: weightRows } = useLiveQuery(db.select().from(bodyMeasurements).orderBy(asc(bodyMeasurements.measuredAt)));
  const { data: settingsRows } = useLiveQuery(db.select().from(settings).where(eq(settings.id, 1)));
  const { data: activityRows } = useLiveQuery(db.select().from(activities).where(eq(activities.date, today)));
  const { data: historyRows } = useLiveQuery(
    db
      .select({ date: dailyMetrics.date, vo2Max: dailyMetrics.vo2Max, steps: dailyMetrics.steps })
      .from(dailyMetrics)
      .where(gte(dailyMetrics.date, addDays(today, -RANGE_DAYS['6M'])))
      .orderBy(asc(dailyMetrics.date)),
  );
  const [notifGranted, setNotifGranted] = useState<boolean | null>(null);
  const race = useDbValue(() => currentRaceContext(today), [today, racesAt]);

  useFocusEffect(
    useCallback(() => {
      void ensureNotificationPermission().then(setNotifGranted);
    }, []),
  );

  const metrics = metricsRows[0];
  const checkin = checkinRows[0];
  const settingsRow = settingsRows[0];
  const sessionRow = sessionRows[0];
  const fallbackSession = useDbValue(() => sessionOnDate(today), [today, sessionsAt]);
  const session = sessionRow ? { ...sessionRow, detail: sessionRow.detail as unknown as SessionDetail } : fallbackSession;
  const weekSessions = weekRows.map((r) => ({ ...r, detail: r.detail as unknown as SessionDetail })) as PlannedSession[];

  const readinessBand = ((metrics?.readinessBreakdown as { band?: ReadinessBand } | null)?.band ?? 'unknown') as ReadinessBand;
  const acwr = metrics?.acwr ?? null;
  const acwrLabel: AcwrLabel = acwr === null ? 'insufficient' : acwr < 0.8 ? 'low' : acwr <= 1.3 ? 'sweet_spot' : acwr <= 1.5 ? 'caution' : 'high';
  const asleepMin = (metrics?.sleepBreakdown as { asleepMin?: number } | null)?.asleepMin ?? null;

  const vo2 = vo2Summary(
    historyRows.flatMap((r) => (r.vo2Max === null ? [] : [{ date: r.date, vo2Max: r.vo2Max }])),
    today,
  );
  const stepHistory = historyRows.flatMap((r) => (r.steps === null ? [] : [{ date: r.date, value: r.steps }]));
  const stepGoal = settingsRow?.stepGoal ?? 8000;
  const stepsToday = metrics?.steps ?? null;

  const weighIns = weightRows.flatMap((r) => (r.weightKg === null ? [] : [{ date: r.date, weightKg: r.weightKg }]));

  const targets = useDbValue(() => dayTargets(today), [today, targetsAt, sessionsAt]);
  const eaten = useDbValue(() => totalsOn(today), [today, logRows]);
  const noSource = settingsRow && !settingsRow.healthConnectConnected && settingsRow.dataSource !== 'mock';

  const pages: [StatCardProps, StatCardProps][] = [
    [
      {
        label: 'Readiness',
        value: metrics?.readiness != null ? String(metrics.readiness) : '—',
        chip: { label: READINESS_LABELS[readinessBand], tone: READY_TONES[readinessBand] },
        onPress: () => router.push('/insights/readiness'),
      },
      {
        label: 'Sleep',
        value: metrics?.sleepScore != null ? String(metrics.sleepScore) : '—',
        chip: { label: asleepMin !== null ? `${hoursMinutes(asleepMin)} asleep` : 'No sleep data' },
        onPress: () => router.push('/insights/sleep'),
      },
    ],
    [
      {
        label: 'Training load',
        value: acwr === null ? '—' : acwr.toFixed(2),
        chip: { label: ACWR_LABELS[acwrLabel], tone: ACWR_TONES[acwrLabel] },
        onPress: () => router.push('/insights/load'),
      },
      {
        label: 'VO2 max',
        value: vo2.latest ? vo2.latest.vo2Max.toFixed(1) : '—',
        chip: {
          label: vo2.change === null ? (vo2.latest ? 'One reading' : 'No reading') : `${trendArrow(vo2.trend)} ${vo2.change > 0 ? '+' : ''}${vo2.change.toFixed(1)}`,
          tone: vo2.trend === 'rising' ? 'accent' : vo2.trend === 'falling' ? 'warning' : 'neutral',
        },
        onPress: () => router.push('/insights/vo2'),
      },
    ],
  ];

  return (
    <Screen bottomInset>
      <TabHeader greeting />

      {noSource ? (
        <Card style={{ borderColor: colors.info }}>
          <Body>Connect Garmin data to get sleep, readiness and training load.</Body>
          <Button variant="secondary" label={`Set up ${PHONE_HEALTH.name} (or demo data)`} onPress={() => router.push('/edit/health')} />
        </Card>
      ) : null}
      {notifGranted === false ? (
        <Card style={{ borderColor: colors.warning }}>
          <Body dim>Notifications are off, so the morning digest can't be delivered. Allow them in Android settings for this app.</Body>
        </Card>
      ) : null}

      <PagedStatCards pages={pages} />

      <StepsCard steps={stepsToday} goal={stepGoal} activeKcal={metrics?.activeKcal ?? null} onPress={() => router.push('/edit/routine')} />

      {!checkin ? (
        <ListGroup>
          <ListRow
            icon={<HeartIcon color={colors.accent} size={22} />}
            tileColor={colors.accentSoft}
            title="Morning check-in"
            subtitle="Energy, soreness, any pain"
            value="Check in ›"
            caption="Three taps"
            captionTone="accent"
            onPress={() => router.push('/log/checkin')}
            last
          />
        </ListGroup>
      ) : null}

      {race ? (
        <Pressable onPress={() => router.push('/insights/race')}>
          <Card>
            <Text style={{ color: colors.text, fontSize: font.body, fontWeight: '600' }}>
              {race.race.name} · {RACE_TYPES[race.race.type].short}
            </Text>
            <Body dim>{raceCountdown(race)}. Tap for the race plan.</Body>
          </Card>
        </Pressable>
      ) : null}

      <SectionHeader title="Today's session" />
      {session ? (
        <SessionCard session={session} isToday onActions={() => router.push('/train')} />
      ) : (
        <Card>
          <Body dim>Rest day.</Body>
        </Card>
      )}
      {session && session.addOn && session.status === 'done' && !activityRows.some((a) => a.type === 'strength') ? (
        <Button
          variant="secondary"
          label="Start the 10-min core add-on"
          onPress={() => {
            const { workoutId } = beginWorkout('strength_light', 'normal', null);
            router.push(`/workout/${workoutId}`);
          }}
        />
      ) : null}

      <DoneToday activities={activityRows} />

      <RpePrompt />

      <SectionHeader title="Food" action={{ label: 'Log', onPress: () => router.navigate('/food') }} />
      {targets ? (
        <StatPair
          left={{
            label: 'Calories',
            value: Math.round(eaten.kcal).toLocaleString(),
            unit: `/ ${Math.round(targets.kcal).toLocaleString()}`,
            chip:
              eaten.kcal > targets.kcal
                ? { label: `${Math.round(eaten.kcal - targets.kcal)} over`, tone: 'warning' }
                : { label: `${Math.round(targets.kcal - eaten.kcal).toLocaleString()} left` },
            onPress: () => router.navigate('/food'),
          }}
          right={{
            label: 'Protein',
            value: String(Math.round(eaten.proteinG)),
            unit: `/ ${Math.round(targets.proteinG)} g`,
            chip:
              eaten.proteinG >= targets.proteinG ? { label: 'Target hit', tone: 'accent' } : { label: `${Math.round(targets.proteinG - eaten.proteinG)} g to go`, tone: 'warning' },
            onPress: () => router.navigate('/food'),
          }}
        />
      ) : (
        <Card>
          <Body dim>Targets appear once your profile is saved.</Body>
        </Card>
      )}

      <TrendsCard today={today} weighIns={weighIns} steps={stepHistory} stepGoal={stepGoal} />

      <WeekList sessions={weekSessions} today={today} />
    </Screen>
  );
}
