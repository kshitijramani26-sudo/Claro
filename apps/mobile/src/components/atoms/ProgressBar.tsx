import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Colors, Radius } from '@/theme/tokens';

interface Props {
  /** 0..1 */
  progress: number;
  color: string;
}

/** Onboarding step bar — 6px track #E7E9F2, fill animates 250ms ease. */
export function ProgressBar({ progress, color }: Props) {
  const pct = useSharedValue(progress);
  useEffect(() => {
    pct.value = withTiming(progress, { duration: 250, easing: Easing.ease });
  }, [progress, pct]);
  const fill = useAnimatedStyle(() => ({ width: `${pct.value * 100}%` }));
  return (
    <View style={{ height: 6, borderRadius: Radius.pill, backgroundColor: Colors.border, overflow: 'hidden' }}>
      <Animated.View style={[{ height: 6, borderRadius: Radius.pill, backgroundColor: color }, fill]} />
    </View>
  );
}
