import { desc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { db } from '@/db/client';
import { copyYesterday, dayTargets, dayTypeFor, deleteFoodLog, logPlannedMeal, plannedMealsOn } from '@/db/repos/nutritionRepo';
import { foodLogs, mealPlanItems, nutritionTargets, plannedSessions } from '@/db/schema';
import { useDbValue } from '@/db/useDbValue';
import { todayKey } from '@/domain/dates';
import { addMacros, isPlannedSlot, LOG_SLOTS, LOG_SLOT_LABELS, ZERO_MACROS } from '@/domain/nutrition/types';
import { TabHeader } from '@/features/navigation/TabHeader';
import { Body, Button, Card, RowLink, Screen, SectionLabel } from '@/ui/components';
import { Ring } from '@/ui/Ring';
import { colors, font, radius, space } from '@/ui/theme';

export default function FoodTab() {
  const today = todayKey();
  const { data: logs } = useLiveQuery(db.select().from(foodLogs).where(eq(foodLogs.date, today)));
  // Watched so the derived reads below re-run when these tables change; the rows are unused.
  const { updatedAt: targetsAt } = useLiveQuery(db.select({ id: nutritionTargets.id }).from(nutritionTargets).orderBy(desc(nutritionTargets.id)).limit(1));
  const { updatedAt: sessionsAt } = useLiveQuery(db.select({ id: plannedSessions.id }).from(plannedSessions).where(eq(plannedSessions.date, today)));
  const { updatedAt: mealPlanAt } = useLiveQuery(db.select({ id: mealPlanItems.id }).from(mealPlanItems));

  const targets = useDbValue(() => dayTargets(today), [today, targetsAt, sessionsAt]);
  const dayType = useDbValue(() => dayTypeFor(today), [today, sessionsAt]);
  const totals = logs.reduce((sum, l) => addMacros(sum, { kcal: l.kcal, proteinG: l.proteinG, carbsG: l.carbsG, fatG: l.fatG, fiberG: l.fiberG }), ZERO_MACROS);
  // plannedMealsOn builds the week's plan when it is missing, so it must never run on every render.
  const planned = useDbValue(() => plannedMealsOn(today), [today, mealPlanAt]);

  const confirmDelete = (id: number, name: string) =>
    Alert.alert(`Remove ${name}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteFoodLog(id) },
    ]);

  return (
    <Screen bottomInset>
      <TabHeader title="Food" subtitle={targets ? `${dayType} day · ${Math.round(targets.carbsG)} g carbs · ${Math.round(targets.fatG)} g fat` : undefined} />

      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: space.md }}>
        <Ring value={totals.kcal} target={targets?.kcal ?? 0} label="Calories" unit="kcal" />
        <Ring value={totals.proteinG} target={targets?.proteinG ?? 0} label="Protein" unit="g" color={colors.info} />
      </View>
      <Body dim>
        Carbs {Math.round(totals.carbsG)} / {Math.round(targets?.carbsG ?? 0)} g · Fat {Math.round(totals.fatG)} / {Math.round(targets?.fatG ?? 0)} g · Fibre{' '}
        {Math.round(totals.fiberG)} g
      </Body>

      {LOG_SLOTS.map((slot) => {
        const entries = logs.filter((l) => l.slot === slot);
        // Extras are never planned, so that section only ever offers "+ Add".
        const plan = isPlannedSlot(slot) ? planned.find((m) => m.slot === slot) : undefined;
        return (
          <View key={slot}>
            <SectionLabel>{LOG_SLOT_LABELS[slot]}</SectionLabel>
            <Card>
              {slot === 'extra' && entries.length === 0 ? <Body dim>Fruit through the day, a yoghurt, anything outside the planned meals.</Body> : null}
              {entries.map((l) => (
                <Pressable key={l.id} onPress={() => confirmDelete(l.id, l.foodName)} style={styles.entry}>
                  <Text style={styles.entryName} numberOfLines={1}>
                    {l.foodName}
                  </Text>
                  <Text style={styles.entryMeta}>
                    {l.servingLabel} · {Math.round(l.kcal)} kcal · {Math.round(l.proteinG)} g P
                  </Text>
                </Pressable>
              ))}
              {entries.length === 0 && plan ? (
                <Text style={styles.planned}>
                  Planned: {plan.name} ({Math.round(plan.macros.kcal)} kcal, {Math.round(plan.macros.proteinG)} g P)
                </Text>
              ) : null}
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                <View style={{ flex: 1 }}>
                  <Button label="+ Add" onPress={() => router.push({ pathname: '/food/search', params: { slot, date: today } })} />
                </View>
                {entries.length === 0 && plan ? (
                  <View style={{ flex: 1 }}>
                    <Button variant="secondary" label="Ate the planned meal" onPress={() => logPlannedMeal(plan)} />
                  </View>
                ) : null}
              </View>
            </Card>
          </View>
        );
      })}

      <SectionLabel>More</SectionLabel>
      <RowLink label="Weekly meal plan" onPress={() => router.push('/food/plan')} />
      <RowLink label="Grocery list" onPress={() => router.push('/food/grocery')} />
      <RowLink label="How targets are calculated" value={targets ? `${Math.round(targets.kcal)} kcal` : undefined} onPress={() => router.push('/food/targets')} />
      <RowLink label="Copy all of yesterday" onPress={() => Alert.alert('Copied', `${copyYesterday(today)} entries added.`)} />
      <View style={{ height: space.md }} />
      <Text style={{ color: colors.textDim, fontSize: font.small }}>Tap an entry to remove it.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  entry: { paddingVertical: space.xs, borderRadius: radius.sm },
  entryName: { color: colors.text, fontSize: font.body },
  entryMeta: { color: colors.textDim, fontSize: font.small },
  planned: { color: colors.info, fontSize: font.small },
});
