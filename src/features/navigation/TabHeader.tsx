/**
 * Material 3 Expressive Top App Bar:
 * Greeting uses a 10-lobed `ScallopBadge` avatar + bold display name, paired with
 * tonal circular action buttons (`surfaceContainerHigh`) with spring press feedback.
 */
import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { db } from '@/db/client';
import { profile } from '@/db/schema';
import { greetingFor, initialOf } from '@/domain/greeting';
import { ScallopBadge } from '@/ui/expressive';
import { CalendarIcon, GearIcon, RestIcon, TodayIcon } from '@/ui/icons';
import { M3Pressable } from '@/ui/motion';
import { colors, font, radius, space, themedStyles } from '@/ui/theme';

export function TabHeader({
  title,
  subtitle,
  greeting = false,
  showSettings = true,
}: {
  title?: string;
  subtitle?: string;
  greeting?: boolean;
  showSettings?: boolean;
}) {
  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.row}>
      <View style={styles.left}>{greeting ? <GreetingBlock /> : <TitleBlock title={title ?? ''} subtitle={subtitle} />}</View>
      <View style={styles.actions}>
        <RoundButton label="This week's plan" onPress={() => router.navigate('/train')}>
          <CalendarIcon color={colors.onSurface} size={21} />
        </RoundButton>
        {showSettings ? (
          <RoundButton label="Settings" onPress={() => router.navigate('/settings')}>
            <GearIcon color={colors.onSurface} size={21} />
          </RoundButton>
        ) : null}
      </View>
    </Animated.View>
  );
}

function GreetingBlock() {
  const { data } = useLiveQuery(db.select({ name: profile.name }).from(profile).where(eq(profile.id, 1)));
  const name = data[0]?.name.trim() ?? '';
  const { text, icon } = greetingFor(new Date().getHours());
  const initial = initialOf(name);

  return (
    <M3Pressable
      accessibilityRole="button"
      accessibilityLabel="Edit your name"
      onPress={() => router.push('/edit/body')}
      haptic="tap"
      scaleTo={0.97}
      style={styles.greeting}
    >
      <ScallopBadge
        label={initial ?? undefined}
        icon={initial ? undefined : <TodayIcon color={colors.onPrimaryContainer} size={22} />}
        size={50}
        backgroundColor={colors.primaryContainer}
        textColor={colors.onPrimaryContainer}
      />
      <View style={{ flexShrink: 1 }}>
        <View style={styles.greetingLine}>
          <Text style={styles.greetingText}>{text.toUpperCase()}</Text>
          {icon === 'sun' ? <TodayIcon color={colors.warning} size={14} /> : <RestIcon color={colors.tertiary} size={13} />}
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {name || 'Welcome back'}
        </Text>
      </View>
    </M3Pressable>
  );
}

function TitleBlock({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ flexShrink: 1 }}>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

function RoundButton({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return (
    <M3Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      haptic="tap"
      scaleTo={0.9}
      style={styles.roundButton}
    >
      {children}
    </M3Pressable>
  );
}

const styles = themedStyles(() => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    marginBottom: space.lg,
    marginTop: space.xs,
  },
  left: { flex: 1 },
  actions: { flexDirection: 'row', gap: space.sm },
  greeting: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  greetingLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  greetingText: { color: colors.onSurfaceVariant, fontSize: font.caption + 1, fontWeight: '700', letterSpacing: 1 },
  name: { color: colors.onSurface, fontSize: font.title, fontWeight: '800', letterSpacing: -0.3, marginTop: 1 },
  title: { color: colors.onSurface, fontSize: font.title + 4, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { color: colors.onSurfaceVariant, fontSize: font.small, marginTop: 2, lineHeight: 18 },
  roundButton: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
