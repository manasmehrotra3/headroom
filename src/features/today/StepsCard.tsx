/**
 * Steps against the daily goal, always visible on Today rather than tucked behind a swipe. It
 * shows the same numbers as the home screen widget.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/ui/cards';
import { colors, font, radius, space } from '@/ui/theme';

export function StepsCard({ steps, goal, activeKcal, onPress }: { steps: number | null; goal: number; activeKcal: number | null; onPress: () => void }) {
  const ratio = steps === null || goal <= 0 ? 0 : Math.min(1, steps / goal);
  const hit = steps !== null && steps >= goal;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Steps: ${steps === null ? 'none yet' : steps.toLocaleString()}`} onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>STEPS</Text>
        <Text style={styles.goal}>goal {goal.toLocaleString()}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.value}>{steps === null ? '—' : steps.toLocaleString()}</Text>
        {activeKcal ? <Text style={styles.goal}>{Math.round(activeKcal).toLocaleString()} kcal active</Text> : null}
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: hit ? colors.accent : colors.accentDim }]} />
      </View>
      <Chip
        label={steps === null ? 'Steps appear once your watch syncs' : hit ? 'Goal hit' : `${(goal - steps).toLocaleString()} to go`}
        tone={hit ? 'accent' : 'neutral'}
      />
    </Pressable>
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
    gap: space.xs,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  label: { color: colors.textDim, fontSize: font.small, fontWeight: '600', letterSpacing: 0.8 },
  goal: { color: colors.textDim, fontSize: font.small },
  value: { color: colors.text, fontSize: 34, fontWeight: '700', letterSpacing: -0.5 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceRaised, overflow: 'hidden', marginTop: space.xs, marginBottom: space.xs },
  fill: { height: 8, borderRadius: 4 },
});
