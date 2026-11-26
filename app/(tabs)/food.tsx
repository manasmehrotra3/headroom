import { desc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { Alert, Text, View } from 'react-native';

import { db } from '@/db/client';
import { copyYesterday, dayTargets, dayTypeFor, deleteFoodLog, logPlannedMeal, plannedMealsOn } from '@/db/repos/nutritionRepo';
import { foodLogs, mealPlanItems, nutritionTargets, plannedSessions } from '@/db/schema';
import { useDbValue } from '@/db/useDbValue';
import { todayKey } from '@/domain/dates';
import { addMacros, isPlannedSlot, LOG_SLOTS, LOG_SLOT_LABELS, ZERO_MACROS } from '@/domain/nutrition/types';
import { TabHeader } from '@/features/navigation/TabHeader';
import { Body, Button, Card, RowGroup, RowLink, Screen, SectionLabel } from '@/ui/components';
import { M3Enter, M3Pressable, hapticSuccess } from '@/ui/motion';
import { Ring } from '@/ui/Ring';
import { colors, font, radius, space, themedStyles } from '@/ui/theme';

export default function FoodTab() {
  const today = todayKey();
  const { data: logs } = useLiveQuery(db.select().from(foodLogs).where(eq(foodLogs.date, today)));
  const { updatedAt: targetsAt } = useLiveQuery(db.select({ id: nutritionTargets.id }).from(nutritionTargets).orderBy(desc(nutritionTargets.id)).limit(1));
  const { updatedAt: sessionsAt } = useLiveQuery(db.select({ id: plannedSessions.id }).from(plannedSessions).where(eq(plannedSessions.date, today)));
  const { updatedAt: mealPlanAt } = useLiveQuery(db.select({ id: mealPlanItems.id }).from(mealPlanItems));

  const targets = useDbValue(() => dayTargets(today), [today, targetsAt, sessionsAt]);
  const dayType = useDbValue(() => dayTypeFor(today), [today, sessionsAt]);
  const totals = logs.reduce((sum, l) => addMacros(sum, { kcal: l.kcal, proteinG: l.proteinG, carbsG: l.carbsG, fatG: l.fatG, fiberG: l.fiberG }), ZERO_MACROS);
  const planned = useDbValue(() => plannedMealsOn(today), [today, mealPlanAt]);

  const confirmDelete = (id: number, name: string) =>
    Alert.alert(`Remove ${name}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteFoodLog(id) },
    ]);

  return (
    <Screen bottomInset>
      <TabHeader title="Food" subtitle={targets ? `${dayType} day · ${Math.round(targets.carbsG)} g carbs · ${Math.round(targets.fatG)} g fat` : undefined} />

      <M3Enter index={0}>
        <Card>
          <View style={styles.ringsRow}>
            <Ring value={totals.kcal} target={targets?.kcal ?? 0} label="Calories" unit="kcal" color={colors.primary} />
            <Ring value={totals.proteinG} target={targets?.proteinG ?? 0} label="Protein" unit="g" color={colors.tertiary} />
          </View>
          <View style={styles.macroChipsRow}>
            <View style={styles.macroChip}>
              <Text style={styles.macroChipText}>
                Carbs {Math.round(totals.carbsG)}/{Math.round(targets?.carbsG ?? 0)}g
              </Text>
            </View>
            <View style={styles.macroChip}>
              <Text style={styles.macroChipText}>
                Fat {Math.round(totals.fatG)}/{Math.round(targets?.fatG ?? 0)}g
              </Text>
            </View>
            <View style={styles.macroChip}>
              <Text style={styles.macroChipText}>Fibre {Math.round(totals.fiberG)}g</Text>
            </View>
          </View>
        </Card>
      </M3Enter>

      {LOG_SLOTS.map((slot, idx) => {
        const entries = logs.filter((l) => l.slot === slot);
        const plan = isPlannedSlot(slot) ? planned.find((m) => m.slot === slot) : undefined;
        return (
          <M3Enter key={slot} index={idx + 1}>
            <SectionLabel>{LOG_SLOT_LABELS[slot]}</SectionLabel>
            <Card>
              {slot === 'extra' && entries.length === 0 ? <Body dim>Fruit through the day, a yoghurt, anything outside the planned meals.</Body> : null}
              {entries.map((l) => (
                <M3Pressable key={l.id} onPress={() => confirmDelete(l.id, l.foodName)} haptic="tap" scaleTo={0.98} style={styles.entry}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.entryName} numberOfLines={1}>
                      {l.foodName}
                    </Text>
                    <Text style={styles.entryMeta}>
                      {l.servingLabel} · {Math.round(l.kcal)} kcal · {Math.round(l.proteinG)} g P
                    </Text>
                  </View>
                  <Text style={styles.entryRemove}>✕</Text>
                </M3Pressable>
              ))}
              {entries.length === 0 && plan ? (
                <M3Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`View recipe for ${plan.name}`}
                  onPress={() =>
                    router.push({
                      pathname: '/food/dish/[id]',
                      params: { id: plan.foodId, grams: String(Math.round(plan.grams)), slot, date: today },
                    })
                  }
                  haptic="tap"
                  scaleTo={0.98}
                  style={styles.plannedBox}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planned}>
                      Planned: {plan.name}
                    </Text>
                    <Text style={styles.plannedMeta}>
                      {Math.round(plan.macros.kcal)} kcal · {Math.round(plan.macros.proteinG)} g P
                    </Text>
                  </View>
                  <View style={styles.recipePill}>
                    <Text style={styles.recipePillText}>Recipe ›</Text>
                  </View>
                </M3Pressable>
              ) : null}
              <View style={{ flexDirection: 'row', gap: space.sm, marginTop: 2 }}>
                <View style={{ flex: 1 }}>
                  <Button label="+ Add" onPress={() => router.push({ pathname: '/food/search', params: { slot, date: today } })} />
                </View>
                {entries.length === 0 && plan ? (
                  <View style={{ flex: 1 }}>
                    <Button
                      variant="secondary"
                      label="Ate planned"
                      onPress={() => {
                        hapticSuccess();
                        logPlannedMeal(plan);
                      }}
                    />
                  </View>
                ) : null}
              </View>
            </Card>
          </M3Enter>
        );
      })}

      <SectionLabel>More</SectionLabel>
      <RowGroup>
        <RowLink label="Weekly meal plan" onPress={() => router.push('/food/plan')} />
        <RowLink label="Grocery list" onPress={() => router.push('/food/grocery')} />
        <RowLink label="How targets are calculated" value={targets ? `${Math.round(targets.kcal)} kcal` : undefined} onPress={() => router.push('/food/targets')} />
        <RowLink label="Copy all of yesterday" onPress={() => Alert.alert('Copied', `${copyYesterday(today)} entries added.`)} />
      </RowGroup>
      <View style={{ height: space.sm }} />
      <Text style={{ color: colors.onSurfaceVariant, fontSize: font.small }}>Tap an entry to remove it.</Text>
    </Screen>
  );
}

const styles = themedStyles(() => ({
  ringsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: space.xs },
  macroChipsRow: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  macroChip: {
    flex: 1,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  macroChipText: { color: colors.onSurfaceVariant, fontSize: font.caption + 1, fontWeight: '700', fontVariant: ['tabular-nums'] },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceLow,
  },
  entryName: { color: colors.onSurface, fontSize: font.body, fontWeight: '600' },
  entryMeta: { color: colors.onSurfaceVariant, fontSize: font.small - 1, marginTop: 2 },
  entryRemove: { color: colors.onSurfaceVariant, fontSize: font.small, opacity: 0.7 },
  plannedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.tertiaryContainer,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
  },
  planned: { color: colors.onTertiaryContainer, fontSize: font.small + 1, fontWeight: '700', lineHeight: 19 },
  plannedMeta: { color: colors.onTertiaryContainer, opacity: 0.82, fontSize: font.small - 1, marginTop: 2 },
  recipePill: {
    backgroundColor: colors.scrimSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  recipePillText: { color: colors.onTertiaryContainer, fontSize: font.caption + 1, fontWeight: '700' },
}));
