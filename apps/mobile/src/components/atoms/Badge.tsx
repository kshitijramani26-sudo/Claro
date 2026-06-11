import { Text, View } from 'react-native';
import { Sym } from './Icon';
import type { SymbolName } from '@/lib/icons';
import { Font } from '@/theme/typography';

interface Props {
  label: string;
  bg: string;
  fg: string;
  icon?: SymbolName;
  fontSize?: number;
  radius?: number;
}

/** Status chip (Low stock, Present, Absent, delta %). */
export function Badge({ label, bg, fg, icon, fontSize = 12, radius = 8 }: Props) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: bg,
        paddingVertical: 4,
        paddingHorizontal: 9,
        borderRadius: radius,
        alignSelf: 'flex-start',
      }}
    >
      {icon ? <Sym name={icon} size={fontSize + 2} color={fg} /> : null}
      <Text style={{ fontFamily: Font.bold, fontSize, color: fg }}>{label}</Text>
    </View>
  );
}
