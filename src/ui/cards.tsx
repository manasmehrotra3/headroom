/**
 * Material 3 Expressive dashboard kit:
 * - Tonal StatCards (with optional ScallopBadge hero & animated micro-progress bars)
 * - Spring-animated PagerDots
 * - Shape-morphing SegmentedControl (via ConnectedButtonGroup)
 * - M3 1.5.0 Segmented ListGroup & ListRow with native layout transitions
 */
import { Children, cloneElement, isValidElement, useEffect, useState, type ReactElement, type ReactNode } from 'react';
import {
  ScrollView,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { AnimatedLinearBar, ConnectedButtonGroup, ScallopBadge, segmentedCorners } from './expressive';
import { InfoIcon } from './icons';
import { EXPRESSIVE_SPRING, M3_LAYOUT, M3Pressable } from './motion';
import { colors, font, radius, space, themedStyles } from './theme';

export type Tone = 'neutral' | 'accent' | 'tertiary' | 'warning' | 'danger';

/** Read per render (not once at import) so a theme switch repaints the tonal chips. */
function toneStyle(tone: Tone): { backgroundColor: string; color: string } {
  switch (tone) {
    case 'accent':
      return { backgroundColor: colors.primaryContainer, color: colors.onPrimaryContainer };
    case 'tertiary':
      return { backgroundColor: colors.tertiaryContainer, color: colors.onTertiaryContainer };
    case 'warning':
      return { backgroundColor: colors.warningContainer, color: colors.onWarningContainer };
    case 'danger':
      return { backgroundColor: colors.errorContainer, color: colors.onErrorContainer };
    default:
      return { backgroundColor: colors.secondaryContainer, color: colors.onSecondaryContainer };
  }
}

/** Small tonal M3 status pill, e.g. "Sweet spot" or "Good". */
export function Chip({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const { backgroundColor, color } = toneStyle(tone);
  return (
    <View style={[styles.chip, { backgroundColor }]}>
      <Text style={[styles.chipText, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function AnimatedDot({ active }: { active: boolean }) {
  const width = useSharedValue(active ? 20 : 6);

  useEffect(() => {
    width.value = withSpring(active ? 20 : 6, EXPRESSIVE_SPRING);
  }, [active, width]);

  const animStyle = useAnimatedStyle(() => ({
    width: width.value,
    backgroundColor: active ? colors.primary : colors.outlineVariant,
  }));

  return <Animated.View style={[styles.dotBase, animStyle]} />;
}

/** Spring-morphing pager dots: active dot stretches smoothly into a pill. */
export function PagerDots({ count, index }: { count: number; index: number }) {
  if (count <= 1) return null;
  return (
    <View style={styles.dots}>
      {Array.from({ length: count }, (_, i) => (
        <AnimatedDot key={i} active={i === index} />
      ))}
    </View>
  );
}

export interface StatCardProps {
  label: string;
  value: string;
  /** Small text after the value, e.g. "/ 2,250". */
  unit?: string;
  valueColor?: string;
  chip?: { label: string; tone?: Tone };
  /** Renders the metric inside an M3 Expressive scallop/cookie badge (e.g. Readiness). */
  scallop?: boolean;
  /** Optional 0–1 animated micro progress bar under the value (e.g. Calories / Protein). */
  progress?: number;
  progressColor?: string;
  onPress?: () => void;
}

/** Tonal M3 Expressive stat card with optional scallop badge or animated progress bar. */
export function StatCard({
  label,
  value,
  unit,
  valueColor,
  chip,
  scallop,
  progress,
  progressColor,
  onPress,
  pager,
}: StatCardProps & { pager?: { count: number; index: number } }) {
  const badgeTone = chip?.tone ?? 'accent';
  const badgeStyle = toneStyle(badgeTone);

  return (
    <M3Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}`}
      onPress={onPress}
      disabled={!onPress}
      haptic="tap"
      scaleTo={0.965}
      style={styles.statCard}
    >
      <View style={styles.statTop}>
        <Text style={styles.statLabel} numberOfLines={1}>
          {label}
        </Text>
        {onPress ? <InfoIcon color={colors.onSurfaceVariant} size={17} /> : null}
      </View>

      {scallop ? (
        <View style={{ marginVertical: 4 }}>
          <ScallopBadge
            label={value}
            size={56}
            backgroundColor={badgeStyle.backgroundColor}
            textColor={badgeStyle.color}
          />
        </View>
      ) : (
        <Text
          style={[styles.statValue, valueColor ? { color: valueColor } : null]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
          {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
        </Text>
      )}

      {progress !== undefined ? (
        <View style={{ marginBottom: 8 }}>
          <AnimatedLinearBar progress={progress} color={progressColor ?? colors.primary} height={6} />
        </View>
      ) : null}

      <View style={styles.statBottom}>
        {chip ? <Chip label={chip.label} tone={chip.tone} /> : <View />}
        {pager ? <PagerDots count={pager.count} index={pager.index} /> : null}
      </View>
    </M3Pressable>
  );
}

/** Stat cards two to a page, swiped sideways with spring-morphing page indicators. */
export function PagedStatCards({ pages }: { pages: [StatCardProps, StatCardProps][] }) {
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width > 0) setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <View onLayout={onLayout} style={{ marginBottom: space.md }}>
      {width > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          decelerationRate="fast"
        >
          {pages.map((pair, i) => (
            <View key={i} style={[styles.page, { width }]}>
              {pair.map((card) => (
                <StatCard key={card.label} {...card} pager={{ count: pages.length, index: page }} />
              ))}
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

/** Two stat cards side by side, no paging. */
export function StatPair({ left, right }: { left: StatCardProps; right: StatCardProps }) {
  return (
    <View style={[styles.page, { marginBottom: space.md }]}>
      <StatCard {...left} />
      <StatCard {...right} />
    </View>
  );
}

/** M3 Expressive Connected Button Group with shape-morphing corners on active selection. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return <ConnectedButtonGroup options={options} value={value} onChange={onChange} size="compact" />;
}

/** Section heading with an optional tonal pill action on the right. */
export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: { label: string; icon?: ReactNode; onPress: () => void };
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <M3Pressable
          accessibilityRole="button"
          onPress={action.onPress}
          haptic="tap"
          scaleTo={0.94}
          style={styles.sectionAction}
          hitSlop={8}
        >
          <Text style={styles.sectionActionText}>{action.label}</Text>
          {action.icon}
        </M3Pressable>
      ) : null}
    </View>
  );
}

/** M3 Expressive Segmented List row with tonal icon well and rounded outer/inner corners. */
export function ListRow({
  icon,
  tileColor,
  title,
  subtitle,
  value,
  caption,
  captionTone = 'neutral',
  highlight,
  onPress,
  first = false,
  last = false,
}: {
  icon: ReactNode;
  tileColor?: string;
  title: string;
  subtitle?: string;
  value?: string;
  caption?: string;
  captionTone?: Tone;
  highlight?: boolean;
  onPress?: () => void;
  first?: boolean;
  last?: boolean;
}) {
  const captionColor = highlight ? colors.onPrimaryContainer : toneStyle(captionTone).color;

  return (
    <Animated.View layout={M3_LAYOUT}>
      <M3Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        onPress={onPress}
        disabled={!onPress}
        haptic="tap"
        scaleTo={0.975}
        style={[
          styles.listRow,
          segmentedCorners(first, last),
          highlight && styles.listRowHighlight,
        ]}
      >
        <View
          style={[
            styles.tile,
            highlight ? { backgroundColor: colors.primary } : tileColor ? { backgroundColor: tileColor } : null,
          ]}
        >
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, highlight && { color: colors.onPrimaryContainer }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.rowSubtitle, highlight && { color: colors.onPrimaryContainer, opacity: 0.82 }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {value ? <Text style={[styles.rowValue, highlight && { color: colors.onPrimaryContainer }]}>{value}</Text> : null}
          {caption ? <Text style={[styles.rowCaption, { color: captionColor }]}>{caption}</Text> : null}
        </View>
      </M3Pressable>
    </Animated.View>
  );
}

/** M3 Expressive Segmented List container: automatically assigns 24px outer / 6px inner corners. */
export function ListGroup({ children }: { children: ReactNode }) {
  const valid = Children.toArray(children).filter((child): child is ReactElement<{ first?: boolean; last?: boolean }> => isValidElement(child));
  return (
    <Animated.View layout={M3_LAYOUT} style={styles.listGroup}>
      {valid.map((child, idx) =>
        cloneElement(child, {
          first: idx === 0,
          last: idx === valid.length - 1,
        }),
      )}
    </Animated.View>
  );
}

const styles = themedStyles(() => ({
  chip: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  chipText: { fontSize: font.small - 1, fontWeight: '700' },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dotBase: { height: 6, borderRadius: 99 },
  page: { flexDirection: 'row', gap: space.md },
  statCard: {
    flex: 1,
    minHeight: 152,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: space.lg,
    justifyContent: 'space-between',
  },
  statTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.xs },
  statLabel: { color: colors.onSurfaceVariant, fontSize: font.small + 1, fontWeight: '600', flexShrink: 1 },
  statValue: {
    color: colors.onSurface,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginVertical: space.xs,
    fontVariant: ['tabular-nums'],
  },
  statUnit: { color: colors.onSurfaceVariant, fontSize: font.small + 1, fontWeight: '500', letterSpacing: 0 },
  statBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.xs },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.xl,
    marginBottom: space.md,
  },
  sectionTitle: { color: colors.onSurface, fontSize: font.title - 2, fontWeight: '800', letterSpacing: -0.2 },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceHigh,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  sectionActionText: { color: colors.onSurfaceVariant, fontSize: font.small, fontWeight: '600' },
  listGroup: { gap: 3, marginBottom: space.md },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md + 2,
    minHeight: 74,
    backgroundColor: colors.surface,
  },
  listRowHighlight: { backgroundColor: colors.primaryContainer },
  tile: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { color: colors.onSurface, fontSize: font.body + 1, fontWeight: '700' },
  rowSubtitle: { color: colors.onSurfaceVariant, fontSize: font.small, marginTop: 2 },
  rowValue: { color: colors.onSurface, fontSize: font.body + 1, fontWeight: '800', fontVariant: ['tabular-nums'] },
  rowCaption: { fontSize: font.small - 1, fontWeight: '600', marginTop: 2 },
}));
