import { Stack } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { dailyMetricsBetween, getDailyMetrics } from '@/db/repos/recoveryRepo';
import { addDays, todayKey } from '@/domain/dates';
import type { SleepScore } from '@/domain/sleepScore';
import { BarChartCard } from '@/ui/charts';
import { Body, Card, Screen, SectionLabel, Title } from '@/ui/components';
import { formatShortDate } from '@/ui/format';
import { colors, font } from '@/ui/theme';
import { PHONE_HEALTH } from '@/sources/phoneHealth';

const LABELS = { duration: 'Duration', efficiency: 'Efficiency', stages: 'Deep + REM', consistency: 'Consistency' } as const;

/** Why the sleep score is what it is, plus the last two weeks. */
export default function SleepInsight() {
  const today = todayKey();
  const [metrics] = useState(() => getDailyMetrics(today) ?? getDailyMetrics(addDays(today, -1)));
  const [history] = useState(() => dailyMetricsBetween(addDays(today, -13), today));
  const breakdown = metrics?.sleepBreakdown as unknown as SleepScore | null | undefined;

  return (
    <>
      <Stack.Screen options={{ title: 'Sleep score' }} />
      <Screen edges={['bottom']}>
        <Title subtitle={metrics ? formatShortDate(metrics.date) : undefined}>{breakdown ? `${breakdown.score} / 100` : 'No sleep data'}</Title>

        {breakdown ? (
          <>
            <SectionLabel>Breakdown</SectionLabel>
            {(Object.keys(LABELS) as (keyof typeof LABELS)[]).map((key) => {
              const c = breakdown.components[key];
              return (
                <Card key={key}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: colors.text, fontSize: font.body, fontWeight: '600' }}>{LABELS[key]}</Text>
                    <Text style={{ color: c ? colors.accent : colors.textDim, fontSize: font.body }}>{c ? `${c.points} / ${c.weight}` : 'no data'}</Text>
                  </View>
                  <Body dim>{c ? c.detail : key === 'consistency' ? 'Needs a few nights to compare against.' : 'Garmin did not share sleep stages for this night.'}</Body>
                </Card>
              );
            })}
            <Body dim>Missing parts are left out and the rest re-weighted, so the score is always out of 100.</Body>
          </>
        ) : (
          <Body dim>Connect {PHONE_HEALTH.name} (Settings → Garmin & {PHONE_HEALTH.name}) or turn on demo data to see a score.</Body>
        )}

        <SectionLabel>Last 14 nights</SectionLabel>
        <BarChartCard data={history.map((m) => ({ value: m.sleepScore ?? 0, label: m.date.slice(8) }))} max={100} />
      </Screen>
    </>
  );
}
