import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { recipeForDish } from '@/data/dishRecipes';
import { getFood, ingredientsForFood, logFood, per100, servingsFor } from '@/db/repos/nutritionRepo';
import { todayKey } from '@/domain/dates';
import { LOG_SLOT_LABELS, scale, type LogSlot } from '@/domain/nutrition/types';
import { Chip } from '@/ui/cards';
import { Body, Button, Card, Screen, SectionLabel } from '@/ui/components';
import { segmentedCorners } from '@/ui/expressive';
import { M3Enter, M3Pressable, hapticSelect, hapticSuccess } from '@/ui/motion';
import { colors, font, radius, space, themedStyles } from '@/ui/theme';

function formatQty(qty: number, unit: string): string {
  if (unit === 'g' || unit === 'ml') {
    const rounded = qty >= 20 ? Math.round(qty / 5) * 5 : Math.round(qty);
    return `${Math.max(1, rounded)} ${unit}`;
  }
  const halves = Math.round(qty * 2) / 2;
  const label = Number.isInteger(halves) ? String(halves) : halves.toFixed(1);
  if (unit === 'pc') return label;
  if (unit === 'slice') return `${label} ${halves === 1 ? 'slice' : 'slices'}`;
  return `${label} ${unit}`;
}

/** Material 3 Expressive recipe viewer for any suggested meal or custom dish. */
export default function DishRecipeScreen() {
  const params = useLocalSearchParams<{ id: string; grams?: string; slot?: LogSlot; date?: string }>();
  const food = getFood(params.id);
  const serving = food ? servingsFor(food.id)[0] : undefined;
  const defaultGrams = serving?.grams ?? 200;
  const plannedGrams = params.grams && Number(params.grams) > 0 ? Number(params.grams) : defaultGrams;
  const factor = defaultGrams > 0 ? plannedGrams / defaultGrams : 1;

  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set());

  if (!food) {
    return (
      <>
        <Stack.Screen options={{ title: 'Recipe' }} />
        <Screen edges={['bottom']}>
          <Card>
            <Body dim>Dish not found.</Body>
          </Card>
        </Screen>
      </>
    );
  }

  const macros = scale(per100(food), plannedGrams);
  const baseIngredients = ingredientsForFood(food.id);
  const scaledIngredients = baseIngredients.map((i) => ({
    ...i,
    qty: i.qty * factor,
  }));
  const recipe = recipeForDish(food.id, food.name, scaledIngredients);

  const toggleIngredient = (idx: number) => {
    hapticSelect();
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleStep = (idx: number) => {
    hapticSelect();
    setDoneSteps((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const canLog = Boolean(params.slot);
  const logSlot = params.slot ?? 'lunch';
  const logDate = params.date ?? todayKey();

  const onLogMeal = () => {
    hapticSuccess();
    logFood({
      date: logDate,
      slot: logSlot,
      food,
      servingLabel: serving ? `${serving.label} (planned portion)` : '1 serving',
      quantity: 1,
      grams: plannedGrams,
    });
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Recipe' }} />
      <Screen
        edges={['bottom']}
        footer={
          canLog ? (
            <Button label={`Log to ${LOG_SLOT_LABELS[logSlot].toLowerCase()} (${Math.round(macros.kcal)} kcal)`} onPress={onLogMeal} />
          ) : undefined
        }
      >
        <M3Enter index={0}>
          <Card>
            <View style={styles.chipRow}>
              <Chip label={recipe.region} tone="accent" />
              <Chip
                label={recipe.cookMin > 0 ? `${recipe.prepMin}m prep · ${recipe.cookMin}m cook` : `${recipe.prepMin}m prep · no cook`}
                tone="tertiary"
              />
              <Chip label={`${Math.round(plannedGrams)} g`} tone="neutral" />
            </View>

            <Text style={styles.dishTitle}>{food.name}</Text>

            <View style={styles.macroGrid}>
              <View style={styles.macroBox}>
                <Text style={styles.macroVal}>{Math.round(macros.kcal)}</Text>
                <Text style={styles.macroLabel}>kcal</Text>
              </View>
              <View style={styles.macroBox}>
                <Text style={[styles.macroVal, { color: colors.primary }]}>{Math.round(macros.proteinG)}g</Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={styles.macroBox}>
                <Text style={styles.macroVal}>{Math.round(macros.carbsG)}g</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroBox}>
                <Text style={styles.macroVal}>{Math.round(macros.fatG)}g</Text>
                <Text style={styles.macroLabel}>Fat</Text>
              </View>
            </View>
            <Text style={styles.fiberNote}>Fibre: {Math.round(macros.fiberG)} g · Source: {food.sourceRef ?? 'INDB / IFCT 2017'}</Text>
          </Card>
        </M3Enter>

        {scaledIngredients.length > 0 ? (
          <M3Enter index={1}>
            <SectionLabel>Ingredients (scaled to your portion)</SectionLabel>
            <View style={styles.segStack}>
              {scaledIngredients.map((ing, idx) => {
                const ticked = checkedIngredients.has(idx);
                return (
                  <M3Pressable
                    key={`${ing.item}-${idx}`}
                    onPress={() => toggleIngredient(idx)}
                    haptic="none"
                    scaleTo={0.985}
                    style={[styles.ingRow, segmentedCorners(idx === 0, idx === scaledIngredients.length - 1)]}
                  >
                    <View style={[styles.checkCircle, ticked && styles.checkCircleOn]}>
                      {ticked ? <Text style={styles.checkMark}>✓</Text> : null}
                    </View>
                    <Text style={[styles.ingName, ticked && styles.tickedText]}>{ing.item}</Text>
                    <Text style={[styles.ingQty, ticked && styles.tickedText]}>{formatQty(ing.qty, ing.unit)}</Text>
                  </M3Pressable>
                );
              })}
            </View>
            <Text style={styles.staplesNote}>Basic Indian pantry spices, salt, water and 1 tsp oil/ghee assumed.</Text>
          </M3Enter>
        ) : null}

        <M3Enter index={2}>
          <SectionLabel>Instructions</SectionLabel>
          <View style={styles.segStack}>
            {recipe.steps.map((step, idx) => {
              const done = doneSteps.has(idx);
              return (
                <M3Pressable
                  key={idx}
                  onPress={() => toggleStep(idx)}
                  haptic="none"
                  scaleTo={0.985}
                  style={[styles.stepRow, segmentedCorners(idx === 0, idx === recipe.steps.length - 1), done && { opacity: 0.6 }]}
                >
                  <View style={[styles.stepNum, done && { backgroundColor: colors.primary }]}>
                    <Text style={[styles.stepNumText, done && { color: colors.onPrimary }]}>{done ? '✓' : idx + 1}</Text>
                  </View>
                  <Text style={[styles.stepText, done && styles.tickedText]}>{step}</Text>
                </M3Pressable>
              );
            })}
          </View>
        </M3Enter>

        {recipe.tip ? (
          <M3Enter index={3}>
            <Card tone="tertiary">
              <Text style={styles.tipTitle}>Kitchen tip</Text>
              <Text style={styles.tipBody}>{recipe.tip}</Text>
            </Card>
          </M3Enter>
        ) : null}
      </Screen>
    </>
  );
}

const styles = themedStyles(() => ({
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dishTitle: { color: colors.onSurface, fontSize: font.title, fontWeight: '800', letterSpacing: -0.3, marginTop: 2 },
  macroGrid: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  macroBox: {
    flex: 1,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  macroVal: { color: colors.onSurface, fontSize: font.large, fontWeight: '800', fontVariant: ['tabular-nums'] },
  macroLabel: { color: colors.onSurfaceVariant, fontSize: font.caption, fontWeight: '600', marginTop: 2 },
  fiberNote: { color: colors.onSurfaceVariant, fontSize: font.small - 1, marginTop: 2 },
  segStack: { gap: 3, marginBottom: space.sm },
  ingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkMark: { color: colors.onPrimary, fontSize: 13, fontWeight: '800' },
  ingName: { flex: 1, color: colors.onSurface, fontSize: font.body, fontWeight: '600' },
  ingQty: { color: colors.primary, fontSize: font.body, fontWeight: '700', fontVariant: ['tabular-nums'] },
  tickedText: { textDecorationLine: 'line-through', opacity: 0.65 },
  staplesNote: { color: colors.onSurfaceVariant, fontSize: font.small - 1, marginBottom: space.sm, paddingHorizontal: space.xs },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    backgroundColor: colors.surface,
    padding: space.lg,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: { color: colors.onPrimaryContainer, fontSize: font.small, fontWeight: '800' },
  stepText: { flex: 1, color: colors.onSurface, fontSize: font.body, lineHeight: 22 },
  tipTitle: { color: colors.onTertiaryContainer, fontSize: font.caption + 1, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  tipBody: { color: colors.onTertiaryContainer, fontSize: font.body, lineHeight: 21 },
}));
