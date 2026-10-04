import { OnboardingStep } from '@/features/onboarding/OnboardingStep';
import { ScheduleForm } from '@/features/training/TrainingForms';
import { useOnboardingDraft } from '@/stores/onboardingDraft';

export default function ScheduleStep() {
  const schedule = useOnboardingDraft((state) => state.schedule);
  const setSchedule = useOnboardingDraft((state) => state.setSchedule);

  // Schedule warnings are advice, not errors: an unusual week is still allowed.
  return (
    <OnboardingStep step="schedule" title="Weekly schedule">
      <ScheduleForm value={schedule} onChange={setSchedule} />
    </OnboardingStep>
  );
}
