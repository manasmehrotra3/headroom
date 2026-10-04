import { eq } from 'drizzle-orm';
import { router } from 'expo-router';
import { useState } from 'react';

import { db } from '@/db/client';
import { loadSettings, saveNotificationTime } from '@/db/repos/profileRepo';
import { settings } from '@/db/schema';
import { validateRoutine } from '@/domain/profile';
import { RoutineForm } from '@/features/profile/ProfileForms';
import { useProfileEditor } from '@/features/profile/useProfileEditor';
import { EditScreen } from '@/features/settings/EditScreen';
import { PHONE_HEALTH } from '@/sources/phoneHealth';
import { publishWidget } from '@/sync/widget';
import { Body, SectionLabel, Stepper } from '@/ui/components';

export default function EditRoutine() {
  const editor = useProfileEditor(validateRoutine);
  const [current] = useState(loadSettings);
  const [notificationTime, setNotificationTime] = useState(current.notificationTime);
  const [stepGoal, setStepGoal] = useState(current.stepGoal);

  return (
    <EditScreen
      title="Sleep & step goals"
      errors={editor.errors}
      onSave={() => {
        if (!editor.save()) return;
        saveNotificationTime(notificationTime);
        db.update(settings).set({ stepGoal }).where(eq(settings.id, 1)).run();
        publishWidget();
        router.back();
      }}
    >
      <RoutineForm
        notificationTime={notificationTime}
        onNotificationTime={setNotificationTime}
        sleepTargetMin={editor.draft.sleepTargetMin}
        onSleepTarget={(sleepTargetMin) => editor.update({ sleepTargetMin })}
      />

      <SectionLabel>Daily step goal</SectionLabel>
      <Stepper label="Steps" value={stepGoal} step={500} min={2000} max={25000} format={(v) => v.toLocaleString()} onChange={setStepGoal} />
      <Body dim>
        Shown on the Today screen and in the home and lock screen widget. Steps come from Garmin through {PHONE_HEALTH.name}, so the widget is as fresh as the last sync.
      </Body>
    </EditScreen>
  );
}
