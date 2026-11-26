import { Stack, router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { activitiesBetween } from '@/db/repos/activityRepo';
import { addDays, todayKey } from '@/domain/dates';
import { paceAtSimilarHr, typicalRunHr } from '@/domain/review';
import { formatDuration, formatPace, metersToMiles, paceSecPerMile } from '@/domain/units';
import { LineChartCard } from '@/ui/charts';
import { Body, Card, Chips, Screen, SCREEN_PADDING, SectionLabel, Title } from '@/ui/components';
import type { ActivityRow } from '@/db/repos/activityRepo';
import { formatShortDate } from '@/ui/format';
import { colors, font, radius, space, themedStyles } from '@/ui/theme';

const RANGES = [
  { id: '42', label: '6 weeks' },
  { id: '90', label: '3 months' },
  { id: '365', label: 'A year' },
] as const;

/** Every run you've done, newest first, with pace and heart-rate trends above. */
export default function RunHistory() {
  const today = todayKey();
  const [range, setRange] = useState<(typeof RANGES)[number]['id']>('90');

  // A year of runs is a few hundred rows and half a dozen derived series. Reading and deriving
  // them again on every render (a chip press, a scroll) is the one thing that makes this screen
  // feel slow, so it happens once per range instead.
  const { runs, newestFirst, paceSeries, hrSeries, labels, refHr, atHr, totalMiles, totalMin } = useMemo(() => {
    const all = activitiesBetween(addDays(today, -Number(range)), today)
      .filter((a) => a.type === 'run' && a.duplicateOf === null)
      .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
    const withPace = all.filter((r) => r.distanceM !== null && r.distanceM > 400);
    const hr = typicalRunHr(all);
    return {
      runs: all,
      newestFirst: [...all].reverse(),
      paceSeries: withPace.map((r) => Math.round(paceSecPerMile(r.distanceM!, r.durationSec))),
      hrSeries: all.map((r) => r.avgHr),
      labels: withPace.map((r) => r.date.slice(5)),
      refHr: hr,
      atHr:
        hr === null
          ? null
          : paceAtSimilarHr(
              withPace.map((r) => ({ date: r.date, paceSecPerMile: paceSecPerMile(r.distanceM!, r.durationSec), avgHr: r.avgHr ?? 0 })),
              hr,
            ),
      totalMiles: withPace.reduce((sum, r) => sum + metersToMiles(r.distanceM!), 0),
      totalMin: all.reduce((sum, r) => sum + r.durationSec / 60, 0),
    };
  }, [today, range]);

  const renderRun = useCallback(({ item: run }: { item: ActivityRow }) => {
    const pace = run.distanceM && run.distanceM > 400 ? paceSecPerMile(run.distanceM, run.durationSec) : null;
    return (
      <Pressable style={styles.row} onPress={() => (run.plannedSessionId ? router.push(`/run/${run.plannedSessionId}`) : undefined)}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {formatShortDate(run.date)} · {run.title}
          </Text>
          <Text style={styles.meta}>
            {run.distanceM ? `${metersToMiles(run.distanceM).toFixed(2)} mi · ` : ''}
            {formatDuration(run.durationSec)}
            {pace ? ` · ${formatPace(pace)}` : ''}
          </Text>
          <Text style={styles.meta}>
            {run.avgHr ? `avg HR ${run.avgHr}` : 'no heart rate'}
            {run.trimp ? ` · TRIMP ${Math.round(run.trimp)}` : ''}
            {run.rpe ? ` · RPE ${run.rpe}${run.rpeEstimated ? ' (est)' : ''}` : ''}
          </Text>
        </View>
        {run.plannedSessionId ? <Text style={styles.chev}>›</Text> : null}
      </Pressable>
    );
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: 'Run history' }} />
      <Screen edges={['bottom']} scroll={false}>
        <FlatList
          data={newestFirst}
          keyExtractor={(run) => String(run.id)}
          renderItem={renderRun}
          contentContainerStyle={SCREEN_PADDING}
          ListHeaderComponent={
            <>
              <Title subtitle={`${runs.length} runs · ${totalMiles.toFixed(1)} mi · ${Math.round(totalMin / 60)} h`}>Runs</Title>
              <Chips options={RANGES} selected={[range]} onToggle={setRange} />

              {paceSeries.length > 1 ? (
                <>
                  <SectionLabel>Pace per mile</SectionLabel>
                  <LineChartCard series={paceSeries} labels={labels} formatY={(v) => formatPace(v).replace(' /mi', '')} />
                </>
              ) : null}

              {hrSeries.filter(Boolean).length > 1 ? (
                <>
                  <SectionLabel>Average heart rate</SectionLabel>
                  <LineChartCard series={hrSeries} labels={runs.map((r) => r.date.slice(5))} color={colors.danger} />
                </>
              ) : null}

              {atHr && atHr.changeSecPerMile !== null ? (
                <Card>
                  <Body>
                    At a similar effort ({refHr} bpm) you're {Math.abs(Math.round(atHr.changeSecPerMile))} s/mi {atHr.changeSecPerMile <= 0 ? 'faster' : 'slower'} than at the start
                    of this range.
                  </Body>
                  <Body dim>Comparing runs at the same heart rate is the fairest read on fitness: it takes weather, hills and effort out of it.</Body>
                </Card>
              ) : null}

              <SectionLabel>Every run</SectionLabel>
            </>
          }
          ListEmptyComponent={<Body dim>No runs in this range yet.</Body>}
        />
      </Screen>
    </>
  );
}

const styles = themedStyles(() => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    marginBottom: space.sm,
  },
  title: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  meta: { color: colors.textDim, fontSize: font.small },
  chev: { color: colors.textDim, fontSize: font.large },
}));
