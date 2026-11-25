/**
 * Material 3 Expressive (Compose M3 1.5.0) native components:
 * - ScallopBadge (`MaterialShapes` 10-lobed cookie polygon with spring mount)
 * - WavyLinearProgress (native UI-thread flowing sine wave + spring fill width)
 * - WavyCircularProgress (scalloped wavy circular gauge with animated sweep)
 * - ConnectedButtonGroup (native borderRadius shape-morphing on active selection)
 * - SplitButton (primary filled pill + attached trailing chevron menu trigger)
 * - SegmentedList / SegmentedListItem (M3 1.5.0 3dp-gapped rounded row stack)
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { EXPRESSIVE_FAST_SPRING, EXPRESSIVE_GENTLE_SPRING, EXPRESSIVE_SPRING, M3Pressable } from './motion';
import { colors, font, radius, space } from './theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Builds a smooth 10-lobed M3 Expressive cookie/scallop SVG path inside a 100×100 viewBox. */
function buildScallopPath(lobes = 10, rOuter = 47, rInner = 40.5): string {
  const cx = 50;
  const cy = 50;
  const steps = 120;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const r = (rOuter + rInner) / 2 + ((rOuter - rInner) / 2) * Math.cos(lobes * a);
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    d += i === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return `${d} Z`;
}

const SCALLOP_PATH = buildScallopPath();

/**
 * M3 Expressive polygon badge (Readiness score, avatar disc, PR highlight).
 * Springs into place on mount and gently rotates when `ambientSpin` is enabled.
 */
export function ScallopBadge({
  label,
  icon,
  size = 54,
  backgroundColor = colors.primaryContainer,
  textColor = colors.onPrimaryContainer,
  ambientSpin = false,
}: {
  label?: string;
  icon?: ReactNode;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
  ambientSpin?: boolean;
}) {
  const scale = useSharedValue(0.76);
  const rotation = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, EXPRESSIVE_SPRING);
    if (ambientSpin) {
      rotation.value = withRepeat(withTiming(360, { duration: 36000, easing: Easing.linear }), -1, false);
    }
  }, [ambientSpin, rotation, scale]);

  const shapeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[StyleSheet.absoluteFill, shapeStyle]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Path d={SCALLOP_PATH} fill={backgroundColor} />
        </Svg>
      </Animated.View>
      <Animated.View style={labelStyle}>
        {icon ?? (
          <Text
            style={{
              color: textColor,
              fontSize: Math.round(size * 0.35),
              fontWeight: '800',
              fontVariant: ['tabular-nums'],
            }}
            numberOfLines={1}
          >
            {label}
          </Text>
        )}
      </Animated.View>
    </View>
  );
}

const WAVE_PERIOD = 24;

function buildWavePath(totalWidth: number, height: number): string {
  const mid = height / 2;
  const amp = Math.max(2.5, height * 0.28);
  const half = WAVE_PERIOD / 2;
  let d = `M 0 ${mid}`;
  for (let x = 0; x <= totalWidth + WAVE_PERIOD * 2; x += half) {
    const peak = (x / half) % 2 === 0 ? mid - amp : mid + amp;
    d += ` Q ${x + half / 2} ${peak} ${x + half} ${mid}`;
  }
  return d;
}

/**
 * M3 Expressive Wavy Linear Progress Indicator.
 * Both the fill width (spring) and the continuous wave motion (linear loop) run natively on the UI thread.
 */
export function WavyLinearProgress({
  progress,
  color = colors.primary,
  trackColor = colors.surfaceHighest,
  height = 16,
  animateWave = true,
}: {
  /** 0 to 1 */
  progress: number;
  color?: string;
  trackColor?: string;
  height?: number;
  animateWave?: boolean;
}) {
  const [width, setWidth] = useState(0);
  const trackWidth = useSharedValue(0);
  const clamped = Math.max(0, Math.min(1, progress));
  const fillRatio = useSharedValue(clamped);
  const phase = useSharedValue(0);

  useEffect(() => {
    fillRatio.value = withSpring(clamped, EXPRESSIVE_GENTLE_SPRING);
  }, [clamped, fillRatio]);

  useEffect(() => {
    if (!animateWave) {
      phase.value = 0;
      return;
    }
    phase.value = withRepeat(withTiming(-WAVE_PERIOD, { duration: 1500, easing: Easing.linear }), -1, false);
  }, [animateWave, phase]);

  const wavePath = useMemo(() => (width > 0 ? buildWavePath(width, height) : ''), [width, height]);

  const clipStyle = useAnimatedStyle(() => ({
    width: Math.max(0, fillRatio.value * trackWidth.value),
  }));

  const waveShiftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: phase.value }],
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    trackWidth.value = w;
    if (w !== width) setWidth(w);
  };

  return (
    <View onLayout={onLayout} style={{ height, justifyContent: 'center', width: '100%' }}>
      {/* Remaining flat track */}
      <View
        style={{
          height: 4.5,
          borderRadius: 99,
          backgroundColor: trackColor,
          width: '100%',
        }}
      />
      {/* End stop indicator dot (M3 spec) */}
      <View
        style={{
          position: 'absolute',
          right: 1,
          width: 4.5,
          height: 4.5,
          borderRadius: 99,
          backgroundColor: color,
          opacity: 0.7,
        }}
      />
      {/* Clipped animated wavy active fill */}
      {width > 0 ? (
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              overflow: 'hidden',
            },
            clipStyle,
          ]}
        >
          <Animated.View style={waveShiftStyle}>
            <Svg width={width + WAVE_PERIOD * 2} height={height}>
              <Path d={wavePath} stroke={color} strokeWidth={3.5} strokeLinecap="round" fill="none" />
            </Svg>
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
}

/**
 * M3 Expressive Circular Wavy Progress Indicator.
 * Draws a gently scalloped circular progress path whose sweep springs natively into place.
 */
export function WavyCircularProgress({
  value,
  target,
  label,
  unit,
  size = 128,
  color = colors.primary,
  trackColor = colors.surfaceHighest,
  overColor = colors.warning,
}: {
  value: number;
  target: number;
  label: string;
  unit: string;
  size?: number;
  color?: string;
  trackColor?: string;
  overColor?: string;
}) {
  const stroke = 8;
  const r = (size - stroke - 8) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const ratio = target > 0 ? Math.min(1, value / target) : 0;
  const over = target > 0 && value > target * 1.05;
  const activeColor = over ? overColor : color;

  const { pathD, totalLen } = useMemo(() => {
    const steps = 120;
    const waves = 14;
    const amp = 1.8;
    let d = '';
    let len = 0;
    let prevX = 0;
    let prevY = 0;
    for (let i = 0; i <= steps; i++) {
      const a = -Math.PI / 2 + (i / steps) * Math.PI * 2;
      const rr = r + Math.sin(i * ((waves * Math.PI * 2) / steps)) * amp;
      const x = cx + rr * Math.cos(a);
      const y = cy + rr * Math.sin(a);
      if (i === 0) {
        d = `M ${x.toFixed(2)} ${y.toFixed(2)}`;
      } else {
        d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
        len += Math.hypot(x - prevX, y - prevY);
      }
      prevX = x;
      prevY = y;
    }
    return { pathD: d, totalLen: len };
  }, [cx, cy, r]);

  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withSpring(ratio, EXPRESSIVE_GENTLE_SPRING);
  }, [ratio, animatedProgress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: totalLen * (1 - animatedProgress.value),
  }));

  return (
    <View style={{ alignItems: 'center', width: size }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size}>
          <Circle cx={cx} cy={cy} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
          <AnimatedPath
            d={pathD}
            stroke={activeColor}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={[totalLen, totalLen]}
            animatedProps={animatedProps}
          />
        </Svg>
        <View style={styles.ringCenter}>
          <Text style={styles.ringValue}>{Math.round(value).toLocaleString()}</Text>
          <Text style={styles.ringSub}>
            / {Math.round(target).toLocaleString()} {unit}
          </Text>
        </View>
      </View>
      <Text style={styles.ringLabel}>{label}</Text>
    </View>
  );
}

/**
 * M3 Expressive Connected Button Group with native shape-morphing.
 * Unselected buttons keep tight 8px inner corners (pill outer caps); selecting an option
 * springs its corners into a full pill (`999`) with tactile bounce.
 */
export function ConnectedButtonGroup<T extends string>({
  options,
  value,
  onChange,
  size = 'compact',
  warnIds,
}: {
  options: readonly { id: T; label: string }[];
  value: T | null;
  onChange: (id: T) => void;
  size?: 'compact' | 'large';
  warnIds?: readonly T[];
}) {
  return (
    <View style={styles.connectedRow}>
      {options.map((opt, idx) => (
        <ConnectedSegment
          key={opt.id}
          label={opt.label}
          selected={opt.id === value}
          isFirst={idx === 0}
          isLast={idx === options.length - 1}
          size={size}
          warn={Boolean(warnIds?.includes(opt.id))}
          onPress={() => onChange(opt.id)}
        />
      ))}
    </View>
  );
}

function ConnectedSegment({
  label,
  selected,
  isFirst,
  isLast,
  size,
  warn,
  onPress,
}: {
  label: string;
  selected: boolean;
  isFirst: boolean;
  isLast: boolean;
  size: 'compact' | 'large';
  warn: boolean;
  onPress: () => void;
}) {
  const innerRadius = useSharedValue(selected ? 26 : 8);

  useEffect(() => {
    innerRadius.value = withSpring(selected ? 26 : 8, EXPRESSIVE_SPRING);
  }, [selected, innerRadius]);

  const morphStyle = useAnimatedStyle(() => ({
    borderTopLeftRadius: isFirst ? 999 : innerRadius.value,
    borderBottomLeftRadius: isFirst ? 999 : innerRadius.value,
    borderTopRightRadius: isLast ? 999 : innerRadius.value,
    borderBottomRightRadius: isLast ? 999 : innerRadius.value,
  }));

  const isLarge = size === 'large';

  return (
    <M3Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      haptic="select"
      scaleTo={0.94}
      style={[isLarge && { flex: 1 }]}
    >
      <Animated.View
        style={[
          styles.connectedSegment,
          isLarge ? styles.connectedLarge : styles.connectedCompact,
          selected ? styles.connectedSegmentOn : styles.connectedSegmentOff,
          warn && !selected && { borderWidth: 1, borderColor: colors.warning },
          morphStyle,
        ]}
      >
        <Text
          style={[
            isLarge ? styles.connectedTextLarge : styles.connectedTextCompact,
            selected ? { color: colors.onPrimary, fontWeight: '700' } : { color: colors.onSurfaceVariant },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Animated.View>
    </M3Pressable>
  );
}

/**
 * M3 Expressive Split Button:
 * Pairs a primary action pill with an attached trailing chevron trigger separated by a crisp 3px gap.
 */
export function SplitButton({
  label,
  onPrimary,
  onMenu,
  tone = 'primary',
  menuAccessibilityLabel = 'More options',
}: {
  label: string;
  onPrimary: () => void;
  onMenu?: () => void;
  tone?: 'primary' | 'tonal';
  menuAccessibilityLabel?: string;
}) {
  const bg = tone === 'primary' ? colors.primary : colors.secondaryContainer;
  const fg = tone === 'primary' ? colors.onPrimary : colors.onSecondaryContainer;

  if (!onMenu) {
    return (
      <M3Pressable
        accessibilityRole="button"
        onPress={onPrimary}
        haptic="medium"
        style={[styles.splitSingle, { backgroundColor: bg }]}
      >
        <Text style={[styles.splitLabel, { color: fg }]}>{label}</Text>
      </M3Pressable>
    );
  }

  return (
    <View style={styles.splitWrap}>
      <M3Pressable
        accessibilityRole="button"
        onPress={onPrimary}
        haptic="medium"
        style={[styles.splitLead, { backgroundColor: bg }]}
      >
        <Text style={[styles.splitLabel, { color: fg }]} numberOfLines={1}>
          {label}
        </Text>
      </M3Pressable>
      <M3Pressable
        accessibilityRole="button"
        accessibilityLabel={menuAccessibilityLabel}
        onPress={onMenu}
        haptic="tap"
        scaleTo={0.93}
        style={[styles.splitTrail, { backgroundColor: bg }]}
      >
        <Text style={[styles.splitChevron, { color: fg }]}>▾</Text>
      </M3Pressable>
    </View>
  );
}

/**
 * M3 Expressive Segmented List container: distinct tonal rows separated by 3px gaps.
 * First item gets 24px top corners, last item gets 24px bottom corners, inner corners stay 6px.
 */
export function SegmentedList({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.segList, style]}>{children}</View>;
}

export function segmentedCorners(isFirst: boolean, isLast: boolean): ViewStyle {
  return {
    borderTopLeftRadius: isFirst ? radius.lg : radius.xs,
    borderTopRightRadius: isFirst ? radius.lg : radius.xs,
    borderBottomLeftRadius: isLast ? radius.lg : radius.xs,
    borderBottomRightRadius: isLast ? radius.lg : radius.xs,
  };
}

/**
 * Animated linear progress bar (non-wavy) for compact breakdown rows & top session progress.
 */
export function AnimatedLinearBar({
  progress,
  color = colors.primary,
  trackColor = colors.surfaceHighest,
  height = 6,
}: {
  progress: number;
  color?: string;
  trackColor?: string;
  height?: number;
}) {
  const trackWidth = useSharedValue(0);
  const clamped = Math.max(0, Math.min(1, progress));
  const anim = useSharedValue(clamped);

  useEffect(() => {
    anim.value = withSpring(clamped, EXPRESSIVE_FAST_SPRING);
  }, [clamped, anim]);

  const fillStyle = useAnimatedStyle(() => ({
    width: trackWidth.value * anim.value,
  }));

  return (
    <View
      onLayout={(e) => {
        trackWidth.value = e.nativeEvent.layout.width;
      }}
      style={{ height, borderRadius: 99, backgroundColor: trackColor, overflow: 'hidden', width: '100%' }}
    >
      <Animated.View style={[{ height, borderRadius: 99, backgroundColor: color }, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    color: colors.onSurface,
    fontSize: font.large + 2,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  ringSub: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  ringLabel: {
    color: colors.onSurfaceVariant,
    fontSize: font.small,
    fontWeight: '600',
    marginTop: 6,
  },
  connectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  connectedSegment: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectedCompact: {
    paddingHorizontal: 13,
    minHeight: 36,
  },
  connectedLarge: {
    minHeight: 54,
    paddingHorizontal: 10,
  },
  connectedSegmentOn: {
    backgroundColor: colors.primary,
  },
  connectedSegmentOff: {
    backgroundColor: colors.surfaceHighest,
  },
  connectedTextCompact: {
    fontSize: font.small,
    fontWeight: '600',
  },
  connectedTextLarge: {
    fontSize: font.title - 2,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  splitWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    width: '100%',
  },
  splitSingle: {
    minHeight: 50,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    width: '100%',
  },
  splitLead: {
    flex: 1,
    minHeight: 50,
    borderTopLeftRadius: radius.pill,
    borderBottomLeftRadius: radius.pill,
    borderTopRightRadius: radius.xs + 2,
    borderBottomRightRadius: radius.xs + 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  splitTrail: {
    width: 52,
    minHeight: 50,
    borderTopLeftRadius: radius.xs + 2,
    borderBottomLeftRadius: radius.xs + 2,
    borderTopRightRadius: radius.pill,
    borderBottomRightRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitLabel: {
    fontSize: font.body + 1,
    fontWeight: '700',
  },
  splitChevron: {
    fontSize: 18,
    fontWeight: '700',
  },
  segList: {
    gap: 3,
    marginBottom: space.md,
  },
});
