import { Text, View } from 'react-native';
import { IconTile } from '@/components/atoms/IconTile';
import { Money } from '@/components/atoms/Money';
import { Badge } from '@/components/atoms/Badge';
import { Sym } from '@/components/atoms/Icon';
import { Tap } from '@/components/atoms/Tap';
import type { InventoryItem } from '@/data/types';
import { Colors } from '@/theme/tokens';
import { Font, tnum } from '@/theme/typography';

/** Inventory list row — neutral tile, qty turns amber + "Low stock" badge when low.
 *  Untracked (catalogue-only) items show a "Custom item" hint instead of a quantity. */
export function InventoryRow({ item, last, onPress, onDelete }: { item: InventoryItem; last?: boolean; onPress?: () => void; onDelete?: () => void }) {
  return (
    <Tap
      onPress={onPress}
      disabled={!onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 13,
        paddingVertical: 14,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: Colors.divider,
      }}
    >
      <IconTile name="inventory_2" bg={Colors.neutralTile} fg={Colors.textSecondary} size={42} iconSize={21} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: Font.bold, fontSize: 15, color: Colors.textPrimary }} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
          {item.tracked ? (
            <>
              <Text style={[{ fontFamily: Font.semibold, fontSize: 12.5, color: item.low ? Colors.warning : Colors.textPrimary }, tnum]}>
                {item.qty} in stock
              </Text>
              {item.low ? <Badge label="Low stock" bg={Colors.warningTile2} fg={Colors.warning} fontSize={11} radius={7} /> : null}
            </>
          ) : (
            <Text style={{ fontFamily: Font.semibold, fontSize: 12.5, color: Colors.textMuted }}>Custom item · no stock</Text>
          )}
        </View>
      </View>
      <Money value={item.price} style={[{ fontFamily: Font.extrabold, fontSize: 16, color: Colors.textPrimary }, tnum]} />
      {onDelete ? (
        <Tap onPress={onDelete} hitSlop={8} style={{ paddingLeft: 6 }}>
          <Sym name="delete" size={20} color={Colors.textMuted} />
        </Tap>
      ) : null}
    </Tap>
  );
}
