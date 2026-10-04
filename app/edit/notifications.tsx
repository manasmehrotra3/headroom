import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { loadSettings, saveNotificationTime } from '@/db/repos/profileRepo';
import { db } from '@/db/client';
import { settings } from '@/db/schema';
import { formatTimeOfDay, formatTimeOfDay12h, parseTimeOfDay } from '@/domain/dates';
import { EditScreen } from '@/features/settings/EditScreen';
import { eveningPreviewLine, morningDigestLine, scheduleDailyNotifications } from '@/sync/digest';
import { ensureNotificationPermission } from '@/sync/notifications';
import { Body, Chips, SectionLabel, Stepper } from '@/ui/components';
import { colors, font } from '@/ui/theme';
import { eq } from 'drizzle-orm';

const ON_OFF = [
  { id: 'on', label: 'On' },
  { id: 'off', label: 'Off' },
] as const;

export default function NotificationSettings() {
  const [current] = useState(loadSettings);
  const [morning, setMorning] = useState(parseTimeOfDay(current.notificationTime) ?? 390);
  const [eveningOn, setEveningOn] = useState(current.eveningPreviewTime !== '');
  const [evening, setEvening] = useState(parseTimeOfDay(current.eveningPreviewTime) ?? 20 * 60);
  const [granted, setGranted] = useState<boolean | null>(null);

  const save = async () => {
    saveNotificationTime(formatTimeOfDay(morning));
    db.update(settings).set({ eveningPreviewTime: eveningOn ? formatTimeOfDay(evening) : '' }).where(eq(settings.id, 1)).run();
    const ok = await ensureNotificationPermission();
    setGranted(ok);
    await scheduleDailyNotifications();
    router.back();
  };

  return (
    <EditScreen title="Notifications" onSave={() => void save()}>
      <SectionLabel>Morning digest</SectionLabel>
      <Stepper label="Time" value={morning} step={15} min={4 * 60} max={11 * 60} format={formatTimeOfDay12h} onChange={setMorning} />
      <Body dim>Today it would say:</Body>
      <Text style={{ color: colors.text, fontSize: font.body, marginBottom: 12 }}>{morningDigestLine()}</Text>

      <SectionLabel>Evening preview of tomorrow</SectionLabel>
      <Chips options={ON_OFF} selected={[eveningOn ? 'on' : 'off']} onToggle={(id) => setEveningOn(id === 'on')} />
      {eveningOn ? <Stepper label="Time" value={evening} step={15} min={17 * 60} max={23 * 60} format={formatTimeOfDay12h} onChange={setEvening} /> : null}
      <Body dim>Tonight it would say:</Body>
      <Text style={{ color: colors.text, fontSize: font.body }}>{eveningPreviewLine()}</Text>
      {granted === false ? <Text style={{ color: colors.warning, fontSize: font.body }}>Notifications are blocked for this app in Android settings.</Text> : null}
    </EditScreen>
  );
}
