/**
 * The header at the top of each tab: either a greeting (avatar, "GOOD MORNING", your name) or a
 * plain title, with round calendar and settings buttons on the right.
 */
import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { db } from '@/db/client';
import { profile } from '@/db/schema';
import { greetingFor, initialOf } from '@/domain/greeting';
import { CalendarIcon, GearIcon, RestIcon, TodayIcon } from '@/ui/icons';
import { colors, font, radius, space } from '@/ui/theme';

const AVATAR = 52;

export function TabHeader({
  title,
  subtitle,
  greeting = false,
  showSettings = true,
}: {
  title?: string;
  subtitle?: string;
  greeting?: boolean;
  /** Off on the Settings screen itself, where the gear would lead nowhere. */
  showSettings?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>{greeting ? <GreetingBlock /> : <TitleBlock title={title ?? ''} subtitle={subtitle} />}</View>
      <View style={styles.actions}>
        <RoundButton label="This week's plan" onPress={() => router.navigate('/train')}>
          <CalendarIcon color={colors.text} size={22} />
        </RoundButton>
        {showSettings ? (
          <RoundButton label="Settings" onPress={() => router.navigate('/settings')}>
            <GearIcon color={colors.text} size={22} />
          </RoundButton>
        ) : null}
      </View>
    </View>
  );
}

function GreetingBlock() {
  const { data } = useLiveQuery(db.select({ name: profile.name }).from(profile).where(eq(profile.id, 1)));
  const name = data[0]?.name.trim() ?? '';
  const { text, icon } = greetingFor(new Date().getHours());

  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Edit your name" onPress={() => router.push('/edit/body')} style={styles.greeting}>
      <Avatar initial={initialOf(name)} />
      <View style={{ flexShrink: 1 }}>
        <View style={styles.greetingLine}>
          <Text style={styles.greetingText}>{text.toUpperCase()}</Text>
          {icon === 'sun' ? <TodayIcon color={colors.warning} size={15} /> : <RestIcon color={colors.textDim} size={14} />}
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {name || 'Welcome back'}
        </Text>
      </View>
    </Pressable>
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

/** A gradient disc with your initial, green into the backdrop's slate blue. */
function Avatar({ initial }: { initial: string | null }) {
  return (
    <View style={styles.avatar}>
      <Svg width={AVATAR} height={AVATAR} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="avatarFill" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.accent} />
            <Stop offset="1" stopColor="#3A6F8F" />
          </LinearGradient>
        </Defs>
        <Circle cx={AVATAR / 2} cy={AVATAR / 2} r={AVATAR / 2} fill="url(#avatarFill)" />
      </Svg>
      {initial ? <Text style={styles.initial}>{initial}</Text> : <TodayIcon color={colors.accentText} size={24} />}
    </View>
  );
}

function RoundButton({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.roundButton, pressed && { backgroundColor: colors.surfaceRaised }]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, marginBottom: space.lg, marginTop: space.xs },
  left: { flex: 1 },
  actions: { flexDirection: 'row', gap: space.sm },
  greeting: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  greetingLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  greetingText: { color: colors.textDim, fontSize: font.small, fontWeight: '600', letterSpacing: 1 },
  name: { color: colors.text, fontSize: font.title, fontWeight: '700', marginTop: 1 },
  title: { color: colors.text, fontSize: font.title + 4, fontWeight: '700' },
  subtitle: { color: colors.textDim, fontSize: font.small, marginTop: 2, lineHeight: 18 },
  avatar: { width: AVATAR, height: AVATAR, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initial: { color: colors.accentText, fontSize: font.title, fontWeight: '800' },
  roundButton: {
    width: 50,
    height: 50,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
