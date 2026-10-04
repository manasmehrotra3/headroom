import { Tabs } from 'expo-router';

import { FloatingTabBar } from '@/features/navigation/FloatingTabBar';
import { colors } from '@/ui/theme';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="train" options={{ title: 'Train' }} />
      <Tabs.Screen name="food" options={{ title: 'Food' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
      {/* Not a visible tab: opened from the gear in each screen's header. */}
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
