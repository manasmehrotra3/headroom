import { Tabs } from 'expo-router';
import { Easing } from 'react-native';

import { FloatingTabBar } from '@/features/navigation/FloatingTabBar';
import { colors } from '@/ui/theme';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: false,
        sceneStyle: { backgroundColor: colors.background },
        transitionSpec: {
          animation: 'timing',
          config: {
            duration: 240,
            easing: Easing.bezier(0.2, 0, 0, 1),
          },
        },
        sceneStyleInterpolator: ({ current }) => ({
          sceneStyle: {
            opacity: current.progress.interpolate({
              inputRange: [-1, -0.52, 0, 0.52, 1],
              outputRange: [0, 0, 1, 0, 0],
              extrapolate: 'clamp',
            }),
            transform: [
              {
                scale: current.progress.interpolate({
                  inputRange: [-1, -0.52, 0, 0.52, 1],
                  outputRange: [0.965, 0.965, 1, 0.965, 0.965],
                  extrapolate: 'clamp',
                }),
              },
            ],
          },
        }),
      }}
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
