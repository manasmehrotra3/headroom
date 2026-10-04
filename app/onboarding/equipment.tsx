import { OnboardingStep } from '@/features/onboarding/OnboardingStep';
import { EquipmentForm } from '@/features/training/TrainingForms';
import { useOnboardingDraft } from '@/stores/onboardingDraft';

export default function EquipmentStep() {
  const equipment = useOnboardingDraft((state) => state.equipment);
  const setEquipment = useOnboardingDraft((state) => state.setEquipment);

  return (
    <OnboardingStep
      step="equipment"
      title="YMCA equipment"
      validate={() => (equipment.length === 0 ? ['Tick at least the equipment you can count on.'] : [])}
    >
      <EquipmentForm value={equipment} onChange={setEquipment} />
    </OnboardingStep>
  );
}
