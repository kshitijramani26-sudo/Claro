import { Text } from 'react-native';
import { Card } from '@/components/atoms/Card';
import { IconTile } from '@/components/atoms/IconTile';
import type { SymbolName } from '@/lib/icons';
import { Colors, Radius } from '@/theme/tokens';
import { Font, tnum } from '@/theme/typography';

interface Props {
  icon: SymbolName;
  tileBg: string;
  tileFg: string;
  value: string;
  label: string;
  valueColor?: string;
}

/** Analytics KPI tile — 38×38 tile radius 11, 22/800 number, 12 label. */
export function KpiTile({ icon, tileBg, tileFg, value, label, valueColor }: Props) {
  return (
    <Card pad={16} style={{ flex: 1 }}>
      <IconTile name={icon} bg={tileBg} fg={tileFg} size={38} iconSize={20} radius={Radius.btn} />
      <Text
        style={[
          {
            fontFamily: Font.extrabold,
            fontSize: 22,
            letterSpacing: -0.4,
            color: valueColor ?? Colors.textPrimary,
            marginTop: 12,
          },
          tnum,
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text style={{ fontFamily: Font.medium, fontSize: 12, color: Colors.textSecondary, marginTop: 2 }}>{label}</Text>
    </Card>
  );
}
