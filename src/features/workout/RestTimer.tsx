import { useEffect, useState } from 'react';
import { StyleSheet, Text, Vibration, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { formatDuration } from '@/domain/units';
import { useActiveWorkout } from '@/stores/activeWorkout';
import { cancelRestNotification } from '@/sync/notifications';
import { WavyLinearProgress } from '@/ui/expressive';
import { M3Pressable } from '@/ui/motion';
import { colors, font, radius, space, TAP_MIN } from '@/ui/theme';

/**
 * Full-width M3 Expressive countdown shown after a set is logged.
 * Features a `tertiaryContainer` card, giant tabular numerals, and a live animated wavy countdown track.
 */
export function RestTimer() {
  const restEndsAt = useActiveWorkout((s) => s.restEndsAt);
  const nextUp = useActiveWorkout((s) => s.restNextUp);
  const restTotalSec = useActiveWorkout((s) => s.restTotalSec);
  const extendRest = useActiveWorkout((s) => s.extendRest);
  const stopRest = useActiveWorkout((s) => s.stopRest);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (restEndsAt === null) return;
    const tick = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(tick);
  }, [restEndsAt]);

  useEffect(() => {
    if (restEndsAt === null || now < restEndsAt) return;
    Vibration.vibrate([0, 400, 200, 400]);
    stopRest();
  }, [now, restEndsAt, stopRest]);

  if (restEndsAt === null) return null;

  const remaining = Math.max(0, Math.ceil((restEndsAt - now) / 1000));
  const progress = restTotalSec > 0 ? Math.min(1, remaining / restTotalSec) : 0;

  const skip = () => {
    void cancelRestNotification();
    stopRest();
  };

  return (
    <Animated.View entering={FadeInDown.springify().damping(17).stiffness(240)} style={styles.box}>
      <View style={styles.headerRow}>
        <Text style={styles.label} numberOfLines={1}>
          REST · NEXT: {nextUp.toUpperCase()}
        </Text>
        <Text style={styles.total}>{formatDuration(restTotalSec)}</Text>
      </View>

      <Text style={styles.time}>{formatDuration(remaining)}</Text>

      <View style={styles.waveWrap}>
        <WavyLinearProgress
          progress={progress}
          color={colors.tertiary}
          trackColor="rgba(255, 255, 255, 0.16)"
          height={18}
          animateWave
        />
      </View>

      <View style={styles.row}>
        <M3Pressable onPress={() => extendRest(30)} haptic="tap" style={styles.tonalButton}>
          <Text style={styles.tonalButtonText}>+30 s</Text>
        </M3Pressable>
        <M3Pressable onPress={skip} haptic="medium" style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Skip rest</Text>
        </M3Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.tertiaryContainer,
    borderRadius: radius.xl,
    padding: space.lg,
    marginBottom: space.md,
    gap: space.xs,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  label: { color: colors.onTertiaryContainer, opacity: 0.85, fontSize: font.caption + 1, fontWeight: '700', letterSpacing: 0.8, flex: 1 },
  total: { color: colors.onTertiaryContainer, opacity: 0.72, fontSize: font.caption + 1, fontWeight: '600', fontVariant: ['tabular-nums'] },
  time: {
    color: colors.onTertiaryContainer,
    fontSize: 54,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    marginVertical: space.xs,
  },
  waveWrap: { marginBottom: space.sm },
  row: { flexDirection: 'row', gap: space.sm },
  tonalButton: {
    flex: 1,
    minHeight: TAP_MIN - 4,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.24)',
  },
  tonalButtonText: { color: colors.onTertiaryContainer, fontSize: font.body + 1, fontWeight: '700' },
  primaryButton: {
    flex: 1,
    minHeight: TAP_MIN - 4,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  primaryButtonText: { color: colors.onPrimary, fontSize: font.body + 1, fontWeight: '800' },
});
