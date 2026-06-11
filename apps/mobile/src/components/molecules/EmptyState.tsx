import { Text } from 'react-native';
import { Card } from '@/components/atoms/Card';
import { IconTile } from '@/components/atoms/IconTile';
import type { SymbolName } from '@/lib/icons';
import { Colors, Radius } from '@/theme/tokens';
import { Font } from '@/theme/typography';

interface Props {
  icon: SymbolName;
  tileBg: string;
  tileFg: string;
  title: string;
  sub: string;
}

/** Shared empty/no-match card — 72×72 tile, 19/800 title, 14 sub. */
export function EmptyState({ icon, tileBg, tileFg, title, sub }: Props) {
  return (
    <Card style={{ paddingVertical: 40, paddingHorizontal: 28, alignItems: 'center' }}>
      <IconTile name={icon} bg={tileBg} fg={tileFg} size={72} iconSize={38} radius={Radius.card} />
      <Text style={{ fontFamily: Font.extrabold, fontSize: 19, color: Colors.textPrimary, marginTop: 22 }}>{title}</Text>
      <Text
        style={{
          fontFamily: Font.medium,
          fontSize: 14,
          color: Colors.textSecondary,
          marginTop: 8,
          lineHeight: 21,
          textAlign: 'center',
        }}
      >
        {sub}
      </Text>
    </Card>
  );
}
