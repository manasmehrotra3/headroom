import { router } from 'expo-router';

import { validateRunning } from '@/domain/profile';
import { RunningForm } from '@/features/profile/ProfileForms';
import { useProfileEditor } from '@/features/profile/useProfileEditor';
import { EditScreen } from '@/features/settings/EditScreen';

export default function EditRunning() {
  const editor = useProfileEditor(validateRunning);
  return (
    <EditScreen title="Running & watch" errors={editor.errors} onSave={() => editor.save() && router.back()}>
      <RunningForm value={editor.draft} onChange={editor.update} />
    </EditScreen>
  );
}
