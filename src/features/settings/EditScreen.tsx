import { Stack } from 'expo-router';
import type { ReactNode } from 'react';

import { Button, ErrorList, Screen } from '@/ui/components';

/** Frame for a Settings edit screen: header title, the form, and a Save button in thumb reach. */
export function EditScreen({
  title,
  errors = [],
  onSave,
  children,
}: {
  title: string;
  errors?: string[];
  onSave: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <Stack.Screen options={{ title }} />
      <Screen
        edges={['bottom']}
        footer={
          <>
            <ErrorList errors={errors} />
            <Button label="Save" onPress={onSave} />
          </>
        }
      >
        {children}
      </Screen>
    </>
  );
}
