import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import Animated, { Easing, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderIconButton } from '@/components/atoms/Button';
import type { SymbolName } from '@/lib/icons';
import { Colors } from '@/theme/tokens';
import { Font } from '@/theme/typography';

const SHEET_EASING = Easing.bezier(0.32, 0.72, 0, 1);

interface Props {
  title: string;
  onClose: () => void;
  closeIcon?: SymbolName;
  /** Page background behind the content. */
  bg: string;
  children: ReactNode;
  /** Fixed footer below the scroll area (white, top border). */
  footer?: ReactNode;
}

/** Full-screen overlay — slides up 280ms, white header with close/back, hides nav underneath. */
export function OverlayShell({ title, onClose, closeIcon = 'close', bg, children, footer }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Animated.View
      entering={SlideInDown.duration(280).easing(SHEET_EASING)}
      style={{ position: 'absolute', inset: 0, zIndex: 50, backgroundColor: bg }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View
          style={{
            paddingTop: insets.top + 8,
            paddingHorizontal: 20,
            paddingBottom: 14,
            backgroundColor: Colors.canvas,
            borderBottomWidth: 1,
            borderBottomColor: Colors.navBorder,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <HeaderIconButton icon={closeIcon} onPress={onClose} />
          <Text style={{ fontFamily: Font.extrabold, fontSize: 18, color: Colors.textPrimary }}>{title}</Text>
        </View>
        <View style={{ flex: 1 }}>{children}</View>
        {footer ? (
          <View
            style={{
              backgroundColor: Colors.canvas,
              borderTopWidth: 1,
              borderTopColor: Colors.navBorder,
              paddingHorizontal: 20,
              paddingTop: 14,
              paddingBottom: 18 + insets.bottom,
            }}
          >
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </Animated.View>
  );
}
