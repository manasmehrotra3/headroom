import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, Vibration, View } from 'react-native';

import { useActiveWorkout } from '@/stores/activeWorkout';
import { cancelRestNotification } from '@/sync/notifications';
import { formatDuration } from '@/domain/units';
import { colors, font, radius, space, TAP_MIN } from '@/ui/theme';

/** Full-width countdown shown after a set is logged. Vibrates when it hits zero. */
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
  const progress = restTotalSec > 0 ? remaining / restTotalSec : 0;

  const skip = () => {
    void cancelRestNotification();
    stopRest();
  };

  return (
    <View style={styles.box}>
      <View style={[styles.bar, { width: `${Math.round(progress * 100)}%` }]} />
      <Text style={styles.label}>REST · next: {nextUp}</Text>
      <Text style={styles.time}>{formatDuration(remaining)}</Text>
      <View style={styles.row}>
        <Pressable onPress={() => extendRest(30)} style={styles.button}>
          <Text style={styles.buttonText}>+30 s</Text>
        </Pressable>
        <Pressable onPress={skip} style={[styles.button, styles.buttonPrimary]}>
          <Text style={[styles.buttonText, { color: colors.accentText }]}>Skip rest</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.info,
  },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#1E3A5F' },
  label: { color: colors.textDim, fontSize: font.small, letterSpacing: 0.8 },
  time: { color: colors.text, fontSize: 56, fontWeight: '700', textAlign: 'center', marginVertical: space.sm },
  row: { flexDirection: 'row', gap: space.sm },
  button: {
    flex: 1,
    minHeight: TAP_MIN,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonPrimary: { backgroundColor: colors.accent, borderColor: colors.accent },
  buttonText: { color: colors.text, fontSize: font.large, fontWeight: '600' },
});
