import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { createRecipe, per100, searchFoods, type FoodRow } from '@/db/repos/nutritionRepo';
import { recipeMacros } from '@/domain/nutrition/recipe';
import { MEAL_SLOT_LABELS, type MealSlot } from '@/domain/nutrition/types';
import { Body, Button, Chips, Field, RowLink, Screen, SectionLabel, Stepper, Title } from '@/ui/components';
import { colors, font, radius, space } from '@/ui/theme';

const SLOT_OPTIONS = (Object.keys(MEAL_SLOT_LABELS) as MealSlot[]).map((id) => ({ id, label: MEAL_SLOT_LABELS[id] }));

/** Enter ingredients once, get per-serving macros, and the dish joins the food list and meal plan. */
export default function RecipeScreen() {
  const [name, setName] = useState('');
  const [servings, setServings] = useState(4);
  const [slots, setSlots] = useState<MealSlot[]>([]);
  const [ingredients, setIngredients] = useState<{ food: FoodRow; grams: number }[]>([]);
  const [query, setQuery] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const results = query.trim() ? searchFoods(query, 8).filter((f) => !f.isDish) : [];
  const macros = recipeMacros(ingredients.map((i) => ({ per100: per100(i.food), grams: i.grams })), servings);

  const save = () => {
    const problems = [];
    if (!name.trim()) problems.push('Give the recipe a name.');
    if (ingredients.length === 0) problems.push('Add at least one ingredient.');
    setErrors(problems);
    if (problems.length) return;
    createRecipe({ name: name.trim(), servings, ingredients: ingredients.map((i) => ({ foodId: i.food.id, grams: i.grams })), slots });
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'New recipe' }} />
      <Screen edges={['bottom']} footer={<Button label="Save recipe" onPress={save} />}>
        <Title subtitle="Raw ingredient weights. Macros per serving are computed from IFCT values.">Custom recipe</Title>
        {errors.map((e) => (
          <Text key={e} style={{ color: colors.danger, fontSize: font.body }}>
            {e}
          </Text>
        ))}
        <Field label="Name" placeholder="e.g. Mum's rajma" value={name} onChangeText={setName} />
        <Stepper label="Servings the recipe makes" value={servings} step={1} min={1} max={20} format={(v) => String(v)} onChange={setServings} />
        <SectionLabel>Which meals can it be planned for? (optional)</SectionLabel>
        <Chips options={SLOT_OPTIONS} selected={slots} onToggle={(s) => setSlots((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))} />

        <SectionLabel>Ingredients</SectionLabel>
        {ingredients.map((i, idx) => (
          <View key={`${i.food.id}-${idx}`} style={{ marginBottom: space.sm }}>
            <Stepper
              label={i.food.name}
              value={i.grams}
              step={10}
              min={0}
              max={2000}
              format={(v) => `${v} g`}
              onChange={(grams) => setIngredients((cur) => cur.map((x, j) => (j === idx ? { ...x, grams } : x)).filter((x) => x.grams > 0))}
            />
          </View>
        ))}
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Add ingredient: paneer, onion, oil…"
          placeholderTextColor={colors.textDim}
          style={{ minHeight: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: space.md, fontSize: font.body }}
        />
        {results.map((f) => (
          <RowLink
            key={f.id}
            label={f.name}
            onPress={() => {
              setIngredients((cur) => [...cur, { food: f, grams: 100 }]);
              setQuery('');
            }}
          />
        ))}

        <SectionLabel>Per serving</SectionLabel>
        <Body>
          {Math.round(macros.perServing.kcal)} kcal · P {Math.round(macros.perServing.proteinG)} g · C {Math.round(macros.perServing.carbsG)} g · F {Math.round(macros.perServing.fatG)} g · ≈{Math.round(macros.servingGrams)} g
        </Body>
      </Screen>
    </>
  );
}
