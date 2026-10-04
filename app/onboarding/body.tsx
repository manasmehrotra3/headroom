import { validateBody } from '@/domain/profile';
import { OnboardingStep } from '@/features/onboarding/OnboardingStep';
import { BodyForm } from '@/features/profile/ProfileForms';
import { useOnboardingDraft } from '@/stores/onboardingDraft';

export default function BodyStep() {
  const profile = useOnboardingDraft((state) => state.profile);
  const updateProfile = useOnboardingDraft((state) => state.updateProfile);

  return (
    <OnboardingStep step="body" title="Body & goals" validate={() => validateBody(profile)}>
      <BodyForm value={profile} onChange={updateProfile} />
    </OnboardingStep>
  );
}
