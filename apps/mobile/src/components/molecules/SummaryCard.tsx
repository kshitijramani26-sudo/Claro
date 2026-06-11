import { Text, View } from 'react-native';
import { Card } from '@/components/atoms/Card';
import { IconTile } from '@/components/atoms/IconTile';
import { Money } from '@/components/atoms/Money';
import { Badge } from '@/components/atoms/Badge';
import type { SymbolName } from '@/lib/icons';
import { Colors, Radius } from '@/theme/tokens';
import { Font, Type } from '@/theme/typography';

interface Props {
  icon: SymbolName;
  tileBg: string;
  tileFg: string;
  label: string;
  value: number;
  valueColor?: string;
  sub: string;
  /** Green delta chip, e.g. "▲ 12%". */
  delta?: string;
  children?: React.ReactNode;
}

/** Hero money card (Today's Sales, Net P&L, Stock value) — radius 16, padding 22-24. */
export function SummaryCard({ icon, tileBg, tileFg, label, value, valueColor, sub, delta, children }: Props) {
  return (
    <Card radius={Radius.hero} pad={22}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
          <IconTile name={icon} bg={tileBg} fg={tileFg} size={40} iconSize={22} radius={Radius.btn} />
          <Text style={Type.cardLabel}>{label}</Text>
        </View>
        {delta ? <Badge label={delta} bg={Colors.successTile} fg={Colors.success} /> : null}
      </View>
      <Money value={value} style={[Type.heroMoney, { marginTop: 14 }, valueColor ? { color: valueColor } : null]} />
      <Text style={{ fontFamily: Font.medium, fontSize: 13, color: Colors.textSecondary, marginTop: 6 }}>{sub}</Text>
      {children}
    </Card>
  );
}
