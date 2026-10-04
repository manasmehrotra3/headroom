import { eq } from 'drizzle-orm';
import { router } from 'expo-router';
import { useState } from 'react';

import { db } from '@/db/client';
import { loadSettings } from '@/db/repos/profileRepo';
import { settings } from '@/db/schema';
import { DietForm } from '@/features/profile/ProfileForms';
import { useProfileEditor } from '@/features/profile/useProfileEditor';
import { EditScreen } from '@/features/settings/EditScreen';
import { Body, Chips, SectionLabel } from '@/ui/components';

const YES_NO = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
] as const;

export default function EditDiet() {
  const editor = useProfileEditor(() => []);
  const [cookOnce, setCookOnce] = useState(() => loadSettings().cookOnce);

  return (
    <EditScreen
      title="Diet"
      errors={editor.errors}
      onSave={() => {
        if (!editor.save()) return;
        db.update(settings).set({ cookOnce }).where(eq(settings.id, 1)).run();
        router.back();
      }}
    >
      <DietForm value={editor.draft} onChange={editor.update} />

      <SectionLabel>Cook once, eat twice</SectionLabel>
      <Chips options={YES_NO} selected={[cookOnce ? 'yes' : 'no']} onToggle={(id) => setCookOnce(id === 'yes')} />
      <Body dim>
        {'\n'}Plans the same dinner two evenings running, so you cook on alternate days and eat the leftovers in between. The grocery list
        still buys for both portions. Regenerate the meal plan after changing this.
      </Body>
    </EditScreen>
  );
}
