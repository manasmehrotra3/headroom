import { useState } from 'react';
import { Text, View } from 'react-native';

import { activitiesNeedingRpe, setActivityRpe } from '@/db/repos/activityRepo';
import { recomputeRange } from '@/sync/syncService';
import { todayKey } from '@/domain/dates';
import { formatDuration } from '@/domain/units';
import { SectionHeader } from '@/ui/cards';
import { Body, Card, Chips } from '@/ui/components';
import { formatShortDate } from '@/ui/format';
import { colors, font } from '@/ui/theme';

const RPE_OPTIONS = [3, 4, 5, 6, 7, 8, 9].map((n) => ({ id: String(n), label: String(n) }));

/**
 * "How hard was it?" for synced sessions. Until rated, load uses an RPE estimated from
 * heart rate; a real rating replaces it.
 */
export function RpePrompt() {
  const [pending, setPending] = useState(() => activitiesNeedingRpe(3));
  if (pending.length === 0) return null;

  const rate = (id: number, date: string, rpe: number) => {
    setActivityRpe(id, rpe);
    recomputeRange(date, todayKey());
    setPending((list) => list.filter((a) => a.id !== id));
  };

  return (
    <View>
      <SectionHeader title="Rate recent sessions" />
      {pending.map((a) => (
        <Card key={a.id}>
          <Text style={{ color: colors.text, fontSize: font.body, fontWeight: '600' }}>
            {a.title} · {formatShortDate(a.date)} · {formatDuration(a.durationSec)}
          </Text>
          <Body dim>
            {a.avgHr ? `Avg HR ${a.avgHr}. ` : ''}Estimated RPE {a.rpe}. Tap the real one:
          </Body>
          <Chips options={RPE_OPTIONS} selected={[]} onToggle={(id) => rate(a.id, a.date, Number(id))} />
        </Card>
      ))}
    </View>
  );
}
