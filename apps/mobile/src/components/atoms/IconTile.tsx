import { View } from 'react-native';
import { Sym } from './Icon';
import type { SymbolName } from '@/lib/icons';
import { Radius } from '@/theme/tokens';

interface Props {
  name: SymbolName;
  bg: string;
  fg: string;
  /** Tile edge: hero 40, mini-stat 32, list 40–42, kpi 38, empty-state 72. */
  size?: number;
  iconSize?: number;
  radius?: number;
}

/** Pastel-tinted square icon container. */
export function IconTile({ name, bg, fg, size = 40, iconSize = 22, radius = Radius.tile }: Props) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Sym name={name} size={iconSize} color={fg} />
    </View>
  );
}
