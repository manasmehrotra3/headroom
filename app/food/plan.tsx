import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

import { dayTargets, ensureMealPlan, logPlannedMeal, plannedMealsFor, swapMeal, swapOptionsFor } from '@/db/repos/nutritionRepo';
import { useDbValue } from '@/db/useDbValue';
import { addDays, startOfWeek, todayKey, weekDates, WEEKDAY_LABELS, weekdayOf } from '@/domain/dates';
import { dayTotals, type PlannedMeal } from '@/domain/nutrition/mealPlan';
import { MEAL_SLOT_LABELS } from '@/domain/nutrition/types';
import { Body, Button, Card, Screen, SectionLabel, Title } from '@/ui/components';
import { ConnectedButtonGroup, segmentedCorners } from '@/ui/expressive';
import { formatShortDate } from '@/ui/format';
import { M3Pressable, hapticSuccess } from '@/ui/motion';
import { colors, font, radius, space, TAP_MIN } from '@/ui/theme';

/** The rotating 7-day Indian vegetarian meal plan: zero repeats per week, protein-base variety. */
export default function MealPlanScreen() {
  const today = todayKey();
  const thisWeek = startOfWeek(today);
  const [weekStart, setWeekStart] = useState(thisWeek);
  const [version, setVersion] = useState(0);
  useState(() => ensureMealPlan(weekStart));
  const [swapFor, setSwapFor] = useState<PlannedMeal | null>(null);

  const meals = useDbValue(() => plannedMealsFor(weekStart), [weekStart, version]);
  const targetsByDate = useDbValue(() => new Map(weekDates(weekStart).map((date) => [date, dayTargets(date)])), [weekStart, version]);

  const changeWeek = (next: string) => {
    ensureMealPlan(next);
    setWeekStart(next);
  };

  const weekNavValue: 'prev' | 'current' | 'next' =
    weekStart < thisWeek ? 'prev' : weekStart > thisWeek ? 'next' : 'current';

  const onWeekNav = (id: 'prev' | 'current' | 'next') => {
    if (id === 'prev') changeWeek(addDays(weekStart, -7));
    else if (id === 'next') changeWeek(addDays(weekStart, 7));
    else changeWeek(thisWeek);
  };

  const doSwap = (foodId: string, grams: number) => {
    if (!swapFor) return;
    swapMeal(swapFor.date, swapFor.slot, foodId, grams);
    setSwapFor(null);
    setVersion((v) => v + 1);
  };

  const swapList = swapFor ? swapOptionsFor(swapFor) : [];

  return (
    <>
      <Stack.Screen options={{ title: 'Weekly meal plan' }} />
      <Screen edges={['bottom']}>
        <Title subtitle="Regional Indian vegetarian (INDB / IFCT 2017) · rotated protein bases · no dish twice in 7 days.">
          Week of {formatShortDate(weekStart).replace(/^\w+, /, '')}
        </Title>

        <View style={{ marginBottom: space.md }}>
          <ConnectedButtonGroup
            options={[
              { id: 'prev', label: '‹ Prev' },
              { id: 'current', label: 'This week' },
              { id: 'next', label: 'Next ›' },
            ]}
            value={weekNavValue}
            onChange={onWeekNav}
            size="large"
          />
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
                {date === today ? ' · today' : ''} · {Math.round(totals.kcal)} kcal · {Math.round(totals.proteinG)}g P
                {targets ? ` (target ${Math.round(targets.kcal)} / ${Math.round(targets.proteinG)}g)` : ''}
              </SectionLabel>
              {dayMeals.map((m) => (
                <Card key={`${m.date}-${m.slot}`}>
                  <Text style={styles.slotLabel}>{MEAL_SLOT_LABELS[m.slot].toUpperCase()}</Text>
                  <Text style={styles.mealName}>{m.name}</Text>
                  {m.leftover ? <Text style={styles.leftover}>Leftovers — cooked yesterday</Text> : null}
                  <Text style={styles.mealMeta}>
                    {Math.round(m.grams)} g · {Math.round(m.macros.kcal)} kcal · {Math.round(m.macros.proteinG)} g protein
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.xs }}>
                    <M3Pressable
                      onPress={() =>
                        router.push({
                          pathname: '/food/dish/[id]',
                          params: { id: m.foodId, grams: String(Math.round(m.grams)), slot: m.slot, date: m.date },
                        })
                      }
                      haptic="tap"
                      style={[styles.pill, styles.pillTertiary]}
                    >
                      <Text style={[styles.pillText, { color: colors.onTertiaryContainer }]}>Recipe</Text>
                    </M3Pressable>
                    <M3Pressable onPress={() => setSwapFor(m)} haptic="tap" style={styles.pill}>
                      <Text style={styles.pillText}>Swap</Text>
                    </M3Pressable>
                    {m.date === today ? (
                      <M3Pressable
                        onPress={() => {
                          hapticSuccess();
                          logPlannedMeal(m);
                          router.back();
                        }}
                        haptic="medium"
                        style={[styles.pill, styles.pillPrimary]}
                      >
                        <Text style={[styles.pillText, { color: colors.onPrimary }]}>Ate this</Text>
                      </M3Pressable>
                    ) : null}
                  </View>
                </Card>
              ))}
            </View>
          );
        })}

        <Modal visible={swapFor !== null} transparent animationType="none" onRequestClose={() => setSwapFor(null)}>
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Animated.View entering={FadeIn.duration(180)} style={styles.backdrop}>
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setSwapFor(null)} />
            </Animated.View>
            <Animated.View entering={SlideInDown.springify().damping(20).stiffness(240)} style={styles.sheet}>
              <View style={styles.handle} />
              <Text style={styles.sheetTitle}>Swap {swapFor?.name} for…</Text>
              <View style={{ gap: 3 }}>
                {swapList.map((o, idx) => (
                  <M3Pressable
                    key={o.dish.id}
                    onPress={() => doSwap(o.dish.id, o.grams)}
                    haptic="select"
                    style={[styles.option, segmentedCorners(idx === 0, idx === swapList.length - 1)]}
                  >
                    <Text style={styles.optionName}>{o.dish.name}</Text>
                    <Text style={styles.optionMeta}>
                      {Math.round(o.grams)} g · {Math.round(o.macros.kcal)} kcal · {Math.round(o.macros.proteinG)} g protein
                    </Text>
                  </M3Pressable>
                ))}
              </View>
              <Button variant="secondary" label="Cancel" onPress={() => setSwapFor(null)} />
            </Animated.View>
          </View>
        </Modal>
        <Body dim>Swapped meals are kept when you regenerate.</Body>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  slotLabel: { color: colors.primary, fontSize: font.caption, fontWeight: '700', letterSpacing: 0.8 },
  mealName: { color: colors.onSurface, fontSize: font.body + 1, fontWeight: '700' },
  leftover: { color: colors.tertiary, fontSize: font.small, fontWeight: '600' },
  mealMeta: { color: colors.onSurfaceVariant, fontSize: font.small, fontVariant: ['tabular-nums'] },
  pill: {
    minHeight: 40,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.secondaryContainer,
    justifyContent: 'center',
  },
  pillPrimary: { backgroundColor: colors.primary },
  pillTertiary: { backgroundColor: colors.tertiaryContainer },
  pillText: { color: colors.onSecondaryContainer, fontSize: font.small, fontWeight: '700' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(6, 10, 14, 0.68)' },
  sheet: {
    backgroundColor: colors.sheet,
    padding: space.lg,
    paddingBottom: space.xxl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    gap: space.md,
  },
  handle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 99, backgroundColor: colors.outlineVariant },
  sheetTitle: { color: colors.onSurface, fontSize: font.large, fontWeight: '800' },
  option: { minHeight: TAP_MIN, justifyContent: 'center', paddingHorizontal: space.lg, paddingVertical: space.sm, backgroundColor: colors.surface },
  optionName: { color: colors.onSurface, fontSize: font.body, fontWeight: '700' },
  optionMeta: { color: colors.onSurfaceVariant, fontSize: font.small, marginTop: 2 },
});
