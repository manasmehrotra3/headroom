import { Stack } from 'expo-router';

import { colors, gradient } from '@/ui/theme';

export default function RideLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: gradient.top },
        headerTintColor: colors.text,
        // iOS otherwise labels the back button with the previous route's name, e.g. "(tabs)".
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
