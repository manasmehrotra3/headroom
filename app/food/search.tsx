import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { addFood, copyYesterday, favoriteFoods, getFood, logFood, recentFoods, searchFoods, type FoodRow } from '@/db/repos/nutritionRepo';
import type { LogSlot } from '@/domain/nutrition/types';
import { LOG_SLOT_LABELS } from '@/domain/nutrition/types';
import { todayKey } from '@/domain/dates';
import { PortionSheet } from '@/features/food/PortionSheet';
import { hasUsdaKey, searchUsda } from '@/services/foodLookup';
import { Body, Button, Chips, RowLink, Screen } from '@/ui/components';
import { colors, font, radius, space } from '@/ui/theme';

const TABS = [
  { id: 'search', label: 'Search' },
  { id: 'favorites', label: 'Favourites' },
  { id: 'recent', label: 'Recent' },
] as const;

/** Quick add: local Indian food DB first, USDA as a backup, favourites, recents, copy yesterday. */
export default function FoodSearch() {
  const params = useLocalSearchParams<{ slot?: LogSlot; date?: string }>();
  const slot: LogSlot = params.slot ?? 'lunch';
  const date = params.date ?? todayKey();
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('search');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<FoodRow | null>(null);
  const [online, setOnline] = useState(false);

  // Three different SQLite reads behind one variable. The USDA query below re-renders this screen
  // on every one of its own state changes, so without this they all run again each time.
  const local = useMemo(() => (tab === 'search' ? searchFoods(query) : tab === 'favorites' ? favoriteFoods() : recentFoods()), [tab, query, picked]);
  const usda = useQuery({ queryKey: ['usda', query], queryFn: () => searchUsda(query), enabled: online && query.trim().length >= 3 });

  const log = (input: { servingLabel: string; quantity: number; grams: number }) => {
    if (!picked) return;
    logFood({ date, slot, food: picked, ...input });
    setPicked(null);
    router.back();
  };

  const pickOnline = (result: NonNullable<typeof usda.data>[number]) => {
    addFood(result);
    setPicked(getFood(result.id) ?? null);
  };

  return (
    <>
      <Stack.Screen options={{ title: `Add to ${LOG_SLOT_LABELS[slot].toLowerCase()}` }} />
      <Screen edges={['bottom']}>
        <Chips options={TABS} selected={[tab]} onToggle={setTab} />
        <View style={{ height: space.md }} />
        {tab === 'search' ? (
          <TextInput
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              setOnline(false);
            }}
            placeholder="dal, roti, paneer, poha…"
            placeholderTextColor={colors.textDim}
            autoFocus
            style={{
              minHeight: 52,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              color: colors.text,
              paddingHorizontal: space.md,
              fontSize: font.body,
              marginBottom: space.sm,
            }}
          />
        ) : null}
        <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.md }}>
          <View style={{ flex: 1 }}>
            <Button variant="secondary" label="Scan barcode" onPress={() => router.push({ pathname: '/food/scan', params: { slot, date } })} />
          </View>
          <View style={{ flex: 1 }}>
            <Button variant="secondary" label="New recipe" onPress={() => router.push('/food/recipe')} />
          </View>
        </View>
        {tab === 'recent' ? (
          <Button
            variant="secondary"
            label={`Copy yesterday's ${LOG_SLOT_LABELS[slot].toLowerCase()}`}
            onPress={() => {
              copyYesterday(date, slot);
              router.back();
            }}
          />
        ) : null}

        {local.map((f) => (
          <RowLink key={f.id} label={f.name} value={`${Math.round(f.kcal100)} kcal · ${Math.round(f.protein100)} g P /100 g`} onPress={() => setPicked(f)} />
        ))}
        {local.length === 0 ? <Body dim>{tab === 'search' ? 'Nothing local matches.' : 'Nothing here yet.'}</Body> : null}

        {tab === 'search' && query.trim().length >= 3 ? (
          <View style={{ marginTop: space.lg }}>
            {!online ? (
              <Button
                variant="secondary"
                label={hasUsdaKey() ? 'Search USDA online' : 'USDA search (needs API key, see README)'}
                onPress={() => setOnline(true)}
                disabled={!hasUsdaKey()}
              />
            ) : usda.isLoading ? (
              <Body dim>Searching USDA…</Body>
            ) : usda.error ? (
              <Body dim>{(usda.error as Error).message}</Body>
            ) : (
              (usda.data ?? []).map((r) => (
                <RowLink key={r.id} label={r.name} value={`${Math.round(r.per100.kcal)} kcal · ${Math.round(r.per100.proteinG)} g P`} onPress={() => pickOnline(r)} />
              ))
            )}
          </View>
        ) : null}
        <Text style={{ color: colors.textDim, fontSize: font.small, marginTop: space.md }}>Dishes marked "estimate" are recipe-based; ingredient values follow IFCT 2017.</Text>
      </Screen>
      {picked ? <PortionSheet key={picked.id} food={picked} onLog={log} onClose={() => setPicked(null)} /> : null}
    </>
  );
}
