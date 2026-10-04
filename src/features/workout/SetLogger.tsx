import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { rirToRpe, rpeToRir } from '@/domain/strength/progression';
import type { Exercise } from '@/domain/strength/types';
import { kgToLb, lbToKg, roundTo } from '@/domain/units';
import { Button, Stepper } from '@/ui/components';
import { colors, font, radius, space } from '@/ui/theme';

export interface SetInput {
  weightKg: number;
  reps: number;
  rpe: number;
  note: string;
}

const RPE_OPTIONS = [6, 7, 8, 9, 10];
const RIR_OPTIONS = [4, 3, 2, 1, 0];

/**
 * Big steppers for one set. `prefill` comes from the last set (this session, then last session,
 * then the suggestion) so between sets you usually just tap Log.
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

  // A new set (or a swapped exercise) gets fresh prefills.
  useEffect(() => {
    setWeightLb(roundTo(kgToLb(prefill.weightKg), 0.5));
    setRepCount(prefill.reps);
    setRpe(prefill.rpe);
    setNote('');
  }, [exercise.id, setNumber, prefill.weightKg, prefill.reps, prefill.rpe]);

  const isTime = exercise.loadType === 'time';
  const hasWeight = exercise.loadType === 'weight';
  const step = exercise.incrementLb > 0 ? exercise.incrementLb : 2.5;

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
        {rpeCap !== null ? `  ·  keep it at RPE ≤ ${rpeCap} today` : ''}
      </Text>
      <View style={styles.chips}>
        {(effortScale === 'rpe' ? RPE_OPTIONS : RIR_OPTIONS).map((option) => {
          const value = effortScale === 'rpe' ? option : rirToRpe(option);
          const on = value === rpe;
          const overCap = rpeCap !== null && value > rpeCap;
          return (
            <Pressable
              key={option}
              onPress={() => setRpe(value)}
              style={[styles.chip, on && styles.chipOn, overCap && !on && styles.chipWarn]}
              accessibilityLabel={`${effortScale === 'rpe' ? 'RPE' : 'RIR'} ${option}`}
            >
              <Text style={[styles.chipText, on && { color: colors.accentText }]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
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
          placeholderTextColor={colors.textDim}
          style={styles.note}
        />
      ) : (
        <Pressable onPress={() => setShowNote(true)} style={styles.noteToggle}>
          <Text style={styles.hint}>+ add a note</Text>
        </Pressable>
      )}

      <Button
        label={`Log set ${setNumber}`}
        onPress={() => onLog({ weightKg: hasWeight ? lbToKg(weightLb) : 0, reps: repCount, rpe, note: note.trim() })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.lg, marginBottom: space.md },
  heading: { color: colors.text, fontSize: font.body, fontWeight: '600', marginBottom: space.md },
  fieldLabel: { color: colors.textDim, fontSize: font.small, marginBottom: space.xs },
  chips: { flexDirection: 'row', gap: space.sm },
  chip: { flex: 1, minHeight: 56, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipWarn: { borderColor: colors.warning },
  chipText: { color: colors.text, fontSize: font.title, fontWeight: '600' },
  hint: { color: colors.textDim, fontSize: font.small, marginTop: space.xs, marginBottom: space.md },
  note: { minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: space.md, marginBottom: space.md, fontSize: font.body },
  noteToggle: { alignSelf: 'flex-start' },
});
