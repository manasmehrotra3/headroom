import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { dayTargets, ensureMealPlan, logPlannedMeal, plannedMealsFor, swapMeal, swapOptionsFor } from '@/db/repos/nutritionRepo';
import { useDbValue } from '@/db/useDbValue';
import { addDays, startOfWeek, todayKey, weekDates, WEEKDAY_LABELS, weekdayOf } from '@/domain/dates';
import { dayTotals, type PlannedMeal } from '@/domain/nutrition/mealPlan';
import { MEAL_SLOT_LABELS } from '@/domain/nutrition/types';
import { Body, Button, Card, Screen, SectionLabel, Title } from '@/ui/components';
import { formatShortDate } from '@/ui/format';
import { colors, font, radius, space, TAP_MIN } from '@/ui/theme';

/** The rotating weekly meal plan: swap any meal for something with similar calories and protein. */
export default function MealPlanScreen() {
  const today = todayKey();
  const [weekStart, setWeekStart] = useState(startOfWeek(today));
  const [version, setVersion] = useState(0);
  useState(() => ensureMealPlan(weekStart));
  const [swapFor, setSwapFor] = useState<PlannedMeal | null>(null);

  // `version` is bumped by a swap; it is what re-reads the week after a write.
  const meals = useDbValue(() => plannedMealsFor(weekStart), [weekStart, version]);
  // One read per day, so this must not run per render: the week renders seven of them.
  const targetsByDate = useDbValue(() => new Map(weekDates(weekStart).map((date) => [date, dayTargets(date)])), [weekStart, version]);

  const changeWeek = (delta: number) => {
    const next = addDays(weekStart, delta);
    ensureMealPlan(next);
    setWeekStart(next);
  };

  const doSwap = (foodId: string, grams: number) => {
    if (!swapFor) return;
    swapMeal(swapFor.date, swapFor.slot, foodId, grams);
    setSwapFor(null);
    setVersion((v) => v + 1);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Weekly meal plan' }} />
      <Screen edges={['bottom']}>
        <Title subtitle="Indian vegetarian, a protein anchor in every meal, no dish twice within 3 days.">Week of {formatShortDate(weekStart).replace(/^\w+, /, '')}</Title>
        <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.md }}>
          <View style={{ flex: 1 }}>
            <Button variant="secondary" label="‹ Week" onPress={() => changeWeek(-7)} />
          </View>
          <View style={{ flex: 1 }}>
            <Button variant="secondary" label="Week ›" onPress={() => changeWeek(7)} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.md }}>
          <View style={{ flex: 1 }}>
            <Button variant="secondary" label="Grocery list" onPress={() => router.push({ pathname: '/food/grocery', params: { weekStart } })} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              variant="secondary"
              label="Regenerate"
              onPress={() => {
                ensureMealPlan(weekStart, true);
                setVersion((v) => v + 1);
              }}
            />
          </View>
        </View>

        {weekDates(weekStart).map((date) => {
          const dayMeals = meals.filter((m) => m.date === date);
          const totals = dayTotals(meals, date);
          const targets = targetsByDate.get(date) ?? null;
          return (
            <View key={date}>
              <SectionLabel>
                {WEEKDAY_LABELS[weekdayOf(date)]}
                {date === today ? ' · today' : ''} · {Math.round(totals.kcal)} kcal · {Math.round(totals.proteinG)} g protein
                {targets ? ` (target ${Math.round(targets.kcal)} / ${Math.round(targets.proteinG)} g)` : ''}
              </SectionLabel>
              {dayMeals.map((m) => (
                <Card key={`${m.date}-${m.slot}`}>
                  <Text style={{ color: colors.textDim, fontSize: font.small }}>{MEAL_SLOT_LABELS[m.slot]}</Text>
                  <Text style={{ color: colors.text, fontSize: font.body, fontWeight: '600' }}>{m.name}</Text>
                  {m.leftover ? <Text style={{ color: colors.info, fontSize: font.small }}>Leftovers — cooked yesterday</Text> : null}
                  <Text style={{ color: colors.textDim, fontSize: font.small }}>
                    {Math.round(m.grams)} g · {Math.round(m.macros.kcal)} kcal · {Math.round(m.macros.proteinG)} g protein
                  </Text>
                  <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.xs }}>
                    <Pressable onPress={() => setSwapFor(m)} style={styles.pill}>
                      <Text style={styles.pillText}>Swap</Text>
                    </Pressable>
                    {m.date === today ? (
                      <Pressable
                        onPress={() => {
                          logPlannedMeal(m);
                          router.back();
                        }}
                        style={styles.pill}
                      >
                        <Text style={styles.pillText}>Ate this</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </Card>
              ))}
            </View>
          );
        })}

        <Modal visible={swapFor !== null} transparent animationType="slide" onRequestClose={() => setSwapFor(null)}>
          <Pressable style={styles.backdrop} onPress={() => setSwapFor(null)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Swap {swapFor?.name} for…</Text>
            {swapFor
              ? swapOptionsFor(swapFor).map((o) => (
                  <Pressable key={o.dish.id} onPress={() => doSwap(o.dish.id, o.grams)} style={styles.option}>
                    <Text style={{ color: colors.text, fontSize: font.body, fontWeight: '600' }}>{o.dish.name}</Text>
                    <Text style={{ color: colors.textDim, fontSize: font.small }}>
                      {Math.round(o.grams)} g · {Math.round(o.macros.kcal)} kcal · {Math.round(o.macros.proteinG)} g protein
                    </Text>
                  </Pressable>
                ))
              : null}
            <Button variant="secondary" label="Cancel" onPress={() => setSwapFor(null)} />
          </View>
        </Modal>
        <Body dim>Swapped meals are kept when you regenerate.</Body>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  pill: { minHeight: 40, paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  pillText: { color: colors.text, fontSize: font.small },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: colors.sheet, padding: space.lg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, gap: space.sm },
  sheetTitle: { color: colors.text, fontSize: font.large, fontWeight: '600', marginBottom: space.sm },
  option: { minHeight: TAP_MIN, justifyContent: 'center', paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.md, backgroundColor: colors.surfaceRaised },
});
