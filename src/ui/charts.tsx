/**
 * Material 3 Expressive charts drawn with react-native-svg + native fade entrance.
 * Uses Material You Ocean tonal containers (`surfaceContainer`, `primary`, `tertiary`).
 */
import { useId, useState } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { areaPath, labelIndexesByX, makeScale, smoothPath } from './chartGeometry';
import { colors, radius, space } from './theme';

const HEIGHT = 156;
const PAD = { top: 10, right: 8, bottom: 22, left: 40 };

function Measured({ children }: { children: (width: number) => React.ReactNode }) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  return (
    <Animated.View
      entering={FadeIn.duration(260)}
      onLayout={onLayout}
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: space.md,
        marginBottom: space.md,
        overflow: 'hidden',
      }}
    >
      {width > 0 ? children(width - space.md * 2) : null}
    </Animated.View>
  );
}

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const scaled = value / magnitude;
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return step * magnitude;
}

function Axes({ width, yMin, yMax, formatY }: { width: number; yMin: number; yMax: number; formatY: (v: number) => string }) {
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const ticks = [0, 0.5, 1].map((f) => yMin + (yMax - yMin) * f);
  return (
    <>
      {ticks.map((t, i) => {
        const y = PAD.top + plotH - ((t - yMin) / (yMax - yMin || 1)) * plotH;
        return (
          <G key={i}>
            <Line x1={PAD.left} x2={width - PAD.right} y1={y} y2={y} stroke={colors.outlineVariant} strokeWidth={1} opacity={0.55} />
            <SvgText x={PAD.left - 6} y={y + 4} fill={colors.onSurfaceVariant} fontSize={10} textAnchor="end">
              {formatY(t)}
            </SvgText>
          </G>
        );
      })}
    </>
  );
}

export function BarChartCard({ data, max, color = colors.primary }: { data: { value: number; label?: string }[]; max?: number; color?: string }) {
  const yMax = max ?? niceMax(Math.max(0, ...data.map((d) => d.value)));
  const labelEvery = Math.max(1, Math.ceil(data.length / 7));
  return (
    <Measured>
      {(width) => {
        const plotW = width - PAD.left - PAD.right;
        const plotH = HEIGHT - PAD.top - PAD.bottom;
        const slot = data.length > 0 ? plotW / data.length : plotW;
        const barW = Math.max(4, slot * 0.68);
        return (
          <Svg width={width} height={HEIGHT}>
            <Axes width={width} yMin={0} yMax={yMax} formatY={(v) => String(Math.round(v))} />
            {data.map((d, i) => {
              const h = (Math.min(d.value, yMax) / (yMax || 1)) * plotH;
              const x = PAD.left + i * slot + (slot - barW) / 2;
              return (
                <G key={i}>
                  <Rect x={x} y={PAD.top + plotH - h} width={barW} height={h} fill={color} rx={Math.min(6, barW / 2)} />
                  {d.label && i % labelEvery === 0 ? (
                    <SvgText x={x + barW / 2} y={HEIGHT - 6} fill={colors.onSurfaceVariant} fontSize={10} textAnchor="middle">
                      {d.label}
                    </SvgText>
                  ) : null}
                </G>
              );
            })}
          </Svg>
        );
      }}
    </Measured>
  );
}

function contiguousRuns(values: (number | null)[]): { index: number; value: number }[][] {
  const runs: { index: number; value: number }[][] = [];
  let current: { index: number; value: number }[] = [];
  values.forEach((value, index) => {
    if (value === null) {
      if (current.length) runs.push(current);
      current = [];
    } else {
      current.push({ index, value });
    }
  });
  if (current.length) runs.push(current);
  return runs;
}

export function LineChartCard({
  series,
  labels,
  color = colors.primary,
  secondary,
  secondaryColor = colors.tertiary,
  yMin,
  yMax,
  formatY = (v) => String(Math.round(v)),
}: {
  series: (number | null)[];
  labels: string[];
  color?: string;
  secondary?: (number | null)[];
  secondaryColor?: string;
  yMin?: number;
  yMax?: number;
  formatY?: (v: number) => string;
}) {
  const gradientId = `lineFill${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const all = [...series, ...(secondary ?? [])].filter((v): v is number => v !== null);
  if (all.length === 0) {
    return (
      <Measured>
        {() => <Text style={{ color: colors.onSurfaceVariant }}>No data yet.</Text>}
      </Measured>
    );
  }
  const lo = yMin ?? Math.min(...all);
  const hi = yMax ?? Math.max(...all);
  const range = hi - lo || 1;

  return (
    <Measured>
      {(width) => {
        const plotW = width - PAD.left - PAD.right;
        const plotH = HEIGHT - PAD.top - PAD.bottom;
        const top = PAD.top;
        const bottom = PAD.top + plotH;
        const x = (i: number) => PAD.left + (series.length > 1 ? (i / (series.length - 1)) * plotW : plotW / 2);
        const y = (v: number) => bottom - ((v - lo) / range) * plotH;
        const runs = contiguousRuns(series).map((run) => run.map((p) => ({ x: x(p.index), y: y(p.value) })));
        const labelled = labelIndexesByX(
          labels.map((_, i) => x(i)),
          6,
          44,
        );

        return (
          <Svg width={width} height={HEIGHT}>
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color} stopOpacity="0.30" />
                <Stop offset="1" stopColor={color} stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Axes width={width} yMin={lo} yMax={hi} formatY={formatY} />
            {secondary
              ? secondary.map((v, i) => (v === null ? null : <Circle key={`s${i}`} cx={x(i)} cy={y(v)} r={2.2} fill={secondaryColor} opacity={0.65} />))
              : null}
            {runs.map((run, r) =>
              run.length > 1 ? <Path key={`a${r}`} d={areaPath(run, top, bottom)} fill={`url(#${gradientId})`} /> : null,
            )}
            {runs.map((run, r) =>
              run.length > 1 ? (
                <Path key={`l${r}`} d={smoothPath(run, top, bottom)} stroke={color} strokeWidth={2.75} fill="none" strokeLinecap="round" />
              ) : (
                <Circle key={`l${r}`} cx={run[0].x} cy={run[0].y} r={4} fill={color} />
              ),
            )}
            {labelled.map((i) => (
              <SvgText key={i} x={x(i)} y={HEIGHT - 6} fill={colors.onSurfaceVariant} fontSize={10} textAnchor={i === labels.length - 1 ? 'end' : 'middle'}>
                {labels[i]}
              </SvgText>
            ))}
          </Svg>
        );
      }}
    </Measured>
  );
}

export interface TrendPoint {
  x: number;
  value: number;
  label: string;
}

export function AreaTrendChart({
  points,
  dots,
  goal,
  formatValue,
  height = 190,
  labelCount = 6,
}: {
  points: TrendPoint[];
  dots?: { x: number; value: number }[];
  goal?: { value: number; label: string };
  formatValue: (v: number) => string;
  height?: number;
  labelCount?: number;
}) {
  const [width, setWidth] = useState(0);
  const gradientId = `trendFill${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  if (points.length === 0) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.onSurfaceVariant }}>Nothing to show for this range yet.</Text>
      </View>
    );
  }

  const top = 30;
  const bottom = height - 26;
  const side = 22;

  const values = [...points.map((p) => p.value), ...(dots ?? []).map((d) => d.value), ...(goal ? [goal.value] : [])];
  const pad = (Math.max(...values) - Math.min(...values)) * 0.08;
  const y = makeScale(Math.min(...values) - pad, Math.max(...values) + pad, bottom, top);
  const xs = [...points.map((p) => p.x), ...(dots ?? []).map((d) => d.x)];
  const x = makeScale(Math.min(...xs), Math.max(...xs), side, Math.max(side + 1, width - side));

  const plotted = points.map((p) => ({ x: x(p.x), y: y(p.value) }));
  const labelled = labelIndexesByX(
    plotted.map((p) => p.x),
    labelCount,
    46,
  );

  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.primary} stopOpacity="0.32" />
              <Stop offset="1" stopColor={colors.primary} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {goal ? (
            <G>
              <Line x1={side} x2={width - side} y1={y(goal.value)} y2={y(goal.value)} stroke={colors.outline} strokeWidth={1} strokeDasharray="4 5" opacity={0.7} />
              <SvgText x={width - side} y={y(goal.value) - 6} fill={colors.onSurfaceVariant} fontSize={10} textAnchor="end">
                {goal.label}
              </SvgText>
            </G>
          ) : null}

          {(dots ?? []).map((d, i) => (
            <Circle key={`d${i}`} cx={x(d.x)} cy={y(d.value)} r={2.2} fill={colors.tertiary} opacity={0.55} />
          ))}

          {plotted.length > 1 ? <Path d={areaPath(plotted, top, bottom)} fill={`url(#${gradientId})`} /> : null}
          <Path d={smoothPath(plotted, top, bottom)} stroke={colors.primary} strokeWidth={2.75} fill="none" strokeLinecap="round" />

          {labelled.map((i) => {
            const p = plotted[i];
            const anchor = i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle';
            const nudge = anchor === 'start' ? -6 : anchor === 'end' ? 6 : 0;
            return (
              <G key={`l${i}`}>
                <Circle cx={p.x} cy={p.y} r={5} fill={colors.primary} stroke={colors.surface} strokeWidth={2.5} />
                <SvgText x={p.x + nudge} y={p.y - 11} fill={colors.onSurface} fontSize={11} fontWeight="700" textAnchor={anchor}>
                  {formatValue(points[i].value)}
                </SvgText>
                <SvgText x={p.x + nudge} y={height - 6} fill={colors.onSurfaceVariant} fontSize={11} textAnchor={anchor}>
                  {points[i].label}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}
