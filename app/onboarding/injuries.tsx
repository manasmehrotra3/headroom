import { OnboardingStep } from '@/features/onboarding/OnboardingStep';
import { InjuriesForm } from '@/features/profile/ProfileForms';
import { useOnboardingDraft } from '@/stores/onboardingDraft';

export default function InjuriesStep() {
  const profile = useOnboardingDraft((state) => state.profile);
  const updateProfile = useOnboardingDraft((state) => state.updateProfile);

  return (
    <OnboardingStep step="injuries" title="Injuries & niggles">
      <InjuriesForm value={profile} onChange={updateProfile} />
    </OnboardingStep>
  );
}
