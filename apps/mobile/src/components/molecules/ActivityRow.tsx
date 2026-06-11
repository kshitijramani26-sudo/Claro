import { Text, View } from 'react-native';
import { IconTile } from '@/components/atoms/IconTile';
import { Money } from '@/components/atoms/Money';
import type { Activity } from '@/data/types';
import type { SymbolName } from '@/lib/icons';
import { Colors, KindTiles } from '@/theme/tokens';
import { Font, Type } from '@/theme/typography';

const KIND_ICON: Record<Activity['kind'], SymbolName> = {
  sale: 'point_of_sale',
  credit: 'account_balance_wallet',
  settle: 'check_circle',
};

/** Feed row — kind tile, title/sub, right-aligned amount (credit = red, + prefix). */
export function ActivityRow({ item, last }: { item: Activity; last?: boolean }) {
  const tile = KindTiles[item.kind];
  const isCredit = item.kind === 'credit';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 13,
        paddingVertical: 14,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: Colors.divider,
      }}
    >
      <IconTile name={KIND_ICON[item.kind]} bg={tile.bg} fg={tile.fg} size={40} iconSize={21} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: Font.bold, fontSize: 14.5, color: Colors.textPrimary }}>{item.title}</Text>
        <Text style={{ fontFamily: Font.medium, fontSize: 12.5, color: Colors.textSecondary, marginTop: 2 }}>
          {item.sub} · {item.time}
        </Text>
      </View>
      <Money
        value={item.amount}
        prefix={isCredit ? '+' : ''}
        style={[Type.listMoney, { color: isCredit ? Colors.danger : Colors.textPrimary }]}
      />
    </View>
  );
}
