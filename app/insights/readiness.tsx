import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getCheckin, getDailyMetrics } from '@/db/repos/recoveryRepo';
import { todayKey } from '@/domain/dates';
import { READINESS_LABELS, type Readiness } from '@/domain/readiness';
import { Chip } from '@/ui/cards';
import { Body, Button, Card, Screen, SectionLabel } from '@/ui/components';
import { AnimatedLinearBar, ScallopBadge, segmentedCorners } from '@/ui/expressive';
import { M3Enter } from '@/ui/motion';
import { colors, font, radius, space } from '@/ui/theme';

const LABELS = { sleep: 'Sleep', restingHr: 'Resting heart rate', hrv: 'HRV', checkin: 'Morning check-in' } as const;

export default function ReadinessInsight() {
  const today = todayKey();
  const [metrics] = useState(() => getDailyMetrics(today));
  const [checkin] = useState(() => getCheckin(today));
  const breakdown = metrics?.readinessBreakdown as unknown as Pick<Readiness, 'band' | 'components'> | null | undefined;

  const band = breakdown?.band ?? 'unknown';
  const badgeBg =
    band === 'good'
      ? colors.primaryContainer
      : band === 'moderate'
        ? colors.warningContainer
        : band === 'low'
          ? colors.errorContainer
          : colors.secondaryContainer;
  const badgeFg =
    band === 'good'
      ? colors.onPrimaryContainer
      : band === 'moderate'
        ? colors.onWarningContainer
        : band === 'low'
          ? colors.onErrorContainer
          : colors.onSecondaryContainer;
  const chipTone = band === 'good' ? 'accent' : band === 'moderate' ? 'warning' : band === 'low' ? 'danger' : 'neutral';

  const keys = Object.keys(LABELS) as (keyof typeof LABELS)[];

  return (
    <>
      <Stack.Screen options={{ title: 'Readiness' }} />
      <Screen edges={['bottom']}>
        <M3Enter index={0}>
          <View style={styles.heroCard}>
            <ScallopBadge
              label={metrics?.readiness !== null && metrics?.readiness !== undefined ? String(metrics.readiness) : '—'}
              size={84}
              backgroundColor={badgeBg}
              textColor={badgeFg}
              ambientSpin
            />
            <View style={{ flex: 1, gap: 6 }}>
              <Chip label={breakdown ? READINESS_LABELS[breakdown.band] : 'No data yet'} tone={chipTone} />
              <Text style={styles.heroSub}>
                {metrics?.readiness !== null && metrics?.readiness !== undefined
                  ? `${metrics.readiness} / 100 composite score from your watch & check-in.`
                  : 'Readiness appears after the first sync or check-in.'}
              </Text>
            </View>
          </View>
        </M3Enter>

        {breakdown ? (
          <M3Enter index={1}>
            <View style={styles.segStack}>
              {keys.map((key, idx) => {
                const c = breakdown.components[key];
                const ratio = c && c.weight > 0 ? Math.min(1, c.points / c.weight) : 0;
                return (
                  <View key={key} style={[styles.factorTile, segmentedCorners(idx === 0, idx === keys.length - 1)]}>
                    <View style={styles.factorTop}>
                      <Text style={styles.factorName}>{LABELS[key]}</Text>
                      <Text style={[styles.factorPts, { color: c ? colors.primary : colors.onSurfaceVariant }]}>
                        {c ? `${c.points} / ${c.weight}` : 'no data'}
                      </Text>
                    </View>
                    <AnimatedLinearBar progress={ratio} color={c ? colors.primary : colors.surfaceHighest} height={6} />
                    <Text style={styles.factorDetail}>
                      {c ? c.detail : key === 'checkin' ? 'Do the morning check-in to add this.' : 'Not available from the watch yet, or no baseline.'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </M3Enter>
        ) : null}

        <M3Enter index={2}>
          <SectionLabel>How it's used</SectionLabel>
          <Card tone="low">
            <Body dim>
              Good (75+): train as planned. Moderate (50–74): as planned, watch the RPE. Low (below 50): the day switches to an easier version of the same session, never a skip. Pain reported in the check-in removes exercises that load that area regardless of the score.
            </Body>
          </Card>
          <View style={{ height: space.sm }} />
          <Button variant="secondary" label={checkin ? "Edit today's check-in" : 'Do the morning check-in'} onPress={() => router.push('/log/checkin')} />
        </M3Enter>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: space.lg,
    marginBottom: space.md,
  },
  heroSub: { color: colors.onSurfaceVariant, fontSize: font.small, lineHeight: 19 },
  segStack: { gap: 3, marginBottom: space.md },
  factorTile: {
    backgroundColor: colors.surface,
    padding: space.lg,
    gap: space.sm,
  },
  factorTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  factorName: { color: colors.onSurface, fontSize: font.body, fontWeight: '700' },
  factorPts: { fontSize: font.small + 1, fontWeight: '800', fontVariant: ['tabular-nums'] },
  factorDetail: { color: colors.onSurfaceVariant, fontSize: font.small, lineHeight: 19 },
});
