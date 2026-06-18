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
  onSettleThank: () => void;
  onRemind: () => void;
}

const WA_GREEN = '#25D366';

/** Khata customer card — avatar, outstanding in red, Settle Up (+ 1-tap thank-you) + Remind. */
export function KhataRow({ customer, accent, tile, onPress, onSettle, onSettleThank, onRemind }: Props) {
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
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, alignItems: 'center' }}>
          <OutlineButton label="Settle Up" icon="paid" iconColor={accent} height={40} onPress={onSettle} style={{ flex: 1, borderRadius: 9 }} />
          {/* One tap: settle in full + open WhatsApp thank-you. */}
          <Tap
            onPress={onSettleThank}
            style={{
              width: 44, height: 40, borderRadius: 9, borderWidth: 1.5, borderColor: WA_GREEN,
              backgroundColor: `${WA_GREEN}14`, alignItems: 'center', justifyContent: 'center',
            }}
          >
            <WhatsAppIcon size={19} />
          </Tap>
          <OutlineButton label="Remind" iconNode={<WhatsAppIcon size={17} />} height={40} onPress={onRemind} style={{ flex: 1, borderRadius: 9 }} />
        </View>
      </Card>
    </Tap>
  );
}
