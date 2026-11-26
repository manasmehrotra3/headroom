import { Stack } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { activitiesBetween } from '@/db/repos/activityRepo';
import { getDailyMetrics } from '@/db/repos/recoveryRepo';
import { addDays, todayKey } from '@/domain/dates';
import { ACWR_LABELS, dailyLoads, type AcwrLabel } from '@/domain/load';
import { formatDuration } from '@/domain/units';
import { BarChartCard } from '@/ui/charts';
import { Body, Card, RowLink, Screen, SectionLabel, Title } from '@/ui/components';
import { formatShortDate } from '@/ui/format';
import { colors, font } from '@/ui/theme';

/** Read per render (not once at import) so a theme switch repaints the label. */
const labelColor = (label: AcwrLabel): string =>
  ({ low: colors.info, sweet_spot: colors.accent, caution: colors.warning, high: colors.danger, insufficient: colors.textDim })[label];

export default function LoadInsight() {
  const today = todayKey();
  const [metrics] = useState(() => getDailyMetrics(today));
  const [recent] = useState(() => activitiesBetween(addDays(today, -27), today).filter((a) => a.duplicateOf === null));
  const loads = dailyLoads(recent);
  const byDay = new Map(loads.map((l) => [l.date, l.load]));
  const acwr = metrics?.acwr ?? null;
  const label: AcwrLabel = acwr === null ? 'insufficient' : acwr < 0.8 ? 'low' : acwr <= 1.3 ? 'sweet_spot' : acwr <= 1.5 ? 'caution' : 'high';

  return (
    <>
      <Stack.Screen options={{ title: 'Training load' }} />
      <Screen edges={['bottom']}>
        <Title subtitle={ACWR_LABELS[label]}>
          <Text style={{ color: labelColor(label) }}>{acwr === null ? '—' : acwr.toFixed(2)}</Text>
        </Title>
        <Card>
          <Body>Acute (7 days): {Math.round(metrics?.acuteLoad ?? 0)}</Body>
          <Body>Chronic (28-day weekly average): {Math.round(metrics?.chronicLoad ?? 0)}</Body>
          <Body dim>
            Load = session RPE × minutes. Ratio = acute ÷ chronic. Under 0.8 is low, 0.8–1.3 the sweet spot, 1.3–1.5 caution, above 1.5 high. Shown after 21 days of history.
          </Body>
        </Card>

        <SectionLabel>Daily load, last 28 days</SectionLabel>
        <BarChartCard data={Array.from({ length: 28 }, (_, i) => addDays(today, i - 27)).map((d) => ({ value: Math.round(byDay.get(d) ?? 0), label: d.slice(8) }))} />

        <SectionLabel>Recent sessions</SectionLabel>
        {[...recent].reverse().slice(0, 14).map((a) => (
          <RowLink
            key={a.id}
            label={`${formatShortDate(a.date)} · ${a.title}`}
            value={`${formatDuration(a.durationSec)} · RPE ${a.rpe ?? '?'}${a.rpeEstimated ? '*' : ''} · ${Math.round(a.srpeLoad)}`}
            onPress={() => undefined}
          />
        ))}
        <View style={{ height: 8 }} />
        <Text style={{ color: colors.textDim, fontSize: font.small }}>* RPE estimated from heart rate; rate the session on the Today tab to replace it.</Text>
      </Screen>
    </>
  );
}
