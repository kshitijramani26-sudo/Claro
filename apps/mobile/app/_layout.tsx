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
import * as Updates from 'expo-updates';

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
  const [updatesChecked, setUpdatesChecked] = useState(false);
  const phase = useAppStore((s) => s.phase);
  const obStep = useAppStore((s) => s.obStep);

  useEffect(() => {
    let active = true;

    // Safety fallback: if checking for updates takes > 3 seconds, let the app start anyway
    const timer = setTimeout(() => {
      if (active) {
        console.log('Update check safety timeout triggered');
        setUpdatesChecked(true);
      }
    }, 3000);

    async function checkUpdates() {
      try {
        if (!__DEV__) {
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            await Updates.fetchUpdateAsync();
            await Updates.reloadAsync();
            return;
          }
        }
      } catch (e) {
        console.log('Update check failed:', e);
      } finally {
        clearTimeout(timer);
        if (active) {
          setUpdatesChecked(true);
        }
      }
    }
    checkUpdates();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    let active = true;

    // Safety fallback: if session check takes > 4 seconds, let the app start anyway
    const timer = setTimeout(() => {
      if (active) {
        console.log('Session check safety timeout triggered');
        setSessionChecked(true);
      }
    }, 4000);

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
            console.error('getBusiness failed in checkSession:', e);
            if (e instanceof ApiError) {
              if (e.status === 404 && e.code === 'no_business') {
                // Verified phone number, but did not finish onboarding setup
                useAppStore.getState().setPhase('onboarding');
                useAppStore.getState().setObStep(3);
              } else if (e.status === 401 || e.status === 403) {
                // Token is explicitly invalid/expired (e.g. 401 Unauthorized), logout cleanly
                await signOut();
              } else {
                // Other server errors (500, etc.) - keep session, let the app load
                useAppStore.getState().setPhase('app');
              }
            } else {
              // Network/timeout error - keep session, let the app load
              useAppStore.getState().setPhase('app');
            }
          }
        }
      } catch (err) {
        console.error('Session checking failed:', err);
      } finally {
        clearTimeout(timer);
        if (active) {
          setSessionChecked(true);
        }
      }
    }
    checkSession();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded && sessionChecked && updatesChecked) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, sessionChecked, updatesChecked]);

  if (!fontsLoaded || !sessionChecked || !updatesChecked) return null;

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

