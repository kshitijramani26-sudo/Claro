import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { OverlayHost } from '@/components/organisms/OverlayHost';
import { Toast } from '@/components/organisms/Toast';
import { PhoneStatusBar } from '@/components/organisms/PhoneStatusBar';
import { useAppStore } from '@/state/store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const phase = useAppStore((s) => s.phase);
  const obStep = useAppStore((s) => s.obStep);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PhoneStatusBar light={phase === 'onboarding' && obStep === 0} />
        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }} />
          <OverlayHost />
          <Toast />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
