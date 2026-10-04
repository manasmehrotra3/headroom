import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { colors, font, space } from '@/ui/theme';

/** Reached only by a bad deep link, e.g. a notification pointing at a screen that has moved. */
export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl, backgroundColor: colors.background }}>
        <Text style={{ color: colors.text, fontSize: font.large, fontWeight: '600' }}>That screen doesn't exist.</Text>
        <Link href="/" style={{ color: colors.accent, fontSize: font.body }}>
          Go to Today
        </Link>
      </View>
    </>
  );
}
