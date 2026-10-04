import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { TUNABLES } from '@/config/tunables';
import { currentVdot } from '@/db/repos/planRepo';
import { vo2PointsBetween } from '@/db/repos/recoveryRepo';
import { addDays, todayKey } from '@/domain/dates';
import { changeLabel, TREND_LABELS, vo2RaceContext, vo2Summary, vo2VsVdotNote } from '@/domain/vo2';
import { LineChartCard } from '@/ui/charts';
import { Body, Button, Card, RowLink, Screen, SectionLabel, Title } from '@/ui/components';
import { formatShortDate } from '@/ui/format';
import { colors, font } from '@/ui/theme';
import { PHONE_HEALTH } from '@/sources/phoneHealth';

/** The VO2 max Garmin writes to the phone's health store: where it is, where it has been, what it means. */
export default function Vo2Insight() {
  const today = todayKey();
  const window = TUNABLES.vo2.trendWindowDays;
  const [points] = useState(() => vo2PointsBetween(addDays(today, -window), today));
  const [vdot] = useState(() => currentVdot());
  const summary = vo2Summary(points, today, window);
  const series = summary.latest ? points : [];

  return (
    <>
      <Stack.Screen options={{ title: 'VO2 max' }} />
      <Screen edges={['bottom']}>
        <Title subtitle={summary.latest ? `last reading ${formatShortDate(summary.latest.date)}` : 'no readings yet'}>
          <Text style={{ color: summary.trend === 'falling' ? colors.warning : colors.accent }}>{summary.latest ? summary.latest.vo2Max.toFixed(1) : '—'}</Text>
        </Title>

        <Card>
          {summary.change === null ? (
            <Body dim>One reading so far. A trend needs at least two, and the watch only updates VO2 max every few runs.</Body>
          ) : (
            <Body>
              {changeLabel(summary)}, so {TREND_LABELS[summary.trend]}.
            </Body>
          )}
          {summary.best ? <Body dim>Best in this window: {summary.best.vo2Max.toFixed(1)} on {formatShortDate(summary.best.date)}.</Body> : null}
          {vo2RaceContext(summary.latest?.vo2Max ?? null) ? <Body dim>{vo2RaceContext(summary.latest!.vo2Max)}</Body> : null}
        </Card>

        <SectionLabel>Trend</SectionLabel>
        <LineChartCard
          series={series.map((p) => p.vo2Max)}
          labels={series.map((p) => p.date.slice(5).replace('-', '/'))}
          formatY={(v) => v.toFixed(1)}
        />

        <SectionLabel>Against your running paces</SectionLabel>
        <Card>
          <Body dim>{vo2VsVdotNote(summary.latest?.vo2Max ?? null, vdot) ?? 'Nothing to compare yet.'}</Body>
        </Card>

        <Button variant="secondary" label="Add a reading" onPress={() => router.push('/edit/vo2')} />

        <SectionLabel>Every reading</SectionLabel>
        {[...points].reverse().map((p) => (
          <RowLink key={p.date} label={formatShortDate(p.date)} value={p.vo2Max.toFixed(1)} onPress={() => undefined} />
        ))}
        {points.length === 0 ? (
          <Card>
            <Body dim>{PHONE_HEALTH.vo2Note}</Body>
          </Card>
        ) : null}

        <View style={{ height: 8 }} />
        <Text style={{ color: colors.textDim, fontSize: font.small }}>
          The watch estimates this from heart rate and pace, so treat single readings as noisy. The direction over months is what matters.
        </Text>
      </Screen>
    </>
  );
}
