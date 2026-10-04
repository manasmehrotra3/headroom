/**
 * The floating tab bar: a rounded pill hovering above the content with the active tab's icon in
 * a soft glowing circle, and a separate round + button beside it for quick logging.
 *
 * Settings is still a route in the tab group, so it keeps the tab bar when opened, but it is not
 * shown as a tab: it lives behind the gear on each screen's header instead.
 */
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { FoodIcon, PlusIcon, ProgressIcon, TodayIcon, TrainIcon } from '@/ui/icons';
import { colors, font, radius, space } from '@/ui/theme';

import { QuickAddSheet } from './QuickAddSheet';

/** Tabs shown in the pill, in order. Anything else in the tab group is reachable but hidden. */
const VISIBLE_TABS = [
  { name: 'index', label: 'Today', Icon: TodayIcon },
  { name: 'train', label: 'Train', Icon: TrainIcon },
  { name: 'food', label: 'Food', Icon: FoodIcon },
  { name: 'progress', label: 'Progress', Icon: ProgressIcon },
] as const;

export function FloatingTabBar({ state, navigation, insets }: BottomTabBarProps) {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const activeName = state.routes[state.index]?.name;

  return (
    <>
      <BottomFade />
      <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, space.md) + space.xs }]}>
        <View style={styles.pill}>
          {VISIBLE_TABS.map(({ name, label, Icon }) => {
            const route = state.routes.find((r) => r.name === name);
            if (!route) return null;
            const focused = activeName === name;
            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            };
            return (
              <Pressable key={name} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label} onPress={onPress} style={styles.tab}>
                <View style={[styles.iconWell, focused && styles.iconWellActive]}>
                  <Icon color={focused ? colors.accent : colors.textDim} size={22} />
                </View>
                <Text style={[styles.label, focused && { color: colors.accent }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="Quick add" onPress={() => setQuickAddOpen(true)} style={styles.plus}>
          <PlusIcon color={colors.text} size={26} />
        </Pressable>

        <QuickAddSheet visible={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
      </View>
    </>
  );
}

const FADE_HEIGHT = 150;

/**
 * Content scrolls underneath the floating bar, so it fades to the background just before the
 * bar instead of showing sharp text around its rounded ends.
 */
function BottomFade() {
  const { width } = useWindowDimensions();
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: FADE_HEIGHT,
      }}
    >
      <Svg width={width} height={FADE_HEIGHT}>
        <Defs>
          <LinearGradient id="tabBarFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.background} stopOpacity="0" />
            <Stop offset="0.55" stopColor={colors.background} stopOpacity="0.85" />
            <Stop offset="1" stopColor={colors.background} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={FADE_HEIGHT} fill="url(#tabBarFade)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.sheet,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: space.xs + 2,
    paddingHorizontal: space.xs,
    // A soft lift off the content underneath.
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    minHeight: 56,
  },
  iconWell: {
    width: 40,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWellActive: { backgroundColor: colors.accentSoft },
  label: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  plus: {
    width: 62,
    height: 62,
    borderRadius: radius.pill,
    backgroundColor: colors.sheet,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
});
