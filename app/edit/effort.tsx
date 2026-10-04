import { eq } from 'drizzle-orm';
import { router } from 'expo-router';
import { useState } from 'react';

import { db } from '@/db/client';
import { loadSettings } from '@/db/repos/profileRepo';
import { settings } from '@/db/schema';
import { EditScreen } from '@/features/settings/EditScreen';
import { Body, Chips, SectionLabel } from '@/ui/components';

const OPTIONS = [
  { id: 'rpe', label: 'RPE (6–10)' },
  { id: 'rir', label: 'Reps in reserve (0–4)' },
] as const;

export default function EffortSettings() {
  const [scale, setScale] = useState<'rpe' | 'rir'>(() => loadSettings().effortScale);
  return (
    <EditScreen
      title="Effort scale"
      onSave={() => {
        db.update(settings).set({ effortScale: scale }).where(eq(settings.id, 1)).run();
        router.back();
      }}
    >
      <SectionLabel>How to rate each set</SectionLabel>
      <Chips options={OPTIONS} selected={[scale]} onToggle={setScale} />
      <Body dim>{'\n'}RPE 8 means two reps left in the tank; RIR 2 is the same thing. Progression uses RPE ≤ 8 (RIR ≥ 2) at the top of the rep range as the signal to add weight.</Body>
    </EditScreen>
  );
}
