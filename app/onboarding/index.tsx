import { router } from 'expo-router';

import { Body, Button, Card, Screen, Title } from '@/ui/components';
import { DISCLAIMER } from '@/ui/disclaimer';

export default function Welcome() {
  return (
    <Screen edges={['top', 'bottom']} footer={<Button label="Get started" onPress={() => router.push('/onboarding/body')} />}>
      <Title subtitle="Lose fat steadily, run faster, get stronger.">Let's set you up</Title>
      <Card>
        <Body>
          A few quick questions: body and goals, running fitness, diet, anything to be careful with, the equipment at
          your YMCA, and your weekly schedule.
        </Body>
        <Body dim>Everything stays on this phone. You can change any answer later in Settings.</Body>
      </Card>
      <Card>
        <Body dim>{DISCLAIMER}</Body>
      </Card>
    </Screen>
  );
}
