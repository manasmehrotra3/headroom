import { useState } from 'react';

import { loadProfile, saveProfile } from '@/db/repos/profileRepo';
import { draftToProfile, type ProfileDraft } from '@/domain/profile';

/**
 * Local copy of the saved profile for a Settings screen.
 * `save()` validates this screen's section, writes the whole profile, and returns true on success.
 */
export function useProfileEditor(validate: (draft: ProfileDraft) => string[]) {
  // Settings is only reachable after onboarding, so the profile row exists.
  const [draft, setDraft] = useState<ProfileDraft>(() => loadProfile()!);
  const [errors, setErrors] = useState<string[]>([]);

  const update = (changes: Partial<ProfileDraft>) => setDraft((current) => ({ ...current, ...changes }));

  const save = (): boolean => {
    const problems = validate(draft);
    setErrors(problems);
    if (problems.length > 0) return false;

    const profile = draftToProfile(draft);
    if (!profile) {
      setErrors(['Another section of your profile has a problem. Check Body, Running and Routine.']);
      return false;
    }
    saveProfile(profile);
    return true;
  };

  return { draft, update, errors, save };
}
