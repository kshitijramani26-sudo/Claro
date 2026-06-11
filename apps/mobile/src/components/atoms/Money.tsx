import { Text, type StyleProp, type TextStyle } from 'react-native';
import { formatINR, formatINRShort } from '@/lib/format';

interface Props {
  value: number;
  /** Compact lakh format (₹1.42L) instead of full (₹1,42,300). */
  short?: boolean;
  prefix?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

/** Money text — always tabular numerals, formatted at the display edge only. */
export function Money({ value, short, prefix = '', style, numberOfLines }: Props) {
  return (
    <Text numberOfLines={numberOfLines} style={[{ fontVariant: ['tabular-nums'] }, style]}>
      {prefix + (short ? formatINRShort(value) : formatINR(value))}
    </Text>
  );
}
