import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { getCheckin, getDailyMetrics } from '@/db/repos/recoveryRepo';
import { todayKey } from '@/domain/dates';
import { READINESS_LABELS, type Readiness } from '@/domain/readiness';
import { Body, Button, Card, Screen, SectionLabel, Title } from '@/ui/components';
import { colors, font } from '@/ui/theme';

const LABELS = { sleep: 'Sleep', restingHr: 'Resting heart rate', hrv: 'HRV', checkin: 'Morning check-in' } as const;

export default function ReadinessInsight() {
  const today = todayKey();
  const [metrics] = useState(() => getDailyMetrics(today));
  const [checkin] = useState(() => getCheckin(today));
  const breakdown = metrics?.readinessBreakdown as unknown as Pick<Readiness, 'band' | 'components'> | null | undefined;

  return (
    <>
      <Stack.Screen options={{ title: 'Readiness' }} />
      <Screen edges={['bottom']}>
        <Title subtitle={breakdown ? READINESS_LABELS[breakdown.band] : undefined}>{metrics?.readiness !== null && metrics?.readiness !== undefined ? `${metrics.readiness} / 100` : 'No data yet'}</Title>

        {breakdown ? (
          (Object.keys(LABELS) as (keyof typeof LABELS)[]).map((key) => {
            const c = breakdown.components[key];
            return (
              <Card key={key}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.text, fontSize: font.body, fontWeight: '600' }}>{LABELS[key]}</Text>
                  <Text style={{ color: c ? colors.accent : colors.textDim, fontSize: font.body }}>{c ? `${c.points} / ${c.weight}` : 'no data'}</Text>
                </View>
                <Body dim>{c ? c.detail : key === 'checkin' ? 'Do the morning check-in to add this.' : 'Not available from the watch yet, or no baseline.'}</Body>
              </Card>
            );
          })
        ) : (
          <Body dim>Readiness appears after the first sync or check-in.</Body>
        )}

        <SectionLabel>How it's used</SectionLabel>
        <Body dim>
          Good (75+): train as planned. Moderate (50–74): as planned, watch the RPE. Low (below 50): the day switches to an easier version of the same session, never a skip. Pain reported in the check-in removes exercises that load that area regardless of the score.
        </Body>
        <View style={{ height: 16 }} />
        <Button variant="secondary" label={checkin ? 'Edit today\'s check-in' : 'Do the morning check-in'} onPress={() => router.push('/log/checkin')} />
      </Screen>
    </>
  );
}
