/**
 * The card kit for dashboard-style screens: stat cards that page sideways in pairs, small status
 * chips, a segmented range control, section headers with a control on the right, and list rows
 * with an icon tile.
 */
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { CheckIcon, InfoIcon } from './icons';
import { colors, font, radius, space } from './theme';

export type Tone = 'neutral' | 'accent' | 'warning' | 'danger';

const TONE_STYLES: Record<Tone, { backgroundColor: string; color: string }> = {
  neutral: { backgroundColor: colors.surfaceRaised, color: colors.textDim },
  accent: { backgroundColor: colors.accentSoft, color: colors.accent },
  warning: { backgroundColor: colors.warningSoft, color: colors.warning },
  danger: { backgroundColor: colors.dangerSoft, color: colors.danger },
};

/** A small status label, e.g. "Sweet spot" or "5 upcoming". Not tappable. */
export function Chip({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const { backgroundColor, color } = TONE_STYLES[tone];
  return (
    <View style={[styles.chip, { backgroundColor }]}>
      <Text style={[styles.chipText, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Which page you are on: a dash for the current one, dots for the rest. */
export function PagerDots({ count, index }: { count: number; index: number }) {
  if (count <= 1) return null;
  return (
    <View style={styles.dots}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={i === index ? styles.dash : styles.dot} />
      ))}
    </View>
  );
}

export interface StatCardProps {
  label: string;
  value: string;
  /** Small text after the value, e.g. "lb". */
  unit?: string;
  valueColor?: string;
  chip?: { label: string; tone?: Tone };
  onPress?: () => void;
}

/** Label with an info icon, a big number, and a chip underneath. */
export function StatCard({ label, value, unit, valueColor, chip, onPress, pager }: StatCardProps & { pager?: { count: number; index: number } }) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}`}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.statCard, pressed && { backgroundColor: colors.surfaceRaised }]}
    >
      <View style={styles.statTop}>
        <Text style={styles.statLabel} numberOfLines={1}>
          {label}
        </Text>
        {onPress ? <InfoIcon color={colors.textDim} size={19} /> : null}
      </View>
      <Text style={[styles.statValue, valueColor ? { color: valueColor } : null]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
        {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
      </Text>
      <View style={styles.statBottom}>
        {chip ? <Chip label={chip.label} tone={chip.tone} /> : <View />}
        {pager ? <PagerDots count={pager.count} index={pager.index} /> : null}
      </View>
    </Pressable>
  );
}

/**
 * Stat cards two to a page, swiped sideways. Every card shows the same page indicator so it is
 * obvious there is more to the right.
 */
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
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScrollEnd} decelerationRate="fast">
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

/** An outlined pill of options; the chosen one is filled and ticked. */
export function SegmentedControl<T extends string>({ options, value, onChange }: { options: readonly { id: T; label: string }[]; value: T; onChange: (id: T) => void }) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const on = option.id === value;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(option.id)}
            style={[styles.segment, on && styles.segmentOn]}
          >
            {on ? <CheckIcon color="#FFFFFF" size={14} /> : null}
            <Text style={[styles.segmentText, on && { color: '#FFFFFF' }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A big section title with an optional control on the right, like "Upcoming ↓". */
export function SectionHeader({ title, action }: { title: string; action?: { label: string; icon?: ReactNode; onPress: () => void } }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable accessibilityRole="button" onPress={action.onPress} style={styles.sectionAction} hitSlop={12}>
          <Text style={styles.sectionActionText}>{action.label}</Text>
          {action.icon}
        </Pressable>
      ) : null}
    </View>
  );
}

/** A list row: icon tile, title and subtitle, and a value with a caption on the right. */
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
  last,
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
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.listRow, !last && styles.listRowDivider, highlight && styles.listRowHighlight, pressed && { backgroundColor: colors.surfaceRaised }]}
    >
      <View style={[styles.tile, tileColor ? { backgroundColor: tileColor } : null]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {caption ? <Text style={[styles.rowCaption, { color: TONE_STYLES[captionTone].color }]}>{caption}</Text> : null}
      </View>
    </Pressable>
  );
}

/** The rounded container a group of list rows sits in. */
export function ListGroup({ children }: { children: ReactNode }) {
  return <View style={styles.listGroup}>{children}</View>;
}

const styles = StyleSheet.create({
  chip: { alignSelf: 'flex-start', borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 5, maxWidth: '100%' },
  chipText: { fontSize: font.small, fontWeight: '600' },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dash: { width: 16, height: 5, borderRadius: 3, backgroundColor: colors.accentDim },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.border },
  page: { flexDirection: 'row', gap: space.md },
  statCard: {
    flex: 1,
    minHeight: 148,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    justifyContent: 'space-between',
  },
  statTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.xs },
  statLabel: { color: colors.textDim, fontSize: font.body, fontWeight: '500', flexShrink: 1 },
  statValue: { color: colors.text, fontSize: 34, fontWeight: '700', letterSpacing: -0.5, marginVertical: space.sm },
  statUnit: { color: colors.textDim, fontSize: font.body, fontWeight: '500', letterSpacing: 0 },
  statBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.xs },
  segmented: { flexDirection: 'row', borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  segment: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 14, minHeight: 38 },
  segmentOn: { backgroundColor: colors.accentDim },
  segmentText: { color: colors.textDim, fontSize: font.small, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xl, marginBottom: space.md },
  sectionTitle: { color: colors.text, fontSize: font.title, fontWeight: '700' },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionActionText: { color: colors.textDim, fontSize: font.body },
  listGroup: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: space.md },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: 72 },
  listRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  listRowHighlight: { backgroundColor: colors.accentSoft },
  tile: { width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { color: colors.text, fontSize: font.large, fontWeight: '600' },
  rowSubtitle: { color: colors.textDim, fontSize: font.small, marginTop: 2 },
  rowValue: { color: colors.text, fontSize: font.large, fontWeight: '700' },
  rowCaption: { fontSize: font.small, marginTop: 2 },
});
