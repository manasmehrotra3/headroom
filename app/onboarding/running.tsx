import { validateRunning } from '@/domain/profile';
import { OnboardingStep } from '@/features/onboarding/OnboardingStep';
import { RunningForm } from '@/features/profile/ProfileForms';
import { useOnboardingDraft } from '@/stores/onboardingDraft';

export default function RunningStep() {
  const profile = useOnboardingDraft((state) => state.profile);
  const updateProfile = useOnboardingDraft((state) => state.updateProfile);

  return (
    <OnboardingStep step="running" title="Running & watch" validate={() => validateRunning(profile)}>
      <RunningForm value={profile} onChange={updateProfile} />
    </OnboardingStep>
  );
}
