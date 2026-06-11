import { Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { Sym } from '@/components/atoms/Icon';
import { Colors, Radius, Shadows } from '@/theme/tokens';
import { Font } from '@/theme/typography';
import { useAppStore } from '@/state/store';

/** Global toast — one at a time, 2200ms (timer lives in the store). */
export function Toast() {
  const toast = useAppStore((s) => s.toast);
  if (!toast) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 96, zIndex: 60, alignItems: 'center' }}>
      <Animated.View
        entering={FadeInDown.duration(250)}
        exiting={FadeOut.duration(150)}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 9,
            backgroundColor: Colors.textPrimary,
            paddingVertical: 13,
            paddingHorizontal: 20,
            borderRadius: Radius.btn,
            maxWidth: '88%',
          },
          Shadows.toast,
        ]}
      >
        <Sym name="check_circle" size={19} color={Colors.successSoft} />
        <Text numberOfLines={1} style={{ fontFamily: Font.semibold, fontSize: 13.5, color: '#FFFFFF' }}>
          {toast}
        </Text>
      </Animated.View>
    </View>
  );
}
