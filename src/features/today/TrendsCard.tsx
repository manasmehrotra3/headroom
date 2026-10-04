/**
 * The trends card: a range picker, and a chart you swipe between weight and steps.
 * Weight draws the 7-day average as the line with each weigh-in as a dot behind it.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { addDays, type DateKey } from '@/domain/dates';
import { dayIndex, inRange, RANGE_DAYS, stepsSeries, TREND_RANGES, type DatedValue, type TrendRange } from '@/domain/trends';
import { kgToLb } from '@/domain/units';
import { weightTrend } from '@/domain/weightTrend';
import { PagerDots, SegmentedControl } from '@/ui/cards';
import { AreaTrendChart } from '@/ui/charts';
import { formatCompact, formatMonth, formatMonthDay } from '@/ui/format';
import { colors, font, radius, space } from '@/ui/theme';

export function TrendsCard({
  today,
  weighIns,
  steps,
  stepGoal,
}: {
  today: DateKey;
  weighIns: { date: DateKey; weightKg: number }[];
  steps: DatedValue[];
  stepGoal: number;
}) {
  const [range, setRange] = useState<TrendRange>('1M');
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);

  const anchor = addDays(today, -RANGE_DAYS[range]);
  const label = (date: DateKey) => (range === '6M' ? formatMonth(date) : formatMonthDay(date));

  const trend = weightTrend(weighIns).filter((p) => p.date >= anchor && p.date <= today);
  const weightPoints = trend.map((p) => ({ x: dayIndex(anchor, p.date), value: Math.round(kgToLb(p.averageKg) * 10) / 10, label: label(p.date) }));
  const weightDots = trend.map((p) => ({ x: dayIndex(anchor, p.date), value: kgToLb(p.weightKg) }));

  const stepPoints = stepsSeries(steps, today, range).map((p) => ({ x: dayIndex(anchor, p.date), value: Math.round(p.value), label: label(p.date) }));
  const stepsAverage = inRange(steps, today, range);
  const averageSteps = stepsAverage.length ? stepsAverage.reduce((sum, v) => sum + v.value, 0) / stepsAverage.length : null;

  const pages = [
    {
      title: 'Weight',
      caption: weightPoints.length ? `7-day average, lb · ${weightPoints.at(-1)!.value.toFixed(1)} now` : '7-day average, lb',
      chart: <AreaTrendChart points={weightPoints} dots={weightDots} formatValue={(v) => v.toFixed(1)} />,
    },
    {
      title: 'Steps',
      caption: averageSteps === null ? `${range === '1M' ? 'Daily' : 'Weekly average'}` : `${range === '1M' ? 'Daily' : 'Weekly average'} · ${formatCompact(averageSteps)} a day`,
      chart: <AreaTrendChart points={stepPoints} goal={{ value: stepGoal, label: `goal ${formatCompact(stepGoal)}` }} formatValue={formatCompact} />,
    },
  ];

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width > 0) setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Trends</Text>
        <SegmentedControl options={TREND_RANGES} value={range} onChange={setRange} />
      </View>

      <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScrollEnd}>
            {pages.map((p) => (
              <View key={p.title} style={{ width }}>
                <Text style={styles.pageTitle}>
                  {p.title} <Text style={styles.pageCaption}>{p.caption}</Text>
                </Text>
                {p.chart}
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>

      <View style={styles.pager}>
        <PagerDots count={pages.length} index={page} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    marginBottom: space.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, marginBottom: space.md },
  title: { color: colors.text, fontSize: font.large, fontWeight: '700' },
  pageTitle: { color: colors.text, fontSize: font.body, fontWeight: '600', marginBottom: space.xs },
  pageCaption: { color: colors.textDim, fontSize: font.small, fontWeight: '400' },
  pager: { alignItems: 'center', marginTop: space.sm },
});
