import { desc } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { db } from '@/db/client';
import { useDbValue } from '@/db/useDbValue';
import { dayTargets, dayTypeFor, recalcTargets } from '@/db/repos/nutritionRepo';
import { nutritionTargets } from '@/db/schema';
import { todayKey } from '@/domain/dates';
import { Body, Button, Card, Screen, SectionLabel, Title } from '@/ui/components';
import { formatShortDate } from '@/ui/format';
import { colors, font } from '@/ui/theme';

/** Where the calorie and protein numbers come from, and the review history. */
export default function TargetsScreen() {
  const today = todayKey();
  const { data: history } = useLiveQuery(db.select().from(nutritionTargets).orderBy(desc(nutritionTargets.effectiveFrom), desc(nutritionTargets.id)));
  const latest = history[0];
  const todays = useDbValue(() => dayTargets(today), [today, history]);
  const [message, setMessage] = useState('');

  return (
    <>
      <Stack.Screen options={{ title: 'Calorie & protein targets' }} />
      <Screen edges={['bottom']}>
        <Title subtitle={todays ? `${dayTypeFor(today)} day` : undefined}>
          {todays ? `${Math.round(todays.kcal)} kcal · ${Math.round(todays.proteinG)} g protein` : 'No targets yet'}
        </Title>
        {latest ? (
          <>
            <Card>
              <Row label="BMR (Mifflin-St Jeor)" value={`${Math.round(latest.bmr)} kcal`} />
              <Row label="Maintenance (× activity)" value={`${Math.round(latest.tdee)} kcal`} />
              <Row label="Deficit" value={`−${Math.round(latest.deficitKcal)} kcal`} />
              <Row label="Trend adjustment" value={`${latest.adjustKcal >= 0 ? '+' : ''}${Math.round(latest.adjustKcal)} kcal`} />
              <Row label="Base calories" value={`${Math.round(latest.kcal)} kcal`} />
              <Row label="Protein (1.8 g/kg)" value={`${Math.round(latest.proteinG)} g`} />
              <Row label="Fat (≥ 0.8 g/kg)" value={`${Math.round(latest.fatG)} g`} />
              <Row label="Carbs (rest of calories)" value={`${Math.round(latest.carbsG)} g`} />
            </Card>
            <Body dim>{latest.reason}</Body>
            <Body dim>
              Carbs go up 15% on run and tennis days and down 15% on rest days. Every 14 days the 7-day weight trend is compared with the 0.5–0.75%/week target and calories move by
              100.
            </Body>
            <View style={{ height: 12 }} />
            <Button variant="secondary" label="Review now" onPress={() => setMessage(recalcTargets(today, latest.effectiveFrom, latest.adjustKcal))} />
            {message ? <Body dim>{message}</Body> : null}
          </>
        ) : (
          <Body dim>Targets are created after onboarding.</Body>
        )}
        <SectionLabel>History</SectionLabel>
        {history.map((h) => (
          <Body key={h.id} dim>
            {formatShortDate(h.effectiveFrom)} · {Math.round(h.kcal)} kcal · {Math.round(h.proteinG)} g P
          </Body>
        ))}
      </Screen>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: colors.textDim, fontSize: font.body }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: font.body }}>{value}</Text>
    </View>
  );
}
