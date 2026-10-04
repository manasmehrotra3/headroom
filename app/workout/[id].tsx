import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TUNABLES } from '@/config/tunables';
import { getExercise } from '@/data/exercises';
import { db } from '@/db/client';
import { loadAvailableEquipment, loadProfile, loadSettings } from '@/db/repos/profileRepo';
import { todaysPainAreas } from '@/db/repos/recoveryRepo';
import { abandonWorkout, exerciseHistory, finishWorkout, logSet, updatePlan, type PlanEntry } from '@/db/repos/workoutRepo';
import { setLogs, workoutLogs } from '@/db/schema';
import { suggestWeight } from '@/domain/strength/progression';
import { estimateRemainingSec, secondsPerSet, suggestDrops, type RemainingWork } from '@/domain/strength/sessionTime';
import type { Exercise } from '@/domain/strength/types';
import { swapOptions } from '@/domain/strength/workoutBuilder';
import { formatDuration } from '@/domain/units';
import { ExerciseInfo } from '@/features/workout/ExerciseInfo';
import { RestTimer } from '@/features/workout/RestTimer';
import { SetLogger, type SetInput } from '@/features/workout/SetLogger';
import { WorkoutSummary } from '@/features/workout/WorkoutSummary';
import { useActiveWorkout } from '@/stores/activeWorkout';
import { cancelRestNotification, scheduleRestNotification } from '@/sync/notifications';
import { Body, Button, Card } from '@/ui/components';
import { formatLb } from '@/ui/format';
import { colors, font, radius, space, TAP_MIN } from '@/ui/theme';

export default function WorkoutPlayer() {
  useKeepAwake();
  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = Number(id);

  const { data: workouts } = useLiveQuery(db.select().from(workoutLogs).where(eq(workoutLogs.id, workoutId)));
  const { data: sets } = useLiveQuery(db.select().from(setLogs).where(eq(setLogs.workoutId, workoutId)));
  const workout = workouts[0];

  const index = useActiveWorkout((s) => s.index);
  const setIndex = useActiveWorkout((s) => s.setIndex);
  const startRest = useActiveWorkout((s) => s.startRest);
  const resetStore = useActiveWorkout((s) => s.reset);
  const restEndsAt = useActiveWorkout((s) => s.restEndsAt);

  const [swapFor, setSwapFor] = useState<Exercise | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [settings] = useState(loadSettings);
  const [context] = useState(() => {
    const profile = loadProfile();
    return {
      availableEquipment: loadAvailableEquipment(),
      painAreas: [...new Set([...(profile?.injuries.map((i) => i.area) ?? []), ...todaysPainAreas()])],
    };
  });

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);
  useEffect(() => () => resetStore(), [resetStore]);

  const plan: PlanEntry[] = workout?.plan ?? [];
  const setsFor = (exerciseId: string) => sets.filter((s) => s.exerciseId === exerciseId).sort((a, b) => a.setIndex - b.setIndex);
  const firstUnfinished = plan.findIndex((p) => setsFor(p.exerciseId).length < p.sets);
  const current = index ?? (firstUnfinished === -1 ? plan.length : firstUnfinished);
  const entry = plan[current];
  const allDone = firstUnfinished === -1;

  const elapsedSec = workout ? (now - workout.startedAt.getTime()) / 1000 : 0;
  const capSec = TUNABLES.schedule.dailyCapMin * 60;

  const remaining: RemainingWork[] = plan.map((p) => {
    const exercise = getExercise(p.exerciseId);
    return {
      exerciseId: p.exerciseId,
      name: exercise.name,
      tier: exercise.tier,
      setsLeft: Math.max(0, p.sets - setsFor(p.exerciseId).length),
      secPerSet: secondsPerSet({ exercise, reps: p.reps, restSec: p.restSec }),
    };
  });
  const remainingSec = estimateRemainingSec(remaining);
  const drops = useMemo(() => suggestDrops(remaining, elapsedSec, capSec), [remaining, elapsedSec, capSec]);

  // Suggested weight from previous sessions of this exercise (double progression).
  const suggestion = useMemo(() => {
    if (!entry) return null;
    const exercise = getExercise(entry.exerciseId);
    const history = exerciseHistory(entry.exerciseId, workoutId).map((h) => ({ sets: h.sets }));
    return { exercise, history, ...suggestWeight(exercise, entry.reps, history) };
    // sets.length re-runs this after a swap/log so history stays fresh.
  }, [entry?.exerciseId, entry?.reps, workoutId, sets.length]);

  if (!workout || !suggestion) {
    return (
      <SafeAreaView style={styles.screen}>
        <Body dim>Loading…</Body>
      </SafeAreaView>
    );
  }

  const finish = (sessionRpe: number) => {
    void cancelRestNotification();
    finishWorkout(workoutId, sessionRpe);
    resetStore();
    router.back();
  };

  if (showSummary || (allDone && plan.length > 0 && sets.length > 0)) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <WorkoutSummary sets={sets} startedAt={workout.startedAt} onFinish={finish} />
          {!allDone ? <Button variant="secondary" label="Back to the workout" onPress={() => setShowSummary(false)} /> : null}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!entry) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <Body>Nothing left in this workout.</Body>
          <Button label="Finish" onPress={() => setShowSummary(true)} />
        </View>
      </SafeAreaView>
    );
  }

  const exercise = suggestion.exercise;
  const doneSets = setsFor(entry.exerciseId);
  const setNumber = doneSets.length + 1;
  const lastSessionSet = suggestion.history[0]?.sets[doneSets.length] ?? suggestion.history[0]?.sets.at(-1);
  const lastThisSession = doneSets.at(-1);
  const rpeCap = workout.variant === 'easy' ? TUNABLES.strength.easyVariant.rpeCap : null;
  const prefill: SetInput = {
    weightKg: lastThisSession?.weightKg ?? suggestion.weightKg ?? lastSessionSet?.weightKg ?? 0,
    reps: lastThisSession?.reps ?? lastSessionSet?.reps ?? entry.reps[1],
    rpe: Math.min(lastThisSession?.rpe ?? lastSessionSet?.rpe ?? 8, rpeCap ?? 10),
    note: '',
  };
  const nextEntry = plan[current + 1];
  const nextUp = setNumber < entry.sets ? `${exercise.name} set ${setNumber + 1}` : nextEntry ? getExercise(nextEntry.exerciseId).name : 'session summary';

  const onLog = (input: SetInput) => {
    logSet({ workoutId, exerciseId: entry.exerciseId, setIndex: doneSets.length, ...input });
    const isLastSet = setNumber >= entry.sets;
    if (isLastSet) {
      // Move on; the next exercise's first set follows the rest.
      setIndex(null);
    }
    startRest(entry.restSec, nextUp);
    void scheduleRestNotification(entry.restSec, nextUp);
  };

  const applySwap = (replacement: Exercise) => {
    const newPlan = plan.flatMap((p, i) => {
      if (i !== current) return [p];
      const logged = setsFor(p.exerciseId).length;
      const left = Math.max(0, p.sets - logged);
      const swapped = { exerciseId: replacement.id, sets: left, reps: replacement.reps, restSec: replacement.restSec };
      return logged > 0 ? [{ ...p, sets: logged }, swapped] : [swapped];
    });
    updatePlan(workoutId, newPlan);
    setSwapFor(null);
    setIndex(null);
  };

  const skipExercise = () => {
    const logged = doneSets.length;
    const newPlan = plan.flatMap((p, i) => (i !== current ? [p] : logged > 0 ? [{ ...p, sets: logged }] : []));
    updatePlan(workoutId, newPlan);
    setIndex(null);
  };

  const applyDrops = () => {
    const dropBy = new Map(drops.map((d) => [d.exerciseId, d.setsToDrop]));
    const newPlan = plan.map((p) => ({ ...p, sets: p.sets - (dropBy.get(p.exerciseId) ?? 0) })).filter((p) => p.sets > 0 || setsFor(p.exerciseId).length > 0);
    updatePlan(workoutId, newPlan);
    setIndex(null);
  };

  const confirmAbandon = () =>
    Alert.alert('Leave this workout?', 'Logged sets are kept. You can also finish now and rate the session.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Finish now', onPress: () => setShowSummary(true) },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          void cancelRestNotification();
          abandonWorkout(workoutId);
          resetStore();
          router.back();
        },
      },
    ]);

  const projectedOver = elapsedSec + remainingSec - capSec;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {/* Session header: timer vs cap, progress. */}
      <View style={styles.header}>
        <Pressable onPress={confirmAbandon} hitSlop={12}>
          <Text style={styles.headerDim}>✕ Leave</Text>
        </Pressable>
        <Text style={[styles.headerTime, projectedOver > 0 && { color: colors.warning }]}>
          {formatDuration(elapsedSec)} <Text style={styles.headerDim}>/ {TUNABLES.schedule.dailyCapMin}:00</Text>
        </Text>
        <Text style={styles.headerDim}>
          {current + 1} / {plan.length}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {restEndsAt !== null ? <RestTimer /> : null}

        {projectedOver > TUNABLES.strength.overCapWarnMin * 60 && drops.length > 0 && restEndsAt === null ? (
          <Card style={{ borderColor: colors.warning }}>
            <Text style={{ color: colors.warning, fontSize: font.body, fontWeight: '600' }}>
              Running about {Math.ceil(projectedOver / 60)} min over the {TUNABLES.schedule.dailyCapMin}-min cap
            </Text>
            <Body dim>Suggested: {drops.map((d) => `drop ${d.setsToDrop} set${d.setsToDrop > 1 ? 's' : ''} of ${d.name}`).join(', ')}.</Body>
            <Button variant="secondary" label="Apply and keep going" onPress={applyDrops} />
          </Card>
        ) : null}

        <Text style={styles.name}>{exercise.name}</Text>
        <Text style={styles.target}>
          {entry.sets} × {entry.reps[0]}–{entry.reps[1]}
          {exercise.loadType === 'time' ? ' s' : ''}
          {suggestion.weightKg !== null && exercise.loadType === 'weight' ? ` · suggested ${formatLb(suggestion.weightKg, 1).replace('.0 lb', ' lb')}` : ''}
          {' · rest '}
          {formatDuration(entry.restSec)}
        </Text>
        <Text style={styles.reason}>{suggestion.reason}</Text>

        <ExerciseInfo exercise={exercise} compact />

        {doneSets.length > 0 ? (
          <View style={styles.done}>
            {doneSets.map((s) => (
              <Text key={s.id} style={styles.doneText}>
                Set {s.setIndex + 1}: {exercise.loadType === 'weight' ? `${formatLb(s.weightKg, 1).replace('.0 lb', ' lb')} × ` : ''}
                {s.reps}
                {exercise.loadType === 'time' ? ' s' : ''} · RPE {s.rpe}
                {s.note ? ` · ${s.note}` : ''}
              </Text>
            ))}
          </View>
        ) : null}

        {setNumber <= entry.sets ? (
          <SetLogger
            exercise={exercise}
            setNumber={setNumber}
            totalSets={entry.sets}
            reps={entry.reps}
            prefill={prefill}
            effortScale={settings.effortScale}
            rpeCap={rpeCap}
            onLog={onLog}
          />
        ) : (
          <Button label={nextEntry ? `Next: ${getExercise(nextEntry.exerciseId).name}` : 'Finish session'} onPress={() => setIndex(null)} />
        )}

        <View style={styles.actions}>
          <Pressable onPress={() => setSwapFor(exercise)} style={styles.action}>
            <Text style={styles.actionText}>Swap</Text>
          </Pressable>
          <Pressable onPress={skipExercise} style={styles.action}>
            <Text style={styles.actionText}>Skip exercise</Text>
          </Pressable>
          {current > 0 ? (
            <Pressable onPress={() => setIndex(current - 1)} style={styles.action}>
              <Text style={styles.actionText}>‹ Prev</Text>
            </Pressable>
          ) : null}
          {nextEntry ? (
            <Pressable onPress={() => setIndex(current + 1)} style={styles.action}>
              <Text style={styles.actionText}>Next ›</Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable onPress={() => setShowSummary(true)} style={{ alignSelf: 'center', paddingVertical: space.md }}>
          <Text style={styles.headerDim}>Finish session early</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={swapFor !== null} transparent animationType="slide" onRequestClose={() => setSwapFor(null)}>
        <Pressable style={styles.backdrop} onPress={() => setSwapFor(null)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Swap {exercise.name} for…</Text>
          {swapOptions(exercise, context).map((option) => (
            <Pressable key={option.id} onPress={() => applySwap(option)} style={styles.option}>
              <Text style={styles.optionName}>{option.name}</Text>
              <Text style={styles.headerDim}>{option.station}</Text>
            </Pressable>
          ))}
          {swapOptions(exercise, context).length === 0 ? <Body dim>No alternative fits your equipment and today's pain areas.</Body> : null}
          <Button variant="secondary" label="Cancel" onPress={() => setSwapFor(null)} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, paddingBottom: space.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  headerTime: { color: colors.text, fontSize: font.large, fontWeight: '700', fontVariant: ['tabular-nums'] },
  headerDim: { color: colors.textDim, fontSize: font.body },
  name: { color: colors.text, fontSize: font.title, fontWeight: '700' },
  target: { color: colors.accent, fontSize: font.body, fontWeight: '600', marginTop: space.xs },
  reason: { color: colors.textDim, fontSize: font.small, marginTop: space.xs, marginBottom: space.md },
  done: { marginTop: space.md, marginBottom: space.sm, gap: 2 },
  doneText: { color: colors.textDim, fontSize: font.small },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  action: { minHeight: 48, paddingHorizontal: space.lg, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  actionText: { color: colors.text, fontSize: font.body },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: colors.sheet, padding: space.lg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, gap: space.sm },
  sheetTitle: { color: colors.text, fontSize: font.large, fontWeight: '600', marginBottom: space.sm },
  option: { minHeight: TAP_MIN, justifyContent: 'center', paddingHorizontal: space.md, borderRadius: radius.md, backgroundColor: colors.surfaceRaised },
  optionName: { color: colors.text, fontSize: font.body, fontWeight: '600' },
});
