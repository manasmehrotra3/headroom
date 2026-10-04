import { router } from 'expo-router';
import { useState } from 'react';

import { loadSchedule, saveSchedule } from '@/db/repos/profileRepo';
import { EditScreen } from '@/features/settings/EditScreen';
import { ScheduleForm } from '@/features/training/TrainingForms';

export default function EditSchedule() {
  const [schedule, setSchedule] = useState(loadSchedule);

  return (
    <EditScreen
      title="Weekly schedule"
      onSave={() => {
        saveSchedule(schedule);
        router.back();
      }}
    >
      <ScheduleForm value={schedule} onChange={setSchedule} />
    </EditScreen>
  );
}
