import { router } from 'expo-router';

import { validateBody } from '@/domain/profile';
import { BodyForm } from '@/features/profile/ProfileForms';
import { useProfileEditor } from '@/features/profile/useProfileEditor';
import { EditScreen } from '@/features/settings/EditScreen';

export default function EditBody() {
  const editor = useProfileEditor(validateBody);
  return (
    <EditScreen title="Body & goals" errors={editor.errors} onSave={() => editor.save() && router.back()}>
      <BodyForm value={editor.draft} onChange={editor.update} weightLabel="Starting weight (lb)" />
    </EditScreen>
  );
}
