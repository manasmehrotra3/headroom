import { router, Stack } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Text, TextInput, View } from 'react-native';

import { EXERCISES } from '@/data/exercises';
import { loadAvailableEquipment } from '@/db/repos/profileRepo';
import type { Exercise, ExerciseCategory } from '@/domain/strength/types';
import { isAvailable } from '@/domain/strength/workoutBuilder';
import { Chips, RowLink, Screen, SCREEN_PADDING } from '@/ui/components';
import { colors, font, radius, space } from '@/ui/theme';

const CATEGORIES: { id: ExerciseCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'lower', label: 'Lower' },
  { id: 'push', label: 'Push' },
  { id: 'pull', label: 'Pull' },
  { id: 'core', label: 'Core' },
  { id: 'mobility', label: 'Mobility' },
];

function matches(e: Exercise, category: ExerciseCategory | 'all', needle: string): boolean {
  if (category !== 'all' && e.category !== category) return false;
  if (needle === '') return true;
  return e.name.toLowerCase().includes(needle) || e.muscles.join(' ').toLowerCase().includes(needle);
}

/** All 100-odd exercises, searchable. A FlatList because every row is a tappable card. */
export default function ExerciseLibrary() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ExerciseCategory | 'all'>('all');
  const [available] = useState(loadAvailableEquipment);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return EXERCISES.filter((e) => matches(e, category, needle));
  }, [query, category]);

  const renderItem = useCallback(
    ({ item }: { item: Exercise }) => (
      <RowLink label={item.name} value={isAvailable(item, available) ? item.muscles[0] : 'needs equipment you unticked'} onPress={() => router.push(`/exercises/${item.id}`)} />
    ),
    [available],
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Exercise library' }} />
      <Screen edges={[]} scroll={false}>
        <FlatList
          data={shown}
          keyExtractor={(e) => e.id}
          renderItem={renderItem}
          contentContainerStyle={SCREEN_PADDING}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search by name or muscle"
                placeholderTextColor={colors.textDim}
                style={{
                  minHeight: 52,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  color: colors.text,
                  paddingHorizontal: space.md,
                  fontSize: font.body,
                  marginBottom: space.md,
                }}
              />
              <Chips options={CATEGORIES} selected={[category]} onToggle={setCategory} />
              <View style={{ height: space.md }} />
            </>
          }
          ListFooterComponent={
            <Text style={{ color: colors.textDim, fontSize: font.small, marginTop: space.md }}>{shown.length} exercises. Frames from free-exercise-db (public domain).</Text>
          }
        />
      </Screen>
    </>
  );
}
