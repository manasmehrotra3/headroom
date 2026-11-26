import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { rirToRpe, rpeToRir } from '@/domain/strength/progression';
import type { Exercise } from '@/domain/strength/types';
import { kgToLb, lbToKg, roundTo } from '@/domain/units';
import { Button, Stepper } from '@/ui/components';
import { ConnectedButtonGroup } from '@/ui/expressive';
import { M3Pressable, hapticSuccess } from '@/ui/motion';
import { colors, font, radius, space, themedStyles } from '@/ui/theme';

export interface SetInput {
  weightKg: number;
  reps: number;
  rpe: number;
  note: string;
}

const RPE_OPTIONS = [6, 7, 8, 9, 10];
const RIR_OPTIONS = [4, 3, 2, 1, 0];

/**
 * Big M3 Expressive steppers + shape-morphing ConnectedButtonGroup for RPE/RIR.
 * Designed for 1-handed sweaty-hand gym logging.
 */
export function SetLogger({
  exercise,
  setNumber,
  totalSets,
  reps,
  prefill,
  effortScale,
  rpeCap,
  onLog,
}: {
  exercise: Exercise;
  setNumber: number;
  totalSets: number;
  reps: [number, number];
  prefill: SetInput;
  effortScale: 'rpe' | 'rir';
  rpeCap: number | null;
  onLog: (set: SetInput) => void;
}) {
  const [weightLb, setWeightLb] = useState(roundTo(kgToLb(prefill.weightKg), 0.5));
  const [repCount, setRepCount] = useState(prefill.reps);
  const [rpe, setRpe] = useState(prefill.rpe);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);

  useEffect(() => {
    setWeightLb(roundTo(kgToLb(prefill.weightKg), 0.5));
    setRepCount(prefill.reps);
    setRpe(prefill.rpe);
    setNote('');
  }, [exercise.id, setNumber, prefill.weightKg, prefill.reps, prefill.rpe]);

  const isTime = exercise.loadType === 'time';
  const hasWeight = exercise.loadType === 'weight';
  const step = exercise.incrementLb > 0 ? exercise.incrementLb : 2.5;

  const rawOptions = effortScale === 'rpe' ? RPE_OPTIONS : RIR_OPTIONS;
  const effortOptions = rawOptions.map((option) => ({
    id: String(effortScale === 'rpe' ? option : rirToRpe(option)),
    label: String(option),
  }));
  const warnIds = rpeCap !== null ? effortOptions.filter((o) => Number(o.id) > rpeCap).map((o) => o.id) : undefined;

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>
        Set {setNumber} of {totalSets} · target {reps[0]}–{reps[1]} {isTime ? 'sec' : 'reps'}
      </Text>

      {hasWeight ? (
        <Stepper
          label={exercise.family === 'dumbbell' ? 'Weight per hand (lb)' : 'Weight (lb)'}
          value={weightLb}
          step={step}
          min={0}
          max={1500}
          format={(v) => `${v} lb`}
          onChange={setWeightLb}
        />
      ) : null}

      <Stepper
        label={isTime ? 'Seconds held' : 'Reps'}
        value={repCount}
        step={isTime ? 5 : 1}
        min={0}
        max={isTime ? 600 : 100}
        format={(v) => String(v)}
        onChange={setRepCount}
      />

      <Text style={styles.fieldLabel}>
        {effortScale === 'rpe' ? 'How hard (RPE)' : 'Reps in reserve'}
        {rpeCap !== null ? `  ·  keep at RPE ≤ ${rpeCap}` : ''}
      </Text>

      <ConnectedButtonGroup
        options={effortOptions}
        value={String(rpe)}
        onChange={(id) => setRpe(Number(id))}
        size="large"
        warnIds={warnIds}
      />

      <Text style={styles.hint}>
        {effortScale === 'rpe'
          ? 'RPE 8 = 2 reps left in the tank · 10 = nothing left'
          : `RIR ${rpeToRir(rpe)} = RPE ${rpe}`}
      </Text>

      {showNote ? (
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Note (optional): seat 4, felt easy…"
          placeholderTextColor={colors.outline}
          style={styles.note}
        />
      ) : (
        <M3Pressable onPress={() => setShowNote(true)} haptic="tap" style={styles.noteToggle}>
          <Text style={styles.noteToggleText}>+ Add a note</Text>
        </M3Pressable>
      )}

      <Button
        label={`Log set ${setNumber}`}
        onPress={() => {
          hapticSuccess();
          onLog({ weightKg: hasWeight ? lbToKg(weightLb) : 0, reps: repCount, rpe, note: note.trim() });
        }}
      />
    </View>
  );
}

const styles = themedStyles(() => ({
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: space.lg, marginBottom: space.md },
  heading: { color: colors.onSurfaceVariant, fontSize: font.small + 1, fontWeight: '700', marginBottom: space.md },
  fieldLabel: { color: colors.onSurfaceVariant, fontSize: font.small, fontWeight: '600', marginBottom: space.xs },
  hint: { color: colors.onSurfaceVariant, fontSize: font.small - 1, marginTop: space.sm, marginBottom: space.md },
  note: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceLow,
    color: colors.onSurface,
    paddingHorizontal: space.md,
    marginBottom: space.md,
    fontSize: font.body,
  },
  noteToggle: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceHigh,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    marginBottom: space.md,
  },
  noteToggleText: { color: colors.onSurfaceVariant, fontSize: font.small, fontWeight: '600' },
}));
