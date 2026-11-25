import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
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
import { AnimatedLinearBar, segmentedCorners } from '@/ui/expressive';
import { formatLb } from '@/ui/format';
import { M3_LAYOUT, M3Pressable } from '@/ui/motion';
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

  const totalPlannedSets = plan.reduce((sum, p) => sum + p.sets, 0);
  const sessionProgress = totalPlannedSets > 0 ? Math.min(1, sets.length / totalPlannedSets) : 0;

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

  const suggestion = useMemo(() => {
    if (!entry) return null;
    const exercise = getExercise(entry.exerciseId);
    const history = exerciseHistory(entry.exerciseId, workoutId).map((h) => ({ sets: h.sets }));
    return { exercise, history, ...suggestWeight(exercise, entry.reps, history) };
  }, [entry?.exerciseId, entry?.reps, workoutId, sets.length]);

  if (!workout || !suggestion) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.content}>
          <Body dim>Loading…</Body>
        </View>
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
  const swapList = swapFor ? swapOptions(exercise, context) : [];

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {/* M3 Top Bar with tabular timer pill & continuous animated progress bar */}
      <View style={styles.headerWrap}>
        <View style={styles.header}>
          <M3Pressable onPress={confirmAbandon} haptic="tap" style={styles.leavePill}>
            <Text style={styles.leaveText}>✕ Leave</Text>
          </M3Pressable>
          <View style={[styles.timerPill, projectedOver > 0 && { backgroundColor: colors.warningContainer }]}>
            <Text style={[styles.headerTime, projectedOver > 0 && { color: colors.onWarningContainer }]}>
              {formatDuration(elapsedSec)} <Text style={styles.headerCap}>/ {TUNABLES.schedule.dailyCapMin}:00</Text>
            </Text>
          </View>
          <Text style={styles.headerCount}>
            {current + 1} / {plan.length}
          </Text>
        </View>
        <AnimatedLinearBar progress={sessionProgress} color={colors.primary} trackColor={colors.surfaceHighest} height={5} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {restEndsAt !== null ? <RestTimer /> : null}

        {projectedOver > TUNABLES.strength.overCapWarnMin * 60 && drops.length > 0 && restEndsAt === null ? (
          <Card style={{ backgroundColor: colors.warningContainer }}>
            <Text style={{ color: colors.onWarningContainer, fontSize: font.body, fontWeight: '700' }}>
              Running about {Math.ceil(projectedOver / 60)} min over the {TUNABLES.schedule.dailyCapMin}-min cap
            </Text>
            <Text style={{ color: colors.onWarningContainer, opacity: 0.85, fontSize: font.small }}>
              Suggested: {drops.map((d) => `drop ${d.setsToDrop} set${d.setsToDrop > 1 ? 's' : ''} of ${d.name}`).join(', ')}.
            </Text>
            <Button variant="primary" label="Apply and keep going" onPress={applyDrops} />
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
          <Animated.View layout={M3_LAYOUT} style={styles.doneStack}>
            {doneSets.map((s) => (
              <View key={s.id} style={styles.donePill}>
                <Text style={styles.doneText}>
                  ✓ Set {s.setIndex + 1}: {exercise.loadType === 'weight' ? `${formatLb(s.weightKg, 1).replace('.0 lb', ' lb')} × ` : ''}
                  {s.reps}
                  {exercise.loadType === 'time' ? ' s' : ''} · RPE {s.rpe}
                  {s.note ? ` · ${s.note}` : ''}
                </Text>
              </View>
            ))}
          </Animated.View>
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
          <M3Pressable onPress={() => setSwapFor(exercise)} haptic="tap" style={styles.action}>
            <Text style={styles.actionText}>Swap</Text>
          </M3Pressable>
          <M3Pressable onPress={skipExercise} haptic="tap" style={styles.action}>
            <Text style={styles.actionText}>Skip</Text>
          </M3Pressable>
          {current > 0 ? (
            <M3Pressable onPress={() => setIndex(current - 1)} haptic="select" style={styles.action}>
              <Text style={styles.actionText}>‹ Prev</Text>
            </M3Pressable>
          ) : null}
          {nextEntry ? (
            <M3Pressable onPress={() => setIndex(current + 1)} haptic="select" style={styles.action}>
              <Text style={styles.actionText}>Next ›</Text>
            </M3Pressable>
          ) : null}
        </View>

        <M3Pressable onPress={() => setShowSummary(true)} haptic="tap" style={{ alignSelf: 'center', paddingVertical: space.md }}>
          <Text style={styles.finishEarly}>Finish session early</Text>
        </M3Pressable>
      </ScrollView>

      <Modal visible={swapFor !== null} transparent animationType="none" onRequestClose={() => setSwapFor(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Animated.View entering={FadeIn.duration(180)} style={styles.backdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setSwapFor(null)} />
          </Animated.View>
          <Animated.View entering={SlideInDown.springify().damping(20).stiffness(240)} style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Swap {exercise.name} for…</Text>
            <View style={{ gap: 3 }}>
              {swapList.map((option, i) => (
                <M3Pressable
                  key={option.id}
                  onPress={() => applySwap(option)}
                  haptic="select"
                  style={[styles.option, segmentedCorners(i === 0, i === swapList.length - 1)]}
                >
                  <Text style={styles.optionName}>{option.name}</Text>
                  <Text style={styles.optionSub}>{option.station}</Text>
                </M3Pressable>
              ))}
            </View>
            {swapList.length === 0 ? <Body dim>No alternative fits your equipment and today's pain areas.</Body> : null}
            <Button variant="secondary" label="Cancel" onPress={() => setSwapFor(null)} />
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, paddingBottom: space.xxl },
  headerWrap: {
    paddingHorizontal: space.lg,
    paddingTop: space.xs,
    paddingBottom: space.sm,
    gap: space.sm,
    backgroundColor: colors.background,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  leavePill: { backgroundColor: colors.surfaceHigh, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill },
  leaveText: { color: colors.onSurface, fontSize: font.small, fontWeight: '700' },
  timerPill: { backgroundColor: colors.surfaceHigh, paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill },
  headerTime: { color: colors.onSurface, fontSize: font.body, fontWeight: '800', fontVariant: ['tabular-nums'] },
  headerCap: { color: colors.onSurfaceVariant, fontWeight: '500' },
  headerCount: { color: colors.onSurfaceVariant, fontSize: font.small, fontWeight: '700', fontVariant: ['tabular-nums'] },
  name: { color: colors.onSurface, fontSize: font.title + 2, fontWeight: '800', letterSpacing: -0.3 },
  target: { color: colors.primary, fontSize: font.body, fontWeight: '700', marginTop: space.xs },
  reason: { color: colors.onSurfaceVariant, fontSize: font.small, marginTop: 4, marginBottom: space.md },
  doneStack: { marginTop: space.sm, marginBottom: space.md, gap: 6 },
  donePill: { backgroundColor: colors.surfaceLow, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 9 },
  doneText: { color: colors.onSurfaceVariant, fontSize: font.small, fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.xs },
  action: {
    flexGrow: 1,
    minHeight: 46,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { color: colors.onSurface, fontSize: font.small + 1, fontWeight: '700' },
  finishEarly: { color: colors.onSurfaceVariant, fontSize: font.body, fontWeight: '600' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(6, 10, 14, 0.68)' },
  sheet: {
    backgroundColor: colors.sheet,
    padding: space.lg,
    paddingBottom: space.xxl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    gap: space.md,
  },
  handle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 99, backgroundColor: colors.outlineVariant },
  sheetTitle: { color: colors.onSurface, fontSize: font.large, fontWeight: '800' },
  option: { minHeight: TAP_MIN, justifyContent: 'center', paddingHorizontal: space.lg, backgroundColor: colors.surface },
  optionName: { color: colors.onSurface, fontSize: font.body, fontWeight: '700' },
  optionSub: { color: colors.onSurfaceVariant, fontSize: font.small },
});
