import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import Animated, { Easing, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { BottomNav } from '@/components/organisms/BottomNav';
import { api } from '@/lib/api';
import { PageThemes } from '@/theme/pageThemes';
import { useAppStore } from '@/state/store';

/** App shell — animated page background (300ms) + persistent custom bottom nav. */
export default function TabsLayout() {
  const tab = useAppStore((s) => s.tab);
  const business = useAppStore((s) => s.business);
  const setBusiness = useAppStore((s) => s.setBusiness);
  const bg = useAnimatedStyle(() => ({
    backgroundColor: withTiming(PageThemes[tab].bg, { duration: 300, easing: Easing.ease }),
  }), [tab]);

  // Safety net: ensure the business profile is cached (headers, invoice, profile).
  useEffect(() => {
    if (!business) {
      api.getBusiness().then(setBusiness).catch(() => undefined);
    }
  }, [business, setBusiness]);

  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={[StyleSheet.absoluteFill, bg]} />
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: 'transparent' },
          animation: 'none',
        }}
        tabBar={() => <BottomNav />}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="khata" />
        <Tabs.Screen name="stock" />
        <Tabs.Screen name="staff" />
        <Tabs.Screen name="analytics" />
      </Tabs>
    </View>
  );
}
