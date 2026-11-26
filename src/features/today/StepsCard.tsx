/**
 * Steps against the daily goal, always visible on Today.
 * Uses Material 3 Expressive's native animated WavyLinearProgress indicator.
 */
import { Text, View } from 'react-native';

import { Chip } from '@/ui/cards';
import { WavyLinearProgress } from '@/ui/expressive';
import { M3Pressable } from '@/ui/motion';
import { colors, font, radius, space, themedStyles } from '@/ui/theme';

export function StepsCard({
  steps,
  goal,
  activeKcal,
  onPress,
}: {
  steps: number | null;
  goal: number;
  activeKcal: number | null;
  onPress: () => void;
}) {
  const ratio = steps === null || goal <= 0 ? 0 : Math.min(1, steps / goal);
  const hit = steps !== null && steps >= goal;

  return (
    <M3Pressable
      accessibilityRole="button"
      accessibilityLabel={`Steps: ${steps === null ? 'none yet' : steps.toLocaleString()}`}
      onPress={onPress}
      haptic="tap"
      scaleTo={0.975}
      style={styles.card}
    >
      <View style={styles.row}>
        <Text style={styles.label}>STEPS</Text>
        <Text style={styles.goal}>
          Goal {goal.toLocaleString()}
          {activeKcal ? ` · ${Math.round(activeKcal).toLocaleString()} kcal active` : ''}
        </Text>
      </View>

      <View style={styles.valueRow}>
        <Text style={styles.value}>{steps === null ? '—' : steps.toLocaleString()}</Text>
        <Chip
          label={steps === null ? 'Sync watch' : hit ? 'Goal hit' : `${(goal - steps).toLocaleString()} to go`}
          tone={hit ? 'accent' : 'neutral'}
        />
      </View>

      <View style={styles.waveWrap}>
        <WavyLinearProgress
          progress={ratio}
          color={hit ? colors.success : colors.primary}
          trackColor={colors.surfaceHighest}
          height={18}
          animateWave={steps !== null && steps > 0}
        />
      </View>
    </M3Pressable>
  );
}

const styles = themedStyles(() => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: space.lg,
    marginBottom: space.md,
    gap: space.xs,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  valueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm, marginTop: 2 },
  label: { color: colors.onSurfaceVariant, fontSize: font.caption + 1, fontWeight: '700', letterSpacing: 0.9 },
  goal: { color: colors.onSurfaceVariant, fontSize: font.small - 1, fontVariant: ['tabular-nums'], flexShrink: 1, textAlign: 'right' },
  value: { color: colors.onSurface, fontSize: 34, fontWeight: '800', letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  waveWrap: { marginTop: space.xs },
}));
