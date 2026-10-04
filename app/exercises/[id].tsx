import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { getExercise } from '@/data/exercises';
import { exerciseHistory } from '@/db/repos/workoutRepo';
import { ExerciseInfo } from '@/features/workout/ExerciseInfo';
import { Body, RowLink, Screen, SectionLabel } from '@/ui/components';
import { formatLb, formatShortDate } from '@/ui/format';
import { colors, font, space } from '@/ui/theme';

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exercise = getExercise(id);
  const [history] = useState(() => exerciseHistory(id, null, 6));

  return (
    <>
      <Stack.Screen options={{ title: exercise.name }} />
      <Screen edges={['bottom']}>
        <ExerciseInfo exercise={exercise} />

        <SectionLabel>Defaults</SectionLabel>
        <Body dim>
          {exercise.reps[0]}–{exercise.reps[1]} {exercise.loadType === 'time' ? 'seconds' : 'reps'} · rest {exercise.restSec} s ·{' '}
          {exercise.incrementLb > 0 ? `+${exercise.incrementLb} lb steps` : 'bodyweight'} · {exercise.tier}
        </Body>

        <SectionLabel>Alternatives</SectionLabel>
        {exercise.alternatives.map((altId) => (
          <RowLink key={altId} label={getExercise(altId).name} onPress={() => router.push(`/exercises/${altId}`)} />
        ))}

        <SectionLabel>Your history</SectionLabel>
        {history.length === 0 ? <Body dim>No sets logged yet.</Body> : null}
        {history.map((h) => (
          <View key={h.workoutId} style={{ marginBottom: space.sm }}>
            <Text style={{ color: colors.text, fontSize: font.body }}>{formatShortDate(h.date)}</Text>
            <Text style={{ color: colors.textDim, fontSize: font.small }}>
              {h.sets.map((s) => (exercise.loadType === 'weight' ? `${formatLb(s.weightKg, 1).replace('.0 lb', ' lb')} × ${s.reps} @${s.rpe}` : `${s.reps} @${s.rpe}`)).join('  ·  ')}
            </Text>
          </View>
        ))}
      </Screen>
    </>
  );
}
