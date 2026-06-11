import { useState, type ReactNode } from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Tap } from './Tap';
import { Sym } from './Icon';
import type { SymbolName } from '@/lib/icons';
import { Colors, Radius, ctaShadow } from '@/theme/tokens';
import { Font } from '@/theme/typography';
import { useBrand } from '@/state/store';

interface PrimaryProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  icon?: SymbolName;
  /** Render the icon node yourself (e.g. WhatsApp SVG). */
  iconNode?: ReactNode;
  height?: number;
  shadow?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Brand primary button — 54px, radius 11, white 16/700; pressed = brandPress; disabled = #C7C9D9. */
export function PrimaryButton({ label, onPress, disabled, icon, iconNode, height = 54, shadow, style }: PrimaryProps) {
  const brand = useBrand();
  const [pressed, setPressed] = useState(false);
  const bg = disabled ? Colors.disabled : pressed ? brand.press : brand.brand;
  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      android_ripple={!disabled ? { color: '#e0e0e0' } : undefined}
      style={[
        {
          height,
          borderRadius: Radius.btn,
          backgroundColor: bg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        },
        shadow && !disabled ? ctaShadow(brand.brand) : null,
        style,
      ]}
    >
      {iconNode ?? (icon ? <Sym name={icon} size={22} color="#FFFFFF" /> : null)}
      <Text style={{ fontFamily: Font.bold, fontSize: 16, color: '#FFFFFF' }}>{label}</Text>
    </Tap>
  );
}

interface OutlineProps {
  label: string;
  onPress?: () => void;
  icon?: SymbolName;
  iconColor?: string;
  iconNode?: ReactNode;
  height?: number;
  fontSize?: number;
  style?: StyleProp<ViewStyle>;
}

/** Outline button — white bg, 1.5px #E7E9F2 border, #0F1222 text. */
export function OutlineButton({ label, onPress, icon, iconColor, iconNode, height = 50, fontSize = 13.5, style }: OutlineProps) {
  return (
    <Tap
      onPress={onPress}
      style={[
        {
          height,
          borderRadius: Radius.btnSm,
          borderWidth: 1.5,
          borderColor: Colors.border,
          backgroundColor: Colors.canvas,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
        },
        style,
      ]}
    >
      {iconNode ?? (icon ? <Sym name={icon} size={17} color={iconColor ?? Colors.textPrimary} /> : null)}
      <Text style={{ fontFamily: Font.bold, fontSize, color: Colors.textPrimary }}>{label}</Text>
    </Tap>
  );
}

/** 38×38 square icon button (overlay close / back). */
export function HeaderIconButton({ icon, onPress }: { icon: SymbolName; onPress?: () => void }) {
  return (
    <Tap
      onPress={onPress}
      style={{
        width: 38,
        height: 38,
        borderRadius: Radius.tile,
        backgroundColor: Colors.chipBg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Sym name={icon} size={22} color={Colors.textPrimary} />
    </Tap>
  );
}

/** Spacer-aligned row of two equal action buttons. */
export function ButtonRow({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: 10 }}>{children}</View>;
}
