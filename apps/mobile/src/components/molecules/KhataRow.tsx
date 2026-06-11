import { Text, View } from 'react-native';
import { Card } from '@/components/atoms/Card';
import { Avatar } from '@/components/atoms/Avatar';
import { Money } from '@/components/atoms/Money';
import { Tap } from '@/components/atoms/Tap';
import { OutlineButton } from '@/components/atoms/Button';
import { WhatsAppIcon } from '@/components/atoms/WhatsAppIcon';
import type { KhataCustomer } from '@/data/types';
import { Colors } from '@/theme/tokens';
import { Font } from '@/theme/typography';

interface Props {
  customer: KhataCustomer;
  accent: string;
  tile: string;
  onPress: () => void;
  onSettle: () => void;
  onRemind: () => void;
}

/** Khata customer card — avatar, outstanding in red, Settle Up + WhatsApp Remind. */
export function KhataRow({ customer, accent, tile, onPress, onSettle, onRemind }: Props) {
  return (
    <Tap onPress={onPress}>
      <Card pad={18}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
          <Avatar initials={customer.initials} size={46} bg={tile} color={accent} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: Font.bold, fontSize: 16, color: Colors.textPrimary }}>{customer.name}</Text>
            <Text style={{ fontFamily: Font.medium, fontSize: 12.5, color: Colors.textSecondary, marginTop: 2 }}>
              Updated {customer.updated}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Money
              value={customer.amount}
              style={{
                fontFamily: Font.extrabold,
                fontSize: 19,
                letterSpacing: -0.3,
                color: Colors.danger,
                fontVariant: ['tabular-nums'],
              }}
            />
            <Text style={{ fontFamily: Font.semibold, fontSize: 11, color: Colors.textMuted, marginTop: 1 }}>
              outstanding
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <OutlineButton label="Settle Up" icon="paid" iconColor={accent} height={40} onPress={onSettle} style={{ flex: 1, borderRadius: 9 }} />
          <OutlineButton label="Remind" iconNode={<WhatsAppIcon size={17} />} height={40} onPress={onRemind} style={{ flex: 1, borderRadius: 9 }} />
        </View>
      </Card>
    </Tap>
  );
}
