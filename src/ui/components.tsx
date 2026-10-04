/**
 * Small shared building blocks. Kept in one file so the whole UI kit is easy to scan.
 */
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { GradientBackdrop } from './GradientBackdrop';
import { colors, font, radius, space, TAP_MIN } from './theme';

/** Room left under the last card on a tab screen so the floating tab bar never covers it. */
export const TAB_BAR_CLEARANCE = 120;

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
  /** Tab screens: leave room for the floating tab bar. */
  bottomInset?: boolean;
  /**
   * Set false when the screen's content is one long list and brings its own scrolling, i.e. a
   * FlatList. A FlatList nested inside a ScrollView is given unlimited height, so it renders
   * every row and windowing does nothing. Use `SCREEN_PADDING` as the list's
   * contentContainerStyle to keep the same margins.
   */
  scroll?: boolean;
}) {
  // iOS doesn't resize the screen for the keyboard the way Android does. With a pinned footer
  // (a Save button) the whole screen lifts so the footer stays above the keyboard; without one
  // the scroll view makes room and scrolls the focused field into view. Using both at once
  // would move things twice. On Android neither is needed, so both stay off there.
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
    <View style={{ marginBottom: space.lg }}>
      <Text style={styles.title}>{children}</Text>
      {subtitle ? <Text style={styles.dim}>{subtitle}</Text> : null}
    </View>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function Body({ children, dim }: { children: ReactNode; dim?: boolean }) {
  return <Text style={dim ? styles.dim : styles.body}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'danger' && styles.buttonDanger,
        (pressed || disabled) && { opacity: 0.6 },
      ]}
    >
      <Text style={[styles.buttonLabel, variant === 'primary' && { color: colors.accentText }]}>{label}</Text>
    </Pressable>
  );
}

/**
 * Rounds and clips a run of RowLinks into one container, like a grouped settings list. The rows
 * keep their own background, so the group adds only the outline and the corners.
 */
export function RowGroup({ children }: { children: ReactNode }) {
  return <View style={styles.rowGroup}>{children}</View>;
}

/** A tappable list row, e.g. a Settings entry. */
export function RowLink({ label, value, onPress }: { label: string; value?: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceRaised }]}>
      <Text style={styles.body}>{label}</Text>
      <Text style={[styles.dim, { flexShrink: 1, textAlign: 'right' }]} numberOfLines={1}>
        {value ? `${value}  ›` : '›'}
      </Text>
    </Pressable>
  );
}

/** Toggle chips: pass `selected` for one or many choices. */
export function Chips<T extends string>({ options, selected, onToggle }: { options: readonly { id: T; label: string }[]; selected: readonly T[]; onToggle: (id: T) => void }) {
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const on = selected.includes(option.id);
        return (
          <Pressable
            key={option.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            onPress={() => onToggle(option.id)}
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.chipLabel, on && { color: colors.accentText }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
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
}: {
  label: string;
  hint?: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: KeyboardTypeOptions;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View style={{ marginBottom: space.md }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        multiline={multiline}
        style={[styles.input, multiline && { minHeight: 90, textAlignVertical: 'top' }]}
      />
      {hint ? <Text style={[styles.dim, { marginTop: space.xs }]}>{hint}</Text> : null}
    </View>
  );
}

/** Big minus / value / plus control. Used wherever typing would be fiddly. */
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
        <Pressable accessibilityLabel={`Decrease ${label}`} onPress={() => onChange(clamp(value - step))} style={styles.stepperButton}>
          <Text style={styles.stepperSign}>−</Text>
        </Pressable>
        <Text style={styles.stepperValue}>{format(value)}</Text>
        <Pressable accessibilityLabel={`Increase ${label}`} onPress={() => onChange(clamp(value + step))} style={styles.stepperButton}>
          <Text style={styles.stepperSign}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function ErrorList({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <View style={{ marginBottom: space.md }}>
      {errors.map((error) => (
        <Text key={error} style={{ color: colors.danger, fontSize: font.body, marginBottom: space.xs }}>
          {error}
        </Text>
      ))}
    </View>
  );
}

export function WarningList({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <Card style={{ borderColor: colors.warning }}>
      {warnings.map((warning) => (
        <Text key={warning} style={{ color: colors.warning, fontSize: font.body }}>
          ⚠ {warning}
        </Text>
      ))}
    </Card>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  screenContent: SCREEN_PADDING,
  footer: {
    padding: space.lg,
    gap: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  title: { color: colors.text, fontSize: font.title, fontWeight: '700' },
  sectionLabel: {
    color: colors.textDim,
    fontSize: font.small,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: space.lg,
    marginBottom: space.sm,
  },
  body: { color: colors.text, fontSize: font.body, lineHeight: 22 },
  dim: { color: colors.textDim, fontSize: font.body, lineHeight: 22 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    marginBottom: space.md,
    gap: space.sm,
  },
  button: {
    minHeight: TAP_MIN,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonPrimary: { backgroundColor: colors.accent, borderColor: colors.accent },
  buttonDanger: { borderColor: colors.danger },
  buttonLabel: { color: colors.text, fontSize: font.large, fontWeight: '600' },
  row: {
    minHeight: TAP_MIN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingHorizontal: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowGroup: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: 48,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipLabel: { color: colors.text, fontSize: font.body },
  fieldLabel: { color: colors.textDim, fontSize: font.small, marginBottom: space.xs },
  input: {
    minHeight: TAP_MIN,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: font.large,
    paddingHorizontal: space.lg,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepperButton: { width: 72, height: 64, alignItems: 'center', justifyContent: 'center' },
  stepperSign: { color: colors.text, fontSize: 32, fontWeight: '500' },
  stepperValue: { flex: 1, textAlign: 'center', color: colors.text, fontSize: font.title, fontWeight: '600' },
});
