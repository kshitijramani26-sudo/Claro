import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sym } from '@/components/atoms/Icon';
import { PinnedCTA } from '@/components/organisms/PinnedCTA';
import { Colors } from '@/theme/tokens';
import { Font } from '@/theme/typography';
import { useAppStore } from '@/state/store';

/** Step 5 — success. "Enter Claro" flips phase to app. */
export default function Success() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const form = useAppStore((s) => s.form);
  const business = useAppStore((s) => s.business);
  const setPhase = useAppStore((s) => s.setPhase);

  const firstName = (business?.owner || form.owner || 'there').split(' ')[0];
  const shopName = business?.name || form.shop || 'Your shop';

  return (
    <View style={{ flex: 1, backgroundColor: Colors.canvas, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        entering={ZoomIn.duration(500)}
        style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: Colors.successTile,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Sym name="check_circle" size={54} color={Colors.success} />
      </Animated.View>
      <Text
        style={{
          fontFamily: Font.extrabold,
          fontSize: 28,
          letterSpacing: -0.6,
          color: Colors.textPrimary,
          marginTop: 26,
          textAlign: 'center',
          paddingHorizontal: 30,
        }}
      >
        You're all set, {firstName}
      </Text>
      <Text
        style={{
          fontFamily: Font.medium,
          fontSize: 15,
          color: Colors.textSecondary,
          marginTop: 10,
          textAlign: 'center',
          paddingHorizontal: 40,
          lineHeight: 22,
        }}
      >
        {shopName} is ready. Let's make your first sale.
      </Text>
      <PinnedCTA
        label="Enter Claro"
        pageBg={Colors.canvas}
        bottomInset={insets.bottom}
        onPress={() => {
          setPhase('app');
          router.replace('/(tabs)');
        }}
      />
    </View>
  );
}
