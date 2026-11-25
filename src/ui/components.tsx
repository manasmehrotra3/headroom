/**
 * Shared Material 3 Expressive building blocks (Material You Ocean).
 * Includes native spring press states, haptics, M3 Outlined inputs, full-pill buttons,
 * tactile steppers, shape-morphing filter chips, and M3 1.5.0 segmented list rows.
 */
import { Children, cloneElement, isValidElement, useState, type ReactElement, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { segmentedCorners } from './expressive';
import { GradientBackdrop } from './GradientBackdrop';
import { CheckIcon } from './icons';
import { M3_LAYOUT, M3Pressable } from './motion';
import { colors, font, radius, space, TAP_MIN } from './theme';

/** Room left under the last card on a tab screen so the Floating Toolbar never covers it. */
export const TAB_BAR_CLEARANCE = 124;

/** The padding a Screen puts around its content. Non-scrolling screens apply it to their list. */
export const SCREEN_PADDING = { padding: space.lg, paddingBottom: space.xxl } as const;

export function Screen({
  children,
  footer,
  edges = ['top'],
  bottomInset = false,
  scroll = true,
}: {
  children: ReactNode;
  /** Pinned to the bottom, within thumb reach (e.g. a Next button). */
  footer?: ReactNode;
  edges?: Edge[];
  /** Tab screens: leave room for the floating toolbar. */
  bottomInset?: boolean;
  scroll?: boolean;
}) {
  const ios = Platform.OS === 'ios';
  const liftForKeyboard = ios && Boolean(footer);

  return (
    <View style={styles.screen}>
      <GradientBackdrop />
      <SafeAreaView style={{ flex: 1 }} edges={edges}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={liftForKeyboard ? 'padding' : undefined} enabled={liftForKeyboard}>
          {scroll ? (
            <ScrollView
              contentContainerStyle={[styles.screenContent, bottomInset && { paddingBottom: TAB_BAR_CLEARANCE }]}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets={ios && !liftForKeyboard}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={{ flex: 1 }}>{children}</View>
          )}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

export function Title({ children, subtitle }: { children: ReactNode; subtitle?: string }) {
  return (
    <Animated.View entering={FadeIn.duration(220)} style={{ marginBottom: space.lg }}>
      <Text style={styles.title}>{children}</Text>
      {subtitle ? <Text style={[styles.dim, { marginTop: 4 }]}>{subtitle}</Text> : null}
    </Animated.View>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function Body({ children, dim }: { children: ReactNode; dim?: boolean }) {
  return <Text style={dim ? styles.dim : styles.body}>{children}</Text>;
}

export function Card({
  children,
  style,
  tone = 'default',
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'default' | 'low' | 'high' | 'primary' | 'secondary' | 'tertiary';
}) {
  const toneBg =
    tone === 'low'
      ? colors.surfaceLow
      : tone === 'high'
        ? colors.surfaceHigh
        : tone === 'primary'
          ? colors.primaryContainer
          : tone === 'secondary'
            ? colors.secondaryContainer
            : tone === 'tertiary'
              ? colors.tertiaryContainer
              : colors.surface;
  return <View style={[styles.card, { backgroundColor: toneBg }, style]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'tonal' | 'danger';
  disabled?: boolean;
}) {
  const isPrimary = variant === 'primary';
  const isTonal = variant === 'secondary' || variant === 'tonal';
  const isDanger = variant === 'danger';

  return (
    <M3Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      haptic={isPrimary ? 'medium' : 'tap'}
      scaleTo={0.96}
      style={[
        styles.button,
        isPrimary && styles.buttonPrimary,
        isTonal && styles.buttonTonal,
        isDanger && styles.buttonDanger,
      ]}
    >
      <Text
        style={[
          styles.buttonLabel,
          isPrimary && { color: colors.onPrimary },
          isTonal && { color: colors.onSecondaryContainer },
          isDanger && { color: colors.onErrorContainer },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </M3Pressable>
  );
}

/**
 * M3 Expressive 1.5.0 Segmented List group for RowLink items.
 * Automatically applies 24px outer top/bottom corners and 6px inner corners with 3px gaps.
 */
export function RowGroup({ children }: { children: ReactNode }) {
  const valid = Children.toArray(children).filter((child): child is ReactElement<{ first?: boolean; last?: boolean; grouped?: boolean }> => isValidElement(child));
  return (
    <View style={styles.rowGroup}>
      {valid.map((child, idx) =>
        cloneElement(child, {
          grouped: true,
          first: idx === 0,
          last: idx === valid.length - 1,
        }),
      )}
    </View>
  );
}

/** A tappable M3 Expressive segmented list row (e.g. Settings entry). */
export function RowLink({
  label,
  value,
  icon,
  onPress,
  first = true,
  last = true,
  grouped = false,
}: {
  label: string;
  value?: string;
  icon?: ReactNode;
  onPress: () => void;
  first?: boolean;
  last?: boolean;
  grouped?: boolean;
}) {
  return (
    <M3Pressable
      accessibilityRole="button"
      onPress={onPress}
      haptic="tap"
      scaleTo={0.98}
      style={[
        styles.row,
        segmentedCorners(first, last),
        !grouped && { marginBottom: 6 },
      ]}
    >
      {icon ? <View style={styles.rowIconWell}>{icon}</View> : null}
      <Text style={[styles.body, styles.rowLabel]} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.rowRight}>
        {value ? (
          <View style={styles.rowValueChip}>
            <Text style={styles.rowValueText} numberOfLines={1}>
              {value}
            </Text>
          </View>
        ) : null}
        <Text style={styles.rowChevron}>›</Text>
      </View>
    </M3Pressable>
  );
}

/** M3 Expressive toggle filter chips with spring bounce and selection checkmark. */
export function Chips<T extends string>({
  options,
  selected,
  onToggle,
}: {
  options: readonly { id: T; label: string }[];
  selected: readonly T[];
  onToggle: (id: T) => void;
}) {
  return (
    <Animated.View layout={M3_LAYOUT} style={styles.chips}>
      {options.map((option) => {
        const on = selected.includes(option.id);
        return (
          <M3Pressable
            key={option.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            onPress={() => onToggle(option.id)}
            haptic="select"
            scaleTo={0.93}
            style={[styles.chip, on && styles.chipOn]}
          >
            {on ? <CheckIcon color={colors.onPrimary} size={15} /> : null}
            <Text style={[styles.chipLabel, on && { color: colors.onPrimary, fontWeight: '700' }]}>{option.label}</Text>
          </M3Pressable>
        );
      })}
    </Animated.View>
  );
}

export function Field({
  label,
  hint,
  value,
  onChangeText,
  keyboardType,
  placeholder,
  multiline,
  secret,
}: {
  label: string;
  hint?: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: KeyboardTypeOptions;
  placeholder?: string;
  multiline?: boolean;
  secret?: boolean;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ marginBottom: space.md }}>
      <Text style={[styles.fieldLabel, focused && { color: colors.primary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={colors.outline}
        multiline={multiline}
        secureTextEntry={secret}
        autoCapitalize={secret ? 'none' : undefined}
        autoCorrect={secret ? false : undefined}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          focused && styles.inputFocused,
          multiline && { minHeight: 96, textAlignVertical: 'top', paddingVertical: space.md },
        ]}
      />
      {hint ? <Text style={[styles.dim, { marginTop: space.xs, fontSize: font.small }]}>{hint}</Text> : null}
    </View>
  );
}

/** Big M3 Expressive pill stepper with tactile circular −/+ controls for sweaty hands. */
export function Stepper({
  label,
  value,
  format,
  onChange,
  step,
  min,
  max,
}: {
  label: string;
  value: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
  step: number;
  min: number;
  max: number;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <View style={{ marginBottom: space.md }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.stepper}>
        <M3Pressable
          accessibilityLabel={`Decrease ${label}`}
          onPress={() => onChange(clamp(value - step))}
          haptic="select"
          scaleTo={0.88}
          style={styles.stepperButton}
        >
          <Text style={styles.stepperSign}>−</Text>
        </M3Pressable>
        <Text style={styles.stepperValue}>{format(value)}</Text>
        <M3Pressable
          accessibilityLabel={`Increase ${label}`}
          onPress={() => onChange(clamp(value + step))}
          haptic="select"
          scaleTo={0.88}
          style={styles.stepperButton}
        >
          <Text style={styles.stepperSign}>+</Text>
        </M3Pressable>
      </View>
    </View>
  );
}

export function ErrorList({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <View style={styles.errorBox}>
      {errors.map((error) => (
        <Text key={error} style={{ color: colors.onErrorContainer, fontSize: font.body, fontWeight: '500' }}>
          {error}
        </Text>
      ))}
    </View>
  );
}

export function WarningList({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <View style={styles.warningBox}>
      {warnings.map((warning) => (
        <Text key={warning} style={{ color: colors.onWarningContainer, fontSize: font.body }}>
          ⚠ {warning}
        </Text>
      ))}
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  screenContent: SCREEN_PADDING,
  footer: {
    padding: space.lg,
    gap: space.sm,
    backgroundColor: colors.surfaceLow,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  title: { color: colors.onSurface, fontSize: font.title + 2, fontWeight: '800', letterSpacing: -0.3 },
  sectionLabel: {
    color: colors.primary,
    fontSize: font.caption + 1,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginTop: space.lg,
    marginBottom: space.sm,
    paddingHorizontal: space.xs,
  },
  body: { color: colors.onSurface, fontSize: font.body, lineHeight: 22 },
  dim: { color: colors.onSurfaceVariant, fontSize: font.body, lineHeight: 22 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: space.lg,
    marginBottom: space.md,
    gap: space.sm,
  },
  button: {
    minHeight: TAP_MIN - 2,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonTonal: { backgroundColor: colors.secondaryContainer },
  buttonDanger: { backgroundColor: colors.errorContainer },
  buttonLabel: { color: colors.onSurface, fontSize: font.body + 1, fontWeight: '700' },
  rowGroup: { gap: 3, marginBottom: space.sm },
  row: {
    minHeight: TAP_MIN + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    backgroundColor: colors.surface,
  },
  rowIconWell: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontWeight: '600' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 1 },
  rowValueChip: {
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    maxWidth: 160,
  },
  rowValueText: { color: colors.onSecondaryContainer, fontSize: font.small - 1, fontWeight: '600' },
  rowChevron: { color: colors.onSurfaceVariant, fontSize: 18, fontWeight: '500' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: 44,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceHigh,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.primary },
  chipLabel: { color: colors.onSurface, fontSize: font.body, fontWeight: '500' },
  fieldLabel: { color: colors.onSurfaceVariant, fontSize: font.small, fontWeight: '600', marginBottom: 6, paddingHorizontal: 2 },
  input: {
    minHeight: TAP_MIN,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceLow,
    color: colors.onSurface,
    fontSize: font.large,
    fontWeight: '600',
    paddingHorizontal: space.lg,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.pill,
    padding: 6,
  },
  stepperButton: {
    width: 54,
    height: 54,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperSign: { color: colors.onSurface, fontSize: 26, fontWeight: '600', lineHeight: 28 },
  stepperValue: {
    flex: 1,
    textAlign: 'center',
    color: colors.onSurface,
    fontSize: font.title,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  errorBox: {
    backgroundColor: colors.errorContainer,
    borderRadius: radius.lg,
    padding: space.md,
    marginBottom: space.md,
    gap: space.xs,
  },
  warningBox: {
    backgroundColor: colors.warningContainer,
    borderRadius: radius.lg,
    padding: space.md,
    marginBottom: space.md,
    gap: space.xs,
  },
});
