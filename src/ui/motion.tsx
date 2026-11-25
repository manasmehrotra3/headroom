/**
 * Native UI-thread motion primitives modelled on Compose Material 3 Expressive's
 * `MotionScheme.expressive()` — spatial springs with subtle overshoot, fast tactile press
 * responses, staggered card entrances, smooth layout reflows, and subtle haptics.
 */
import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  FadeInDown,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type WithSpringConfig,
} from 'react-native-reanimated';

/** Expressive spatial spring — bouncy, organic settle for morphs, badges, and sheets. */
export const EXPRESSIVE_SPRING: WithSpringConfig = {
  damping: 16,
  stiffness: 260,
  mass: 0.85,
};

/** Fast effects spring — snappy tactile press & indicator shifts. */
export const EXPRESSIVE_FAST_SPRING: WithSpringConfig = {
  damping: 18,
  stiffness: 380,
  mass: 0.7,
};

/** Gentle spatial spring — larger containers, hero cards, and drawer/sheet lifts. */
export const EXPRESSIVE_GENTLE_SPRING: WithSpringConfig = {
  damping: 20,
  stiffness: 195,
  mass: 0.95,
};

/** Smooth native layout transition when lists expand, filter, or reorder. */
export const M3_LAYOUT = LinearTransition.springify().damping(18).stiffness(240).mass(0.85);

const supportsHaptics = Platform.OS === 'ios' || Platform.OS === 'android';

export function hapticTap() {
  if (!supportsHaptics) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function hapticSelect() {
  if (!supportsHaptics) return;
  void Haptics.selectionAsync().catch(() => {});
}

export function hapticSuccess() {
  if (!supportsHaptics) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function hapticMedium() {
  if (!supportsHaptics) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export type HapticKind = 'none' | 'tap' | 'select' | 'medium' | 'success';

function fireHaptic(kind: HapticKind) {
  if (kind === 'tap') hapticTap();
  else if (kind === 'select') hapticSelect();
  else if (kind === 'medium') hapticMedium();
  else if (kind === 'success') hapticSuccess();
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Tactile M3 Expressive pressable running entirely on the native UI thread.
 * Scales smoothly with spring bounce on press/release and optionally triggers haptics.
 */
export function M3Pressable({
  children,
  style,
  scaleTo = 0.965,
  haptic = 'tap',
  disabled,
  onPress,
  onPressIn,
  onPressOut,
  ...rest
}: Omit<PressableProps, 'style'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: HapticKind;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPress={(e) => {
        if (haptic !== 'none') fireHaptic(haptic);
        onPress?.(e);
      }}
      onPressIn={(e) => {
        if (!disabled) scale.value = withSpring(scaleTo, EXPRESSIVE_FAST_SPRING);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, EXPRESSIVE_SPRING);
        onPressOut?.(e);
      }}
      style={[animatedStyle, style, disabled && { opacity: 0.45 }]}
    >
      {children}
    </AnimatedPressable>
  );
}

/**
 * Staggered native UI-thread entrance for dashboard cards, list groups, and hero blocks.
 * Uses M3 Expressive spring physics with a subtle upward settle.
 */
export function M3Enter({
  children,
  index = 0,
  style,
  layout = false,
  disabled = false,
}: {
  children: ReactNode;
  index?: number;
  style?: StyleProp<ViewStyle>;
  layout?: boolean;
  disabled?: boolean;
}) {
  if (disabled) {
    return <Animated.View layout={layout ? M3_LAYOUT : undefined} style={style}>{children}</Animated.View>;
  }
  const delay = Math.min(index, 8) * 40;
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify().damping(18).stiffness(220).mass(0.85)}
      layout={layout ? M3_LAYOUT : undefined}
      style={style}
    >
      {children}
    </Animated.View>
  );
}
