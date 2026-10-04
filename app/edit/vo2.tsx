import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { TUNABLES } from '@/config/tunables';
import { clearVo2, setManualVo2, vo2PointsBetween } from '@/db/repos/recoveryRepo';
import { addDays, todayKey } from '@/domain/dates';
import { EditScreen } from '@/features/settings/EditScreen';
import { PHONE_HEALTH } from '@/sources/phoneHealth';
import { publishWidget } from '@/sync/widget';
import { Body, RowGroup, RowLink, SectionLabel, Stepper } from '@/ui/components';
import { NumberField } from '@/ui/fields';
import { formatShortDate } from '@/ui/format';
import { space } from '@/ui/theme';

/** Sensible bounds for a human VO2 max, to catch a slipped decimal point. */
const MIN = 20;
const MAX = 90;

/**
 * Type in a VO2 max reading from Garmin Connect.
 *
 * Garmin doesn't share VO2 max with the phone's health store, so on Android it never arrives on
 * its own. Entering a value every few weeks is enough to see the trend, since the watch only
 * updates it every few runs anyway.
 */
export default function EditVo2() {
  const today = todayKey();
  const [value, setValue] = useState<number | null>(null);
  const [daysAgo, setDaysAgo] = useState(0);
  const [readings, setReadings] = useState(() => vo2PointsBetween(addDays(today, -TUNABLES.vo2.trendWindowDays), today));
  const date = addDays(today, -daysAgo);

  const refresh = () => setReadings(vo2PointsBetween(addDays(today, -TUNABLES.vo2.trendWindowDays), today));

  const save = () => {
    if (value === null || value < MIN || value > MAX) {
      Alert.alert('Check the number', `VO2 max is in ml/kg/min and is usually between ${MIN} and ${MAX}.`);
      return;
    }
    setManualVo2(date, value);
    publishWidget();
    refresh();
    setValue(null);
    router.back();
  };

  const confirmDelete = (day: string) =>
    Alert.alert('Remove this reading?', formatShortDate(day), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          clearVo2(day);
          publishWidget();
          refresh();
        },
      },
    ]);

  return (
    <EditScreen title="VO2 max" onSave={save}>
      <Body dim>
        Garmin doesn&apos;t share VO2 max with {PHONE_HEALTH.name}, so it can&apos;t arrive on its own. Copy the number from Garmin Connect (Performance Stats → VO2 Max) whenever it
        changes; every few weeks is plenty, since the watch only updates it every few runs.
      </Body>

      <SectionLabel>New reading</SectionLabel>
      <NumberField decimal label="VO2 max (ml/kg/min)" value={value} onChange={setValue} placeholder="e.g. 45.3" />
      <Stepper
        label="Date"
        value={daysAgo}
        step={1}
        min={0}
        max={TUNABLES.vo2.trendWindowDays}
        format={(days) => (days === 0 ? 'Today' : formatShortDate(addDays(today, -days)))}
        onChange={setDaysAgo}
      />
      <Body dim>Older dates let you fill in past readings from Garmin Connect, so the trend has something to draw.</Body>

      <SectionLabel>Readings in the last {TUNABLES.vo2.trendWindowDays} days</SectionLabel>
      {readings.length === 0 ? (
        <Body dim>None yet.</Body>
      ) : (
        <RowGroup>
          {[...readings].reverse().map((r) => (
            <RowLink key={r.date} label={formatShortDate(r.date)} value={r.vo2Max.toFixed(1)} onPress={() => confirmDelete(r.date)} />
          ))}
        </RowGroup>
      )}
      {readings.length > 0 ? <Body dim>Tap a reading to remove it.</Body> : null}
      <View style={{ height: space.md }} />
    </EditScreen>
  );
}
