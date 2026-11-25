import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TUNABLES } from '@/config/tunables';
import { todayKey, WEEKDAY_LABELS, weekdayOf } from '@/domain/dates';
import type { PlannedSession } from '@/domain/plan/types';
import { SESSION_TYPES } from '@/domain/schedule';
import { beginWorkout } from '@/features/workout/startWorkout';
import { formatShortDate } from '@/ui/format';
import { colors, font, radius, space, TAP_MIN } from '@/ui/theme';

const STATUS_LABEL: Record<PlannedSession['status'], string> = { planned: '', done: 'Done', skipped: 'Skipped', sick: 'Sick day', travel: 'Travel', dropped: 'Dropped' };

/** One day of the plan on the Train tab, with the right primary action for its type. */
export function SessionCard({ session, isToday, onActions }: { session: PlannedSession; isToday: boolean; onActions: () => void }) {
  const type = SESSION_TYPES[session.sessionType];
  const missed = session.status === 'planned' && session.date < todayKey() && !isToday;
  const inactive = session.status !== 'planned' || missed;
  const title = session.detail.kind === 'run' || session.detail.kind === 'bike' || session.detail.kind === 'swim' ? session.detail.title : type.label;
  const variant = session.variant === 'easy' ? 'easy version' : session.variant === 'deload' ? 'deload' : null;

  /** Tapping the card opens the whole plan for that day: runs and rides already have their own screens. */
  const openDetail = () => {
    if (session.detail.kind === 'run') router.push(`/run/${session.id}`);
    else if (session.detail.kind === 'bike') router.push(`/ride/${session.id}`);
    else router.push(`/plan/${session.id}`);
  };

  const primary = () => {
    if (session.detail.kind === 'run') {
      router.push(`/run/${session.id}`);
    } else if (session.detail.kind === 'bike') {
      router.push(`/ride/${session.id}`);
    } else if (session.detail.kind === 'strength' || session.detail.kind === 'mobility') {
      const { workoutId } = beginWorkout(session.sessionType, session.variant, session.id);
      router.push(`/workout/${workoutId}`);
    } else if (session.detail.kind === 'swim') {
      router.push(`/plan/${session.id}`);
    } else if (session.detail.kind === 'tennis') {
      router.push('/log/activity');
    }
  };

  const canStart = !inactive && session.sessionType !== 'rest';
  const startLabel =
    session.detail.kind === 'run'
      ? 'View run'
      : session.detail.kind === 'bike'
        ? 'View ride'
        : session.detail.kind === 'swim'
          ? 'View swim'
          : session.detail.kind === 'tennis'
          ? 'Log tennis'
          : session.detail.kind === 'rest'
            ? ''
            : 'Start';

  return (
    <View style={[styles.card, isToday && styles.today, inactive && styles.inactive]}>
      <Pressable onPress={openDetail} accessibilityRole="button" accessibilityLabel={`${title}: see the full plan`} style={styles.body}>
        <View style={styles.row}>
          <Text style={[styles.day, isToday && { color: colors.accent }]}>
            {isToday ? 'TODAY · ' : `${WEEKDAY_LABELS[weekdayOf(session.date)].slice(0, 3).toUpperCase()} · `}
            {formatShortDate(session.date).replace(/^\w+, /, '')}
          </Text>
          <Text style={styles.status}>{missed ? 'Not done' : STATUS_LABEL[session.status]}</Text>
        </View>
        <Text style={[styles.title, inactive && { textDecorationLine: 'line-through' }]}>{title}</Text>
        <Text style={styles.meta}>
          {session.sessionType === 'rest' ? 'Rest' : `${session.targetMin} min`}
          {variant ? ` · ${variant}` : ''}
          {session.addOn ? ` · +${TUNABLES.plan.addOnMin} min core add-on` : ''}
          {session.movedFrom ? ` · moved from ${WEEKDAY_LABELS[weekdayOf(session.movedFrom)]}` : ''}
        </Text>
        {session.detail.kind === 'run' || session.detail.kind === 'bike' || session.detail.kind === 'swim' ? <Text style={styles.meta}>{session.detail.summary}</Text> : null}
        {session.reason ? <Text style={styles.reason}>{session.reason}</Text> : null}
        <Text style={styles.more}>Tap for the full plan ›</Text>
      </Pressable>
      <View style={styles.actions}>
        {canStart ? (
          <Pressable onPress={primary} style={[styles.button, styles.buttonPrimary]}>
            <Text style={[styles.buttonText, { color: colors.accentText }]}>{startLabel}</Text>
          </Pressable>
        ) : null}
        {session.status === 'done' && (session.detail.kind === 'run' || session.detail.kind === 'bike') ? (
          <Pressable onPress={() => router.push(session.detail.kind === 'bike' ? `/ride/${session.id}` : `/run/${session.id}`)} style={styles.button}>
            <Text style={styles.buttonText}>Planned vs actual</Text>
          </Pressable>
        ) : null}
        {session.status === 'planned' && !missed ? (
          <Pressable onPress={onActions} style={styles.button}>
            <Text style={styles.buttonText}>Move / skip…</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.lg, marginBottom: space.md, gap: space.xs },
  today: { borderColor: colors.accentDim },
  body: { gap: space.xs },
  more: { color: colors.textDim, fontSize: font.small, marginTop: space.xs },
  inactive: { opacity: 0.7 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { color: colors.textDim, fontSize: font.small, fontWeight: '600', letterSpacing: 0.6 },
  status: { color: colors.warning, fontSize: font.small, fontWeight: '600' },
  title: { color: colors.text, fontSize: font.large, fontWeight: '600' },
  meta: { color: colors.textDim, fontSize: font.small },
  reason: { color: colors.info, fontSize: font.small, marginTop: space.xs },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm, flexWrap: 'wrap' },
  button: { minHeight: 44, paddingHorizontal: space.lg, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  buttonPrimary: { backgroundColor: colors.accent, borderColor: colors.accent, minHeight: TAP_MIN - 8 },
  buttonText: { color: colors.text, fontSize: font.body, fontWeight: '600' },
});
