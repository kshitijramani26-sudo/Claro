import { useEffect, useState } from 'react';
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
import { loadSessionToken, signOut } from '@/lib/supabase';
import { setAuthToken, ApiError } from '@/lib/http';
import { api } from '@/lib/api';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const [sessionChecked, setSessionChecked] = useState(false);
  const phase = useAppStore((s) => s.phase);
  const obStep = useAppStore((s) => s.obStep);

  useEffect(() => {
    async function checkSession() {
      try {
        const token = await loadSessionToken();
        if (token) {
          setAuthToken(token);
          // Verify session by fetching business details
          try {
            const business = await api.getBusiness();
            useAppStore.getState().setBusiness(business);
            useAppStore.getState().setPhase('app');
          } catch (e) {
            if (e instanceof ApiError && e.status === 404 && e.code === 'no_business') {
              // Verified phone number, but did not finish onboarding setup
              useAppStore.getState().setPhase('onboarding');
              useAppStore.getState().setObStep(3);
            } else {
              // Token is invalid/expired (e.g. 401 Unauthorized), logout cleanly
              await signOut();
            }
          }
        }
      } catch (err) {
        console.error('Session checking failed:', err);
      } finally {
        setSessionChecked(true);
      }
    }
    checkSession();
  }, []);

  useEffect(() => {
    if (fontsLoaded && sessionChecked) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, sessionChecked]);

  if (!fontsLoaded || !sessionChecked) return null;

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
