import { MaterialIcons } from '@expo/vector-icons';
import type { StyleProp, TextStyle } from 'react-native';
import { SYMBOLS, type SymbolName } from '@/lib/icons';

interface Props {
  name: SymbolName;
  size?: number;
  color: string;
  style?: StyleProp<TextStyle>;
}

/** Material Symbol (design spec name) rendered via @expo/vector-icons MaterialIcons. */
export function Sym({ name, size = 22, color, style }: Props) {
  return <MaterialIcons name={SYMBOLS[name]} size={size} color={color} style={style} />;
}
