import { router } from 'expo-router';
import { useState } from 'react';

import { loadAvailableEquipment, saveEquipment } from '@/db/repos/profileRepo';
import { EquipmentForm } from '@/features/training/TrainingForms';
import { EditScreen } from '@/features/settings/EditScreen';

export default function EditEquipment() {
  const [available, setAvailable] = useState(loadAvailableEquipment);
  const errors = available.length === 0 ? ['Tick at least the equipment you can count on.'] : [];

  return (
    <EditScreen
      title="YMCA equipment"
      errors={errors}
      onSave={() => {
        if (errors.length > 0) return;
        saveEquipment(available);
        router.back();
      }}
    >
      <EquipmentForm value={available} onChange={setAvailable} />
    </EditScreen>
  );
}
