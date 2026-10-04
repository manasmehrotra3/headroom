import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { ensureMealPlan, groceryFor } from '@/db/repos/nutritionRepo';
import { startOfWeek, todayKey } from '@/domain/dates';
import { Body, Screen, Title } from '@/ui/components';
import { formatShortDate } from '@/ui/format';
import { colors, font, space, TAP_MIN } from '@/ui/theme';

/** Everything the week's meal plan needs, summed. Tick items off as you shop. */
export default function GroceryScreen() {
  const params = useLocalSearchParams<{ weekStart?: string }>();
  const weekStart = params.weekStart ?? startOfWeek(todayKey());
  useState(() => ensureMealPlan(weekStart));
  const [list] = useState(() => groceryFor(weekStart));
  const [done, setDone] = useState<Set<string>>(new Set());

  const fmt = (qty: number, unit: string) => (unit === 'pc' ? `${qty}` : unit === 'slice' ? `${qty} slices` : `${qty} ${unit}`);

  return (
    <>
      <Stack.Screen options={{ title: 'Grocery list' }} />
      <Screen edges={['bottom']}>
        <Title subtitle="Quantities are for the planned portions; staples like oil, spices and salt are assumed.">Week of {formatShortDate(weekStart).replace(/^\w+, /, '')}</Title>
        {list.map((line) => {
          const key = `${line.item}|${line.unit}`;
          const ticked = done.has(key);
          return (
            <Pressable
              key={key}
              onPress={() => setDone((d) => {
                const next = new Set(d);
                if (ticked) next.delete(key);
                else next.add(key);
                return next;
              })}
              style={styles.row}
            >
              <Text style={[styles.item, ticked && styles.ticked]}>
                {ticked ? '☑ ' : '☐ '}
                {line.item}
              </Text>
              <Text style={[styles.qty, ticked && styles.ticked]}>{fmt(line.qty, line.unit)}</Text>
            </Pressable>
          );
        })}
        {list.length === 0 ? <Body dim>No meal plan for this week yet.</Body> : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: TAP_MIN, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  item: { color: colors.text, fontSize: font.body },
  qty: { color: colors.textDim, fontSize: font.body },
  ticked: { textDecorationLine: 'line-through', color: colors.textDim },
});
