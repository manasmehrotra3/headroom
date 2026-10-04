import { router } from 'expo-router';

import { InjuriesForm } from '@/features/profile/ProfileForms';
import { useProfileEditor } from '@/features/profile/useProfileEditor';
import { EditScreen } from '@/features/settings/EditScreen';

export default function EditInjuries() {
  const editor = useProfileEditor(() => []);
  return (
    <EditScreen title="Injuries & niggles" errors={editor.errors} onSave={() => editor.save() && router.back()}>
      <InjuriesForm value={editor.draft} onChange={editor.update} />
    </EditScreen>
  );
}
