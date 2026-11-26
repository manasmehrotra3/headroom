/**
 * Material 3 Expressive Session Card with an attached SplitButton (`Start` | `▾`)
 * so starting a workout and moving/skipping it sit in one unified tactile control.
 */
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { TUNABLES } from '@/config/tunables';
import { todayKey, WEEKDAY_LABELS, weekdayOf } from '@/domain/dates';
import type { PlannedSession } from '@/domain/plan/types';
import { SESSION_TYPES } from '@/domain/schedule';
import { beginWorkout } from '@/features/workout/startWorkout';
import { Chip } from '@/ui/cards';
import { SplitButton } from '@/ui/expressive';
import { formatShortDate } from '@/ui/format';
import { M3_LAYOUT, M3Pressable } from '@/ui/motion';
import { colors, font, radius, space, themedStyles } from '@/ui/theme';

const STATUS_LABEL: Record<PlannedSession['status'], string> = {
  planned: '',
  done: 'Done',
  skipped: 'Skipped',
  sick: 'Sick day',
  travel: 'Travel',
  dropped: 'Dropped',
};

export function SessionCard({ session, isToday, onActions }: { session: PlannedSession; isToday: boolean; onActions: () => void }) {
  const type = SESSION_TYPES[session.sessionType];
  const missed = session.status === 'planned' && session.date < todayKey() && !isToday;
  const inactive = session.status !== 'planned' || missed;
  const title = session.detail.kind === 'run' || session.detail.kind === 'bike' || session.detail.kind === 'swim' ? session.detail.title : type.label;
  const variant = session.variant === 'easy' ? 'easy version' : session.variant === 'deload' ? 'deload' : null;

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
  const canManage = session.status === 'planned' && !missed;
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
              : 'Start workout';

  const statusText = missed ? 'Not done' : STATUS_LABEL[session.status];
  const cardBg = isToday && !inactive ? colors.surfaceHigh : colors.surface;

  return (
    <Animated.View layout={M3_LAYOUT} style={[styles.card, { backgroundColor: cardBg }, isToday && !inactive && styles.todayCard, inactive && styles.inactive]}>
      <M3Pressable
        onPress={openDetail}
        accessibilityRole="button"
        accessibilityLabel={`${title}: see the full plan`}
        haptic="tap"
        scaleTo={0.985}
        style={styles.body}
      >
        <View style={styles.row}>
          <Text style={[styles.day, isToday && { color: colors.primary }]}>
            {isToday ? 'TODAY · ' : `${WEEKDAY_LABELS[weekdayOf(session.date)].slice(0, 3).toUpperCase()} · `}
            {formatShortDate(session.date).replace(/^\w+, /, '').toUpperCase()}
          </Text>
          {statusText ? (
            <Chip
              label={statusText}
              tone={session.status === 'done' ? 'accent' : missed ? 'warning' : 'neutral'}
            />
          ) : session.sessionType !== 'rest' ? (
            <Chip label={`${session.targetMin} min`} tone={isToday ? 'accent' : 'neutral'} />
          ) : null}
        </View>

        <Text style={[styles.title, inactive && { textDecorationLine: 'line-through' }]}>{title}</Text>

        <Text style={styles.meta}>
          {session.sessionType === 'rest' ? 'Rest day' : `${session.targetMin} min`}
          {variant ? ` · ${variant}` : ''}
          {session.addOn ? ` · +${TUNABLES.plan.addOnMin} min core add-on` : ''}
          {session.movedFrom ? ` · moved from ${WEEKDAY_LABELS[weekdayOf(session.movedFrom)]}` : ''}
        </Text>

        {session.detail.kind === 'run' || session.detail.kind === 'bike' || session.detail.kind === 'swim' ? (
          <Text style={styles.meta}>{session.detail.summary}</Text>
        ) : null}

        {session.reason ? (
          <View style={styles.reasonPill}>
            <Text style={styles.reason}>✦ {session.reason}</Text>
          </View>
        ) : null}

        <Text style={styles.more}>Tap for full plan ›</Text>
      </M3Pressable>

      <View style={styles.actions}>
        {canStart ? (
          <SplitButton
            label={startLabel}
            onPrimary={primary}
            onMenu={canManage ? onActions : undefined}
            tone={isToday ? 'primary' : 'tonal'}
            menuAccessibilityLabel="Move or skip session"
          />
        ) : canManage ? (
          <M3Pressable onPress={onActions} haptic="tap" style={styles.tonalPill}>
            <Text style={styles.tonalPillText}>Move / skip…</Text>
          </M3Pressable>
        ) : null}

        {session.status === 'done' && (session.detail.kind === 'run' || session.detail.kind === 'bike') ? (
          <M3Pressable
            onPress={() => router.push(session.detail.kind === 'bike' ? `/ride/${session.id}` : `/run/${session.id}`)}
            haptic="tap"
            style={styles.tonalPill}
          >
            <Text style={styles.tonalPillText}>Planned vs actual</Text>
          </M3Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = themedStyles(() => ({
  card: {
    borderRadius: radius.xl,
    padding: space.lg,
    marginBottom: space.md,
    gap: space.xs,
  },
  todayCard: {
    borderWidth: 1.5,
    borderColor: colors.primaryContainer,
  },
  body: { gap: 5 },
  more: { color: colors.onSurfaceVariant, fontSize: font.caption + 1, fontWeight: '600', marginTop: 2 },
  inactive: { opacity: 0.68 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  day: { color: colors.onSurfaceVariant, fontSize: font.caption + 1, fontWeight: '700', letterSpacing: 0.8 },
  title: { color: colors.onSurface, fontSize: font.large + 2, fontWeight: '800', letterSpacing: -0.2 },
  meta: { color: colors.onSurfaceVariant, fontSize: font.small, lineHeight: 19 },
  reasonPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.tertiaryContainer,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 4,
  },
  reason: { color: colors.onTertiaryContainer, fontSize: font.small - 1, fontWeight: '600' },
  actions: { marginTop: space.sm, gap: space.sm },
  tonalPill: {
    minHeight: 46,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tonalPillText: { color: colors.onSecondaryContainer, fontSize: font.body, fontWeight: '700' },
}));
