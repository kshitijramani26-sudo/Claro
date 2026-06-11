import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { Sym } from '@/components/atoms/Icon';
import { Font } from '@/theme/typography';
import { useAppStore, useBrand } from '@/state/store';

/** Splash — brand gradient, tap anywhere to begin. */
export default function Splash() {
  const router = useRouter();
  const brand = useBrand();
  const setObStep = useAppStore((s) => s.setObStep);

  return (
    <Pressable
      style={{ flex: 1 }}
      onPress={() => {
        setObStep(1);
        router.push('/onboarding/mobile');
      }}
    >
      <LinearGradient
        colors={[brand.grad[0], brand.grad[1], brand.grad[2]]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.4, y: 1 }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        {/* Wordmark */}
        <Animated.View entering={ZoomIn.duration(600)} style={{ alignItems: 'center' }}>
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: 26,
              backgroundColor: 'rgba(255,255,255,0.14)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.22)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sym name="storefront" size={46} color="#FFFFFF" />
          </View>
          <Text style={{ fontFamily: Font.extrabold, fontSize: 46, letterSpacing: -1.5, color: '#FFFFFF', marginTop: 22 }}>
            Claro
          </Text>
          <Text style={{ fontFamily: Font.medium, fontSize: 15, color: 'rgba(255,255,255,0.72)', marginTop: 6 }}>
            Your shop, beautifully in order
          </Text>
        </Animated.View>

        {/* Footer */}
        <Animated.View
          entering={FadeIn.duration(1000).delay(400)}
          style={{ position: 'absolute', bottom: 52, flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <Text style={{ fontFamily: Font.semibold, fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
            Tap anywhere to begin
          </Text>
          <Sym name="arrow_forward" size={18} color="rgba(255,255,255,0.7)" />
        </Animated.View>
      </LinearGradient>
    </Pressable>
  );
}
