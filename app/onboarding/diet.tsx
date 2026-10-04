import { OnboardingStep } from '@/features/onboarding/OnboardingStep';
import { DietForm } from '@/features/profile/ProfileForms';
import { useOnboardingDraft } from '@/stores/onboardingDraft';

export default function DietStep() {
  const profile = useOnboardingDraft((state) => state.profile);
  const updateProfile = useOnboardingDraft((state) => state.updateProfile);

  return (
    <OnboardingStep step="diet" title="Diet">
      <DietForm value={profile} onChange={updateProfile} />
    </OnboardingStep>
  );
}
