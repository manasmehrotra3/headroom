import { router, Stack } from 'expo-router';
import { useState } from 'react';

import { getCheckin, saveCheckin } from '@/db/repos/recoveryRepo';
import { BODY_AREAS, type BodyArea } from '@/domain/bodyAreas';
import { startOfWeek, todayKey } from '@/domain/dates';
import { adjustToday, refreshWeek } from '@/db/repos/planRepo';
import { recomputeDay } from '@/sync/syncService';
import { Body, Button, Chips, Field, Screen, SectionLabel, Title } from '@/ui/components';
import { space } from '@/ui/theme';

const ENERGY = [
  { id: '1', label: 'Flat' },
  { id: '2', label: 'OK' },
  { id: '3', label: 'Great' },
] as const;
const SORENESS = [
  { id: '1', label: 'Fresh' },
  { id: '2', label: 'A bit sore' },
  { id: '3', label: 'Very sore' },
] as const;

/** The 3-tap morning check-in: energy, soreness, and any pain (with where). */
export default function CheckinScreen() {
  const today = todayKey();
  const [existing] = useState(() => getCheckin(today));
  const [energy, setEnergy] = useState(existing?.energy ?? 2);
  const [soreness, setSoreness] = useState(existing?.soreness ?? 1);
  const [pain, setPain] = useState<BodyArea[]>(existing?.painAreas ?? []);
  const [note, setNote] = useState(existing?.note ?? '');

  const save = () => {
    saveCheckin({ date: today, energy, soreness, painAreas: pain, note });
    recomputeDay(today);
    // Re-plan the rest of the week: pain removes sessions, and clearing it brings them back.
    refreshWeek(startOfWeek(today), today);
    adjustToday(today);
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Morning check-in' }} />
      <Screen edges={['bottom']} footer={<Button label="Save" onPress={save} />}>
        <Title subtitle="Three taps. Pain changes today's plan; the rest feeds readiness.">How are you?</Title>

        <SectionLabel>Energy</SectionLabel>
        <Chips options={ENERGY} selected={[String(energy)]} onToggle={(id) => setEnergy(Number(id))} />

        <SectionLabel>Soreness</SectionLabel>
        <Chips options={SORENESS} selected={[String(soreness)]} onToggle={(id) => setSoreness(Number(id))} />

        <SectionLabel>Any pain? Tap where</SectionLabel>
        <Body dim>Soreness is normal. Pain is sharp, one-sided, or changes how you move. Leave blank if none.</Body>
        <Chips options={BODY_AREAS} selected={pain} onToggle={(area) => setPain((p) => (p.includes(area) ? p.filter((a) => a !== area) : [...p, area]))} />
        {pain.length > 0 ? (
          <>
            <SectionLabel>Note</SectionLabel>
            <Field label="Optional" placeholder="e.g. left knee, front, after stairs" value={note} onChangeText={setNote} />
          </>
        ) : null}
        <Body dim>{'\n'}Sessions never push through pain: exercises loading that area are removed today.</Body>
      </Screen>
    </>
  );
}

export const CHECKIN_SPACING = space.md;
