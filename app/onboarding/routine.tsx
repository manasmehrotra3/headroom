import { completeOnboarding } from '@/db/repos/profileRepo';
import { draftToProfile, validateRoutine } from '@/domain/profile';
import { OnboardingStep } from '@/features/onboarding/OnboardingStep';
import { RoutineForm } from '@/features/profile/ProfileForms';
import { useOnboardingDraft } from '@/stores/onboardingDraft';

export default function RoutineStep() {
  const draft = useOnboardingDraft();

  const finish = (): string[] => {
    const routineErrors = validateRoutine(draft.profile);
    if (routineErrors.length > 0) return routineErrors;

    const profile = draftToProfile(draft.profile);
    if (!profile) return ['Something earlier is missing. Go back and check each step.'];

    // Marks onboarding complete; the root layout then switches to the main tabs.
    completeOnboarding({
      profile,
      schedule: draft.schedule,
      equipment: draft.equipment,
      notificationTime: draft.notificationTime,
    });
    return [];
  };

  return (
    <OnboardingStep step="routine" title="Morning routine" validate={finish}>
      <RoutineForm
        notificationTime={draft.notificationTime}
        onNotificationTime={draft.setNotificationTime}
        sleepTargetMin={draft.profile.sleepTargetMin}
        onSleepTarget={(sleepTargetMin) => draft.updateProfile({ sleepTargetMin })}
      />
    </OnboardingStep>
  );
}
