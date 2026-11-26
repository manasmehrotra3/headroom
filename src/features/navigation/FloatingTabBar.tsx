/**
 * Material 3 Expressive Floating Toolbar + Gliding Spring Pill + Morphing FAB Menu trigger.
 *
 * - Floating pill container (`colors.toolbar`) hovers above a smooth Ocean bottom fade.
 * - A single `primaryContainer` indicator pill glides smoothly between tabs on the native UI
 *   thread using `EXPRESSIVE_SPRING`.
 * - Trailing Expressive FAB (`colors.primary`) morphs from a 20dp squircle to a full circle
 *   and rotates 45deg into a close icon when opening the anchored FAB Menu.
 */
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useEffect, useState, type ComponentType } from 'react';
import { Text, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { FoodIcon, PlusIcon, ProgressIcon, TodayIcon, TrainIcon } from '@/ui/icons';
import { EXPRESSIVE_FAST_SPRING, EXPRESSIVE_SPRING, M3Pressable } from '@/ui/motion';
import { colors, elevation, radius, space, themedStyles } from '@/ui/theme';

import { QuickAddSheet } from './QuickAddSheet';

const VISIBLE_TABS = [
  { name: 'index', label: 'Today', Icon: TodayIcon },
  { name: 'train', label: 'Train', Icon: TrainIcon },
  { name: 'food', label: 'Food', Icon: FoodIcon },
  { name: 'progress', label: 'Progress', Icon: ProgressIcon },
] as const;

const TOOLBAR_PAD = 6;

export function FloatingTabBar({ state, navigation, insets }: BottomTabBarProps) {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [toolbarWidth, setToolbarWidth] = useState(0);
  const activeName = state.routes[state.index]?.name;
  const activeVisibleIndex = VISIBLE_TABS.findIndex((t) => t.name === activeName);
  const bottomOffset = Math.max(insets.bottom, space.md) + space.xs;

  const slotWidth = toolbarWidth > 0 ? (toolbarWidth - TOOLBAR_PAD * 2) / VISIBLE_TABS.length : 0;

  const pillX = useSharedValue(0);
  const pillOpacity = useSharedValue(activeVisibleIndex >= 0 ? 1 : 0);
  const fabOpenProgress = useSharedValue(0);

  useEffect(() => {
    if (activeVisibleIndex >= 0 && slotWidth > 0) {
      pillX.value = withSpring(activeVisibleIndex * slotWidth, EXPRESSIVE_SPRING);
      pillOpacity.value = withSpring(1, EXPRESSIVE_FAST_SPRING);
    } else if (activeVisibleIndex < 0) {
      pillOpacity.value = withSpring(0, EXPRESSIVE_FAST_SPRING);
    }
  }, [activeVisibleIndex, slotWidth, pillX, pillOpacity]);

  useEffect(() => {
    fabOpenProgress.value = withSpring(quickAddOpen ? 1 : 0, EXPRESSIVE_SPRING);
  }, [quickAddOpen, fabOpenProgress]);

  const glidingPillStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.value,
    transform: [{ translateX: pillX.value }],
  }));

  const fabContainerStyle = useAnimatedStyle(() => ({
    borderRadius: 20 + fabOpenProgress.value * 11,
    transform: [{ scale: 1 - fabOpenProgress.value * 0.04 }],
  }));

  const fabIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${fabOpenProgress.value * 45}deg` }],
  }));

  const onToolbarLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w !== toolbarWidth) {
      setToolbarWidth(w);
      if (activeVisibleIndex >= 0) {
        const nextSlot = (w - TOOLBAR_PAD * 2) / VISIBLE_TABS.length;
        pillX.value = activeVisibleIndex * nextSlot;
      }
    }
  };

  return (
    <>
      <BottomFade />
      <View pointerEvents="box-none" style={[styles.wrap, { bottom: bottomOffset }]}>
        <View style={styles.toolbar} onLayout={onToolbarLayout}>
          {slotWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.glidingPill,
                { width: slotWidth },
                glidingPillStyle,
              ]}
            />
          ) : null}

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
            return <ToolbarTab key={name} label={label} Icon={Icon} focused={focused} onPress={onPress} />;
          })}
        </View>

        <M3Pressable
          accessibilityRole="button"
          accessibilityLabel={quickAddOpen ? 'Close quick add menu' : 'Open quick add menu'}
          onPress={() => setQuickAddOpen((v) => !v)}
          haptic="medium"
          scaleTo={0.9}
        >
          <Animated.View style={[styles.fab, fabContainerStyle]}>
            <Animated.View style={fabIconStyle}>
              <PlusIcon color={colors.onPrimary} size={26} />
            </Animated.View>
          </Animated.View>
        </M3Pressable>

        <QuickAddSheet visible={quickAddOpen} bottomOffset={bottomOffset} onClose={() => setQuickAddOpen(false)} />
      </View>
    </>
  );
}

function ToolbarTab({
  label,
  Icon,
  focused,
  onPress,
}: {
  label: string;
  Icon: ComponentType<{ color: string; size?: number }>;
  focused: boolean;
  onPress: () => void;
}) {
  const iconColor = focused ? colors.onPrimaryContainer : colors.onSurfaceVariant;

  return (
    <M3Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPress={onPress}
      haptic="select"
      scaleTo={0.92}
      style={styles.tab}
    >
      <Icon color={iconColor} size={21} />
      <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>
        {label}
      </Text>
    </M3Pressable>
  );
}

const FADE_HEIGHT = 148;

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
          <LinearGradient id="oceanTabFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.background} stopOpacity="0" />
            <Stop offset="0.58" stopColor={colors.background} stopOpacity="0.88" />
            <Stop offset="1" stopColor={colors.background} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={FADE_HEIGHT} fill="url(#oceanTabFade)" />
      </Svg>
    </View>
  );
}

const styles = themedStyles(() => ({
  wrap: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 2,
  },
  toolbar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.toolbar,
    borderRadius: radius.pill,
    padding: TOOLBAR_PAD,
    shadowColor: '#000',
    shadowOpacity: elevation.shadowOpacity,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  glidingPill: {
    position: 'absolute',
    top: TOOLBAR_PAD,
    bottom: TOOLBAR_PAD,
    left: TOOLBAR_PAD,
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.pill,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: radius.pill,
    paddingHorizontal: 4,
    paddingVertical: 5,
  },
  label: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  labelActive: {
    color: colors.onPrimaryContainer,
    fontWeight: '700',
  },
  fab: {
    width: 62,
    height: 62,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: elevation.shadowOpacity,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
}));
