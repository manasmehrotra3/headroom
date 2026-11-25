/**
 * Material 3 Expressive FAB Menu:
 * Staggered floating pill items (`primaryContainer`) springing upward from the trailing FAB,
 * over a fading dark scrim, with a circular close button anchored to the exact FAB position.
 */
import { router, type Href } from 'expo-router';
import type { ComponentType } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';

import { FoodIcon, HeartIcon, PlusIcon, RunIcon, ScaleIcon } from '@/ui/icons';
import { M3Pressable } from '@/ui/motion';
import { colors, font, radius, space } from '@/ui/theme';

const ACTIONS: { label: string; hint: string; href: Href; Icon: ComponentType<{ color: string; size?: number }> }[] = [
  { label: 'Morning check-in', hint: 'Energy, soreness, pain', href: '/log/checkin', Icon: HeartIcon },
  { label: 'Log food', hint: 'Search, favourites, recents', href: '/food/search', Icon: FoodIcon },
  { label: 'Log weight', hint: 'Weigh-in & waist', href: '/progress', Icon: ScaleIcon },
  { label: 'Log an activity', hint: 'Tennis or anything missed', href: '/log/activity', Icon: RunIcon },
];

export function QuickAddSheet({
  visible,
  bottomOffset = 20,
  onClose,
}: {
  visible: boolean;
  bottomOffset?: number;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View entering={FadeIn.duration(180)} style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close quick add menu" />
        </Animated.View>

        <View pointerEvents="box-none" style={[styles.anchor, { bottom: bottomOffset }]}>
          <View style={styles.menuStack}>
            {ACTIONS.map(({ label, hint, href, Icon }, idx) => {
              // Stagger from bottom item closest to the FAB upward.
              const reverseIdx = ACTIONS.length - 1 - idx;
              return (
                <Animated.View
                  key={label}
                  entering={FadeInDown.delay(reverseIdx * 42).springify().damping(16).stiffness(280).mass(0.8)}
                >
                  <M3Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      onClose();
                      router.push(href);
                    }}
                    haptic="tap"
                    scaleTo={0.95}
                    style={styles.menuPill}
                  >
                    <View style={styles.iconCircle}>
                      <Icon color={colors.onPrimary} size={19} />
                    </View>
                    <View style={{ flexShrink: 1 }}>
                      <Text style={styles.label}>{label}</Text>
                      <Text style={styles.hint}>{hint}</Text>
                    </View>
                  </M3Pressable>
                </Animated.View>
              );
            })}
          </View>

          <Animated.View entering={ZoomIn.springify().damping(16).stiffness(300)} style={styles.closeRow}>
            <M3Pressable
              accessibilityRole="button"
              accessibilityLabel="Close quick add"
              onPress={onClose}
              haptic="medium"
              scaleTo={0.9}
              style={styles.closeFab}
            >
              <View style={{ transform: [{ rotate: '45deg' }] }}>
                <PlusIcon color={colors.onPrimary} size={26} />
              </View>
            </M3Pressable>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(6, 10, 14, 0.68)',
  },
  anchor: {
    position: 'absolute',
    right: space.lg,
    left: space.lg,
    alignItems: 'flex-end',
  },
  menuStack: {
    alignItems: 'flex-end',
    gap: 10,
    marginBottom: 14,
  },
  menuPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.primaryContainer,
    paddingLeft: 10,
    paddingRight: 20,
    paddingVertical: 10,
    borderRadius: radius.pill,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { color: colors.onPrimaryContainer, fontSize: font.body, fontWeight: '700' },
  hint: { color: colors.onPrimaryContainer, opacity: 0.78, fontSize: font.caption + 1, marginTop: 1 },
  closeRow: { alignItems: 'flex-end' },
  closeFab: {
    width: 62,
    height: 62,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
});
