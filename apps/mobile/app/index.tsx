import { Redirect } from 'expo-router';
import { useAppStore } from '@/state/store';

/** Gate: onboarding until "Enter Claro", then the 5-tab app. */
export default function Index() {
  const phase = useAppStore((s) => s.phase);
  return <Redirect href={phase === 'app' ? '/(tabs)' : '/onboarding'} />;
}
