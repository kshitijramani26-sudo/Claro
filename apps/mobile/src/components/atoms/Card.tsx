import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Colors, Radius, Shadows } from '@/theme/tokens';

interface Props {
  children?: ReactNode;
  /** Default 14 (standard card); pass Radius.hero (16) for hero cards. */
  radius?: number;
  pad?: number;
  style?: StyleProp<ViewStyle>;
}

/** White card with the global card shadow. */
export function Card({ children, radius = Radius.card, pad, style }: Props) {
  return (
    <View
      style={[
        { backgroundColor: Colors.canvas, borderRadius: radius, padding: pad },
        Shadows.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}
