/** The + button's menu: the four things worth logging in a couple of taps from anywhere. */
import { router, type Href } from 'expo-router';
import type { ComponentType } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { FoodIcon, HeartIcon, RunIcon, ScaleIcon } from '@/ui/icons';
import { colors, font, radius, space, TAP_MIN } from '@/ui/theme';

const ACTIONS: { label: string; hint: string; href: Href; Icon: ComponentType<{ color: string; size?: number }> }[] = [
  { label: 'Morning check-in', hint: 'Energy, soreness, any pain', href: '/log/checkin', Icon: HeartIcon },
  { label: 'Log food', hint: 'Search, favourites, recents', href: '/food/search', Icon: FoodIcon },
  { label: 'Log weight', hint: 'Weigh-in and waist', href: '/progress', Icon: ScaleIcon },
  { label: 'Log an activity', hint: 'Tennis or anything the watch missed', href: '/log/activity', Icon: RunIcon },
];

export function QuickAddSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Quick add</Text>
        {ACTIONS.map(({ label, hint, href, Icon }) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            onPress={() => {
              onClose();
              router.push(href);
            }}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceRaised }]}
          >
            <View style={styles.tile}>
              <Icon color={colors.accent} size={22} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.hint}>{hint}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: colors.sheet,
    padding: space.lg,
    paddingBottom: space.xxl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    gap: space.sm,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: space.sm },
  title: { color: colors.text, fontSize: font.large, fontWeight: '700', marginBottom: space.xs },
  row: { minHeight: TAP_MIN + 8, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.sm, borderRadius: radius.md },
  tile: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  label: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  hint: { color: colors.textDim, fontSize: font.small },
});
