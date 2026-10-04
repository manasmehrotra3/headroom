import { asc, desc, gte } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { TUNABLES } from '@/config/tunables';
import { getExercise } from '@/data/exercises';
import { db } from '@/db/client';
import { activitiesBetween } from '@/db/repos/activityRepo';
import { addWeighIn, deleteMeasurement } from '@/db/repos/bodyRepo';
import { loggingSummary } from '@/db/repos/nutritionRepo';
import { vo2PointsBetween } from '@/db/repos/recoveryRepo';
import { changesForWeek, ensureNextWeek, weekSessions } from '@/db/repos/planRepo';
import { allDoneSets } from '@/db/repos/workoutRepo';
import { bodyMeasurements, dailyMetrics } from '@/db/schema';
import { addDays, startOfWeek, todayKey, WEEKDAY_LABELS, weekdayOf } from '@/domain/dates';
import { adherence, paceAtSimilarHr, strengthPrs, typicalRunHr } from '@/domain/review';
import { SESSION_TYPES } from '@/domain/schedule';
import { formatPace, kgToLb, lbToKg, paceSecPerMile } from '@/domain/units';
import { changeLabel, TREND_LABELS, vo2Summary } from '@/domain/vo2';
import { weightTrend } from '@/domain/weightTrend';
import { LineChartCard } from '@/ui/charts';
import { TabHeader } from '@/features/navigation/TabHeader';
import { Body, Button, Card, RowLink, Screen, SectionLabel } from '@/ui/components';
import { NumberField } from '@/ui/fields';
import { formatLb, formatShortDate } from '@/ui/format';
import { colors, font } from '@/ui/theme';

/** Weight trend, weigh-in logging, and the Sunday weekly review. */
export default function ProgressTab() {
  const today = todayKey();
  const { data: rows } = useLiveQuery(db.select().from(bodyMeasurements).orderBy(asc(bodyMeasurements.measuredAt)));
  const { data: vo2Rows } = useLiveQuery(
    db
      .select({ date: dailyMetrics.date, vo2Max: dailyMetrics.vo2Max })
      .from(dailyMetrics)
      .where(gte(dailyMetrics.date, addDays(todayKey(), -TUNABLES.vo2.trendWindowDays)))
      .orderBy(asc(dailyMetrics.date)),
  );
  const [weightLb, setWeightLb] = useState<number | null>(null);
  const [waistIn, setWaistIn] = useState<number | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(weekdayOf(today) === 'sun');

  const weighIns = rows.flatMap((row) => (row.weightKg === null ? [] : [{ ...row, weightKg: row.weightKg }]));
  const trend = weightTrend(weighIns);
  const latest = trend.at(-1);
  const last30 = trend.filter((p) => p.date >= addDays(today, -30));
  const vo2Points = vo2Rows.flatMap((r) => (r.vo2Max === null ? [] : [{ date: r.date, vo2Max: r.vo2Max }]));
  const vo2 = vo2Summary(vo2Points, today);

  const logWeight = () => {
    if (weightLb === null || weightLb < 70 || weightLb > 550) {
      Alert.alert('Check the weight', 'Enter your weight in pounds.');
      return;
    }
    addWeighIn(lbToKg(weightLb), new Date(), waistIn === null ? null : waistIn * 2.54);
    setWeightLb(null);
    setWaistIn(null);
    setInputKey((key) => key + 1);
  };

  const confirmDelete = (id: number) =>
    Alert.alert('Delete this weigh-in?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMeasurement(id) },
    ]);

  return (
    <Screen bottomInset>
      <TabHeader title="Progress" subtitle="The trend uses a 7-day average, not the daily scale number." />

      <Card>
        <Body dim>7-day average</Body>
        <Text style={{ color: colors.text, fontSize: font.hero, fontWeight: '700' }}>{latest ? formatLb(latest.averageKg) : '—'}</Text>
        {latest ? (
          <Body dim>
            Last weigh-in {formatLb(latest.weightKg)} on {formatShortDate(latest.date)}
          </Body>
        ) : null}
      </Card>
      {last30.length > 1 ? (
        <LineChartCard
          series={last30.map((p) => Math.round(kgToLb(p.averageKg) * 10) / 10)}
          secondary={last30.map((p) => Math.round(kgToLb(p.weightKg) * 10) / 10)}
          labels={last30.map((p) => p.date.slice(5))}
          yMin={Math.floor(Math.min(...last30.map((p) => kgToLb(p.weightKg))) - 2)}
          yMax={Math.ceil(Math.max(...last30.map((p) => kgToLb(p.weightKg))) + 2)}
        />
      ) : null}

      <Card>
        <NumberField key={inputKey} decimal label="Today's weight (lb)" value={weightLb} onChange={setWeightLb} />
        <NumberField key={`w${inputKey}`} decimal label="Waist (inches, optional)" value={waistIn} onChange={setWaistIn} />
        <Button label="Log" onPress={logWeight} />
      </Card>

      <SectionLabel>VO2 max</SectionLabel>
      <Card>
        <Body dim>From your watch, over the last {TUNABLES.vo2.trendWindowDays} days</Body>
        <Text style={{ color: colors.text, fontSize: font.hero, fontWeight: '700' }}>{vo2.latest ? vo2.latest.vo2Max.toFixed(1) : '—'}</Text>
        {vo2.change === null ? (
          <Body dim>{vo2.latest ? 'One reading so far, so there is no trend yet.' : 'Nothing yet. Garmin writes this after an outdoor run with heart rate.'}</Body>
        ) : (
          <Body dim>
            {changeLabel(vo2)}, so {TREND_LABELS[vo2.trend]}. First reading in this window was on {formatShortDate(vo2.from!.date)}.
          </Body>
        )}
      </Card>
      {vo2Points.length > 1 ? (
        <LineChartCard series={vo2Points.map((p) => p.vo2Max)} labels={vo2Points.map((p) => p.date.slice(5))} formatY={(v) => v.toFixed(1)} />
      ) : null}
      <RowLink label="VO2 max detail" onPress={() => router.push('/insights/vo2')} />

      <SectionLabel>Weekly review</SectionLabel>
      {reviewOpen ? <WeeklyReview /> : <Button variant="secondary" label="Open this week's review" onPress={() => setReviewOpen(true)} />}

      <SectionLabel>Recent weigh-ins</SectionLabel>
      {weighIns
        .slice(-10)
        .reverse()
        .map((row) => (
          <RowLink key={row.id} label={formatShortDate(row.date)} value={`${formatLb(row.weightKg)}${row.waistCm ? ` · ${(row.waistCm / 2.54).toFixed(1)} in` : ''}${row.source === 'health_connect' || row.source === 'apple_health' ? ' · watch' : ''}`} onPress={() => confirmDelete(row.id)} />
        ))}
      <Body dim>Tap a weigh-in to delete it.</Body>
      <RowLink label="Run history" onPress={() => router.push('/insights/runs')} />
      <RowLink label="Progress photos" onPress={() => router.push('/edit/photos')} />
    </Screen>
  );
}

/** Sunday evening: weight, PRs, pace trend, adherence, and next week's plan with reasons. */
function WeeklyReview() {
  const today = todayKey();
  const weekStart = startOfWeek(today);
  const weekEnd = addDays(weekStart, 6);
  const [data] = useState(() => {
    const weights = weightTrend(
      db
        .select()
        .from(bodyMeasurements)
        .orderBy(asc(bodyMeasurements.measuredAt))
        .all()
        .flatMap((r) => (r.weightKg === null ? [] : [{ date: r.date, weightKg: r.weightKg }])),
    );
    const thisWeek = weights.filter((p) => p.date >= weekStart).at(-1) ?? null;
    const lastWeek = weights.filter((p) => p.date < weekStart).at(-1) ?? null;
    const prs = strengthPrs(
      allDoneSets().map(({ set, date }) => ({ exerciseId: set.exerciseId, date, weightKg: set.weightKg, reps: set.reps })),
      weekStart,
      weekEnd,
    );
    const runs = activitiesBetween(addDays(today, -84), today).filter((a) => a.type === 'run' && a.duplicateOf === null && a.distanceM && a.avgHr);
    const refHr = typicalRunHr(runs);
    const pace = refHr === null ? null : paceAtSimilarHr(runs.map((r) => ({ date: r.date, paceSecPerMile: paceSecPerMile(r.distanceM!, r.durationSec), avgHr: r.avgHr! })), refHr);
    const vo2 = vo2Summary(vo2PointsBetween(addDays(today, -TUNABLES.vo2.trendWindowDays), today), today);
    const sessions = weekSessions(weekStart);
    const food = loggingSummary(weekStart, today < weekEnd ? today : weekEnd);
    const next = ensureNextWeek(today);
    const nextChanges = changesForWeek(addDays(weekStart, 7));
    // Only days that have happened count toward adherence.
    return { thisWeek, lastWeek, prs, refHr, pace, vo2, adherence: adherence(sessions.filter((s) => s.date <= today)), sessions, food, next, nextChanges };
  });

  return (
    <View>
      <Card>
        <Text style={styles.h}>Weight</Text>
        <Body>
          {data.thisWeek ? formatLb(data.thisWeek.averageKg) : '—'}
          {data.thisWeek && data.lastWeek ? ` (${data.thisWeek.averageKg - data.lastWeek.averageKg <= 0 ? '' : '+'}${formatLb(data.thisWeek.averageKg - data.lastWeek.averageKg)} vs last week)` : ''}
        </Body>
      </Card>
      <Card>
        <Text style={styles.h}>Strength PRs this week</Text>
        {data.prs.length === 0 ? <Body dim>None yet. PRs are new bests by estimated 1RM.</Body> : null}
        {data.prs.map((pr) => (
          <Body key={pr.exerciseId}>
            {getExercise(pr.exerciseId).name}: {formatLb(pr.weightKg, 0)} × {pr.reps}
            {pr.previousE1rmKg ? ` (e1RM ${formatLb(pr.e1rmKg, 0)}, was ${formatLb(pr.previousE1rmKg, 0)})` : ' (first time)'}
          </Body>
        ))}
      </Card>
      <Card>
        <Text style={styles.h}>Running: pace at similar heart rate</Text>
        {data.pace && data.pace.points.length >= 2 ? (
          <>
            <Body>
              Runs near {data.refHr} bpm: {formatPace(data.pace.points.at(-1)!.paceSecPerMile)} latest
              {data.pace.changeSecPerMile !== null ? `, ${Math.abs(Math.round(data.pace.changeSecPerMile))} s/mi ${data.pace.changeSecPerMile <= 0 ? 'faster' : 'slower'} than 12 weeks ago` : ''}
            </Body>
            <LineChartCard series={data.pace.points.map((p) => Math.round(p.paceSecPerMile))} labels={data.pace.points.map((p) => p.date.slice(5))} formatY={(v) => formatPace(v).replace(' /mi', '')} />
          </>
        ) : (
          <Body dim>Needs a few runs with heart rate at a similar effort.</Body>
        )}
        {data.vo2.latest ? (
          <Body dim>
            VO2 max {data.vo2.latest.vo2Max.toFixed(1)}
            {data.vo2.change === null ? '' : `, ${data.vo2.change > 0 ? '+' : ''}${data.vo2.change.toFixed(1)} over ${TUNABLES.vo2.trendWindowDays} days`}
          </Body>
        ) : null}
      </Card>
      <Card>
        <Text style={styles.h}>Adherence</Text>
        <Body>
          Workouts: {data.adherence.done} of {data.adherence.planned} done{data.adherence.skipped ? `, ${data.adherence.skipped} skipped` : ''} ({Math.round(data.adherence.rate * 100)}%)
        </Body>
        <Body>
          Meals logged on {data.food.daysLogged} of {data.food.days} days
          {data.food.avgKcal ? ` · avg ${Math.round(data.food.avgKcal)} kcal, ${Math.round(data.food.avgProtein ?? 0)} g protein` : ''}
        </Body>
      </Card>
      <Card>
        <Text style={styles.h}>Next week</Text>
        {data.next.map((s) => (
          <Body key={s.date} dim>
            {WEEKDAY_LABELS[weekdayOf(s.date)].slice(0, 3)}: {s.detail.kind === 'run' ? s.detail.title : SESSION_TYPES[s.sessionType].label}
            {s.sessionType === 'rest' ? '' : ` · ${s.targetMin} min`}
            {s.variant !== 'normal' ? ` · ${s.variant}` : ''}
          </Body>
        ))}
        {data.nextChanges.length > 0 ? <Text style={styles.h}>Changes</Text> : null}
        {data.nextChanges.map((c) => (
          <Body key={c.id} dim>
            • {c.reason}
          </Body>
        ))}
        <Button variant="secondary" label="Open next week on the Train tab" onPress={() => router.push('/train')} />
      </Card>
    </View>
  );
}

const styles = { h: { color: colors.text, fontSize: font.body, fontWeight: '600' as const } };
