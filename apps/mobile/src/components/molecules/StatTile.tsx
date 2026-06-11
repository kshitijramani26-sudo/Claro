import { Text, View } from 'react-native';
import { Card } from '@/components/atoms/Card';
import { IconTile } from '@/components/atoms/IconTile';
import type { SymbolName } from '@/lib/icons';
import { Colors } from '@/theme/tokens';
import { Font, tnum } from '@/theme/typography';

interface Props {
  icon: SymbolName;
  tileBg: string;
  tileFg: string;
  value: string;
  label: string;
}

/** Mini stat card — 32×32 tile, 20/800 number, 11/500 label. */
export function StatTile({ icon, tileBg, tileFg, value, label }: Props) {
  return (
    <Card style={{ flex: 1, paddingVertical: 15, paddingHorizontal: 13 }}>
      <IconTile name={icon} bg={tileBg} fg={tileFg} size={32} iconSize={18} />
      <Text
        style={[
          { fontFamily: Font.extrabold, fontSize: 20, letterSpacing: -0.4, color: Colors.textPrimary, marginTop: 10 },
          tnum,
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text style={{ fontFamily: Font.medium, fontSize: 11, color: Colors.textSecondary, marginTop: 2 }}>{label}</Text>
    </Card>
  );
}
