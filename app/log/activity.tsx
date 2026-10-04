import { router, Stack } from 'expo-router';
import { useState } from 'react';

import { upsertActivity } from '@/db/repos/activityRepo';
import { ACTIVITY_TYPES, type ActivityType } from '@/db/schema';
import { addDays, todayKey } from '@/domain/dates';
import { milesToMeters } from '@/domain/units';
import { dedupeRange, recomputeRange } from '@/sync/syncService';
import { Body, Button, Chips, Screen, SectionLabel, Stepper, Title } from '@/ui/components';
import { NumberField } from '@/ui/fields';
import { formatShortDate } from '@/ui/format';

const TYPE_LABELS: Record<ActivityType, string> = { run: 'Run', tennis: 'Tennis', strength: 'Strength', walk: 'Walk', yoga: 'Yoga', cycling: 'Ride', swim: 'Swim', other: 'Other' };
const TYPE_OPTIONS = ACTIVITY_TYPES.map((id) => ({ id, label: TYPE_LABELS[id] }));
const RPE_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ id: String(n), label: String(n) }));
const FORMAT = [
  { id: 'singles', label: 'Singles' },
  { id: 'doubles', label: 'Doubles' },
] as const;

/** Manual log for anything the watch didn't record: tennis, a walk, yoga, another sport. */
export default function LogActivity() {
  const today = todayKey();
  const [type, setType] = useState<ActivityType>('tennis');
  const [date, setDate] = useState(today);
  const [minutes, setMinutes] = useState(60);
  const [rpe, setRpe] = useState(6);
  const [format, setFormat] = useState<'singles' | 'doubles'>('singles');
  const [miles, setMiles] = useState<number | null>(null);

  const dateOptions = [0, -1, -2].map((offset) => ({ id: addDays(today, offset), label: offset === 0 ? 'Today' : formatShortDate(addDays(today, offset)) }));

  const save = () => {
    const startedAt = new Date(`${date}T12:00:00`);
    const endedAt = new Date(startedAt.getTime() + minutes * 60000);
    upsertActivity({
      source: 'manual',
      type,
      title: type === 'tennis' ? `Tennis (${format})` : TYPE_LABELS[type],
      startedAt,
      endedAt,
      rpe,
      rpeEstimated: false,
      distanceM: type === 'run' && miles ? milesToMeters(miles) : null,
      tennisFormat: type === 'tennis' ? format : null,
    });
    dedupeRange(date, date);
    recomputeRange(date, today);
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Log activity' }} />
      <Screen edges={['bottom']} footer={<Button label="Save" onPress={save} />}>
        <Title subtitle="Counts toward training load like everything else.">Log an activity</Title>
        <SectionLabel>What</SectionLabel>
        <Chips options={TYPE_OPTIONS} selected={[type]} onToggle={setType} />
        <SectionLabel>When</SectionLabel>
        <Chips options={dateOptions} selected={[date]} onToggle={setDate} />
        <SectionLabel>Details</SectionLabel>
        <Stepper label="Duration" value={minutes} step={5} min={5} max={300} format={(v) => `${v} min`} onChange={setMinutes} />
        {type === 'tennis' ? <Chips options={FORMAT} selected={[format]} onToggle={setFormat} /> : null}
        {type === 'run' ? <NumberField decimal label="Distance (miles, optional)" value={miles} onChange={setMiles} /> : null}
        <SectionLabel>How hard (RPE)</SectionLabel>
        <Chips options={RPE_OPTIONS} selected={[String(rpe)]} onToggle={(id) => setRpe(Number(id))} />
        <Body dim>3 = easy chat pace · 5 = moderate · 7 = hard · 9 = near maximal</Body>
      </Screen>
    </>
  );
}
