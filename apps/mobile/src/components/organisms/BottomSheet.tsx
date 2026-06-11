import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius } from '@/theme/tokens';
import { Font } from '@/theme/typography';

const SHEET_EASING = Easing.bezier(0.32, 0.72, 0, 1);

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Add-flow bottom sheet — scrim rgba(15,18,34,0.42) (tap closes), white sheet
 * radius 20/20/0/0, drag handle, slide-up 300ms cubic-bezier(0.32,0.72,0,1).
 */
export function BottomSheet({ title, onClose, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ position: 'absolute', inset: 0, zIndex: 50 }}>
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={{ position: 'absolute', inset: 0, backgroundColor: Colors.scrim }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}
        pointerEvents="box-none"
      >
        <Animated.View
          entering={SlideInDown.duration(300).easing(SHEET_EASING)}
          exiting={SlideOutDown.duration(250).easing(SHEET_EASING)}
          style={{
            backgroundColor: Colors.canvas,
            borderTopLeftRadius: Radius.sheet,
            borderTopRightRadius: Radius.sheet,
            paddingTop: 10,
            paddingHorizontal: 24,
            paddingBottom: 26 + insets.bottom,
            maxHeight: '88%',
          }}
        >
          <View
            style={{
              width: 40,
              height: 5,
              borderRadius: Radius.pill,
              backgroundColor: Colors.dashed,
              alignSelf: 'center',
            }}
          />
          <Text style={{ fontFamily: Font.extrabold, fontSize: 19, color: Colors.textPrimary, marginTop: 18, marginBottom: 16 }}>
            {title}
          </Text>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}
