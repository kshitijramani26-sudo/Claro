import type { ReactNode } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  hitSlop?: number;
  android_ripple?: any;
}

/** Pressable with the handoff tap feedback: scale(0.97), 150ms ease. */
export function Tap({ onPress, onPressIn, onPressOut, disabled, style, children, hitSlop, android_ripple }: Props) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      disabled={disabled}
      hitSlop={hitSlop}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(0.97, { duration: 150, easing: Easing.ease });
        onPressIn?.();
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 150, easing: Easing.ease });
        onPressOut?.();
      }}
      android_ripple={android_ripple}
      style={[animated, style]}
    >
      {children}
    </AnimatedPressable>
  );
}
