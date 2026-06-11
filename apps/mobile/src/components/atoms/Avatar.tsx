import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Font } from '@/theme/typography';

interface Props {
  initials: string;
  size?: number;
  bg: string;
  color: string;
  fontSize?: number;
  style?: StyleProp<ViewStyle>;
}

/** Circular initials avatar. */
export function Avatar({ initials, size = 46, bg, color, fontSize = 15, style }: Props) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text style={{ fontFamily: Font.bold, fontSize, color }}>{initials}</Text>
    </View>
  );
}
