import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getExercise } from '@/data/exercises';
import type { SetRow } from '@/db/repos/workoutRepo';
import { totalVolumeKg } from '@/domain/strength/progression';
import { formatDuration } from '@/domain/units';
import { Body, Button, Card, Chips, SectionLabel, Title } from '@/ui/components';
import { formatLb } from '@/ui/format';
import { colors, font, space } from '@/ui/theme';

const RPE_OPTIONS = [4, 5, 6, 7, 8, 9, 10].map((n) => ({ id: String(n), label: String(n) }));

/** End-of-session screen: totals per exercise, then the session RPE prompt that feeds training load. */
export function WorkoutSummary({ sets, startedAt, onFinish }: { sets: SetRow[]; startedAt: Date; onFinish: (sessionRpe: number) => void }) {
  const [rpe, setRpe] = useState<number | null>(null);
  const durationSec = (Date.now() - startedAt.getTime()) / 1000;
  const volume = totalVolumeKg(sets);

  const byExercise = new Map<string, SetRow[]>();
  for (const set of sets) byExercise.set(set.exerciseId, [...(byExercise.get(set.exerciseId) ?? []), set]);

  return (
    <View>
      <Title subtitle={`${formatDuration(durationSec)} · ${sets.length} sets · ${formatLb(volume, 0)} total volume`}>Session done</Title>

      {[...byExercise.entries()].map(([exerciseId, exerciseSets]) => {
        const exercise = getExercise(exerciseId);
        return (
          <Card key={exerciseId}>
            <Text style={styles.name}>{exercise.name}</Text>
            <Text style={styles.sets}>
              {exerciseSets
                .map((s) => (exercise.loadType === 'weight' ? `${formatLb(s.weightKg, 1).replace('.0 lb', ' lb')} × ${s.reps}` : `${s.reps}${exercise.loadType === 'time' ? ' s' : ''}`))
                .join('  ·  ')}
            </Text>
          </Card>
        );
      })}

      <SectionLabel>How hard was the whole session?</SectionLabel>
      <Body dim>1 = rest, 5 = moderate, 7 = hard, 10 = maximal. This is what training load is built from.</Body>
      <View style={{ height: space.sm }} />
      <Chips options={RPE_OPTIONS} selected={rpe === null ? [] : [String(rpe)]} onToggle={(id) => setRpe(Number(id))} />
      <View style={{ height: space.lg }} />
      <Button label="Save session" disabled={rpe === null} onPress={() => rpe !== null && onFinish(rpe)} />
    </View>
  );
}

const styles = StyleSheet.create({
  name: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  sets: { color: colors.textDim, fontSize: font.small },
});
