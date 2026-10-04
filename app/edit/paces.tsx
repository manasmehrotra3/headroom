import { desc } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { db } from '@/db/client';
import { maybeReestimateVdot, setManualVdot } from '@/db/repos/planRepo';
import { runFitness } from '@/db/schema';
import { predictedRaceSec, trainingPaces } from '@/domain/running/vdot';
import { formatDuration, formatPace } from '@/domain/units';
import { Body, Button, Card, Screen, SectionLabel, Stepper, Title } from '@/ui/components';
import { formatShortDate } from '@/ui/format';
import { colors, font } from '@/ui/theme';

/** Current VDOT, the paces it gives, and the history of re-estimates. */
export default function PacesScreen() {
  const { data: history } = useLiveQuery(db.select().from(runFitness).orderBy(desc(runFitness.effectiveDate), desc(runFitness.id)));
  const latest = history[0];
  const [manual, setManual] = useState<number | null>(null);
  const vdot = manual ?? latest?.vdot ?? 35;
  const paces = trainingPaces(vdot);

  return (
    <>
      <Stack.Screen options={{ title: 'Running paces' }} />
      <Screen edges={['bottom']}>
        <Title subtitle={latest ? `Since ${formatShortDate(latest.effectiveDate)} · ${latest.basis}` : 'No 5K time yet: add one in Settings → Running & watch'}>VDOT {vdot.toFixed(1)}</Title>

        <SectionLabel>Training paces (per mile)</SectionLabel>
        <Card>
          {(['easy', 'marathon', 'tempo', 'interval', 'repetition'] as const).map((zone) => (
            <View key={zone} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontSize: font.body, textTransform: 'capitalize' }}>{zone}</Text>
              <Text style={{ color: colors.accent, fontSize: font.body }}>{formatPace(paces[zone])}</Text>
            </View>
          ))}
          <Body dim>Predicted 5K {formatDuration(predictedRaceSec(vdot, 5000))} · 10K {formatDuration(predictedRaceSec(vdot, 10000))}</Body>
        </Card>

        <SectionLabel>Adjust</SectionLabel>
        <Body dim>Paces are re-estimated every 3 weeks from your runs (with heart rate) and move at most ±1 VDOT at a time. You can also set it by hand.</Body>
        <View style={{ height: 8 }} />
        <Stepper label="VDOT" value={vdot} step={0.5} min={20} max={80} format={(v) => v.toFixed(1)} onChange={setManual} />
        <Button label="Save this VDOT" disabled={manual === null} onPress={() => manual !== null && (setManualVdot(manual), setManual(null))} />
        <View style={{ height: 8 }} />
        <Button
          variant="secondary"
          label="Re-estimate from recent runs now"
          onPress={() => {
            const r = maybeReestimateVdot('2099-01-01');
            if (!r) setManual(null);
          }}
        />

        <SectionLabel>History</SectionLabel>
        {history.map((h) => (
          <Body key={h.id} dim>
            {formatShortDate(h.effectiveDate)} · {h.vdot.toFixed(1)} · {h.source} · {h.basis}
          </Body>
        ))}
      </Screen>
    </>
  );
}
