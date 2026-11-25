import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { addFood, copyYesterday, favoriteFoods, getFood, logFood, recentFoods, searchFoods, type FoodRow } from '@/db/repos/nutritionRepo';
import type { LogSlot } from '@/domain/nutrition/types';
import { LOG_SLOT_LABELS } from '@/domain/nutrition/types';
import { todayKey } from '@/domain/dates';
import { PortionSheet } from '@/features/food/PortionSheet';
import { hasUsdaKey, searchOpenFoodFactsIndia, searchUsda, type LookupResult } from '@/services/foodLookup';
import { Body, Button, RowGroup, RowLink, Screen, SectionLabel } from '@/ui/components';
import { ConnectedButtonGroup } from '@/ui/expressive';
import { colors, font, radius, space } from '@/ui/theme';

const TABS = [
  { id: 'search', label: 'Search' },
  { id: 'favorites', label: 'Favourites' },
  { id: 'recent', label: 'Recent' },
] as const;

/** Quick add: local INDB/IFCT Indian DB first, Open Food Facts India (free) & USDA online as backup. */
export default function FoodSearch() {
  const params = useLocalSearchParams<{ slot?: LogSlot; date?: string }>();
  const slot: LogSlot = params.slot ?? 'lunch';
  const date = params.date ?? todayKey();
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('search');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<FoodRow | null>(null);
  const [onlineSource, setOnlineSource] = useState<'none' | 'off' | 'usda'>('none');

  const local = useMemo(() => (tab === 'search' ? searchFoods(query) : tab === 'favorites' ? favoriteFoods() : recentFoods()), [tab, query, picked]);
  const offIndia = useQuery({
    queryKey: ['off-india', query],
    queryFn: () => searchOpenFoodFactsIndia(query),
    enabled: onlineSource === 'off' && query.trim().length >= 3,
  });
  const usda = useQuery({
    queryKey: ['usda', query],
    queryFn: () => searchUsda(query),
    enabled: onlineSource === 'usda' && query.trim().length >= 3,
  });

  const log = (input: { servingLabel: string; quantity: number; grams: number }) => {
    if (!picked) return;
    logFood({ date, slot, food: picked, ...input });
    setPicked(null);
    router.back();
  };

  const pickOnline = (result: LookupResult) => {
    addFood(result);
    setPicked(getFood(result.id) ?? null);
  };

  const activeQuery = onlineSource === 'off' ? offIndia : usda;

  return (
    <>
      <Stack.Screen options={{ title: `Add to ${LOG_SLOT_LABELS[slot].toLowerCase()}` }} />
      <Screen edges={['bottom']}>
        <ConnectedButtonGroup options={TABS} value={tab} onChange={setTab} size="large" />
        <View style={{ height: space.md }} />
        {tab === 'search' ? (
          <TextInput
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              setOnlineSource('none');
            }}
            placeholder="pesarattu, handvo, lobia, paneer, tempeh…"
            placeholderTextColor={colors.outline}
            autoFocus
            style={{
              minHeight: 54,
              borderRadius: radius.md,
              borderWidth: 1.5,
              borderColor: colors.outlineVariant,
              backgroundColor: colors.surfaceLow,
              color: colors.onSurface,
              paddingHorizontal: space.lg,
              fontSize: font.body,
              fontWeight: '600',
              marginBottom: space.md,
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
          <View style={{ marginBottom: space.md }}>
            <Button
              variant="secondary"
              label={`Copy yesterday's ${LOG_SLOT_LABELS[slot].toLowerCase()}`}
              onPress={() => {
                copyYesterday(date, slot);
                router.back();
              }}
            />
          </View>
        ) : null}

        {local.length > 0 ? (
          <RowGroup>
            {local.map((f) => (
              <RowLink key={f.id} label={f.name} value={`${Math.round(f.kcal100)} kcal · ${Math.round(f.protein100)}g P`} onPress={() => setPicked(f)} />
            ))}
          </RowGroup>
        ) : (
          <Body dim>{tab === 'search' ? 'Nothing local matches.' : 'Nothing here yet.'}</Body>
        )}

        {tab === 'search' && query.trim().length >= 3 ? (
          <View style={{ marginTop: space.md, gap: space.sm }}>
            <SectionLabel>Online Indian & packaged lookup</SectionLabel>
            <Button variant="primary" label="Search Open Food Facts India (free)" onPress={() => setOnlineSource('off')} />
            {hasUsdaKey() ? (
              <Button variant="secondary" label="Search USDA FoodData Central" onPress={() => setOnlineSource('usda')} />
            ) : null}

            {onlineSource !== 'none' ? (
              activeQuery.isLoading ? (
                <Body dim>Searching {onlineSource === 'off' ? 'Open Food Facts India' : 'USDA'}…</Body>
              ) : activeQuery.error ? (
                <Body dim>{(activeQuery.error as Error).message}</Body>
              ) : (activeQuery.data ?? []).length === 0 ? (
                <Body dim>No online matches for "{query.trim()}".</Body>
              ) : (
                <RowGroup>
                  {(activeQuery.data ?? []).map((r) => (
                    <RowLink key={r.id} label={r.name} value={`${Math.round(r.per100.kcal)} kcal · ${Math.round(r.per100.proteinG)}g P`} onPress={() => pickOnline(r)} />
                  ))}
                </RowGroup>
              )
            ) : null}
          </View>
        ) : null}

        <Text style={{ color: colors.onSurfaceVariant, fontSize: font.small, marginTop: space.md }}>
          Local Indian dishes follow INDB / IFCT 2017 estimates. Online picks are saved locally for offline use.
        </Text>
      </Screen>
      {picked ? <PortionSheet key={picked.id} food={picked} onLog={log} onClose={() => setPicked(null)} /> : null}
    </>
  );
}
