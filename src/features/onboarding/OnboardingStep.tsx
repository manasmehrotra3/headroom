import { router, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';

import { Body, Button, ErrorList, Screen, Title } from '@/ui/components';

export const ONBOARDING_STEPS = ['body', 'running', 'diet', 'injuries', 'equipment', 'schedule', 'routine'] as const;
type Step = (typeof ONBOARDING_STEPS)[number];

/**
 * Frame for one onboarding step: progress, title, and a Next button that validates first.
 * On the last step `validate` should also save; the app then switches to the main tabs by itself.
 */
export function OnboardingStep({
  step,
  title,
  subtitle,
  validate,
  children,
}: {
  step: Step;
  title: string;
  subtitle?: string;
  validate?: () => string[];
  children: ReactNode;
}) {
  const [errors, setErrors] = useState<string[]>([]);
  const index = ONBOARDING_STEPS.indexOf(step);
  const isLast = index === ONBOARDING_STEPS.length - 1;

  const next = () => {
    const problems = validate?.() ?? [];
    setErrors(problems);
    if (problems.length === 0 && !isLast) {
      router.push(`/onboarding/${ONBOARDING_STEPS[index + 1]}` as Href);
    }
  };

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <>
          <ErrorList errors={errors} />
          <Button label={isLast ? 'Finish' : 'Next'} onPress={next} />
        </>
      }
    >
      <Body dim>
        Step {index + 1} of {ONBOARDING_STEPS.length}
      </Body>
      <Title subtitle={subtitle}>{title}</Title>
      {children}
    </Screen>
  );
}
