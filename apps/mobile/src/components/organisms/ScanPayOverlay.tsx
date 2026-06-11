import { Text, View } from 'react-native';
import Animated, { Easing, FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sym } from '@/components/atoms/Icon';
import { Tap } from '@/components/atoms/Tap';
import { Money } from '@/components/atoms/Money';
import { UpiQr } from '@/components/atoms/UpiQr';
import { HeaderIconButton } from '@/components/atoms/Button';
import { buildUpiUri } from '@/lib/upi';
import { Colors, Radius } from '@/theme/tokens';
import { Font, tnum } from '@/theme/typography';
import type { PaymentMethod } from '@/data/types';

const SHEET_EASING = Easing.bezier(0.32, 0.72, 0, 1);

interface Props {
  shopName: string;
  amountRupees: number;
  methods: PaymentMethod[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  /** Page background + accent of the billing theme. */
  bg: string;
  accent: string;
  tile: string;
}

/**
 * Full-screen "Scan & Pay" — a large UPI QR the customer scans to pay the exact
 * bill amount. The QR reflects the selected payment method and updates live when
 * a different method is chosen below (uploaded image as-is, else a generated
 * exact-amount upi:// QR).
 */
export function ScanPayOverlay({ shopName, amountRupees, methods, selectedId, onSelect, onClose, bg, accent, tile }: Props) {
  const insets = useSafeAreaInsets();
  const selected = methods.find((m) => m.id === selectedId) ?? methods.find((m) => m.isDefault) ?? methods[0] ?? null;
  const uri = selected
    ? buildUpiUri({ vpa: selected.upiId, payeeName: shopName, amountRupees, note: 'Bill payment' })
    : '';

  return (
    <Animated.View
      entering={SlideInDown.duration(280).easing(SHEET_EASING)}
      style={{ position: 'absolute', inset: 0, zIndex: 80, backgroundColor: bg }}
    >
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 14,
          backgroundColor: Colors.canvas,
          borderBottomWidth: 1,
          borderBottomColor: Colors.navBorder,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <HeaderIconButton icon="close" onPress={onClose} />
        <Text style={{ fontFamily: Font.extrabold, fontSize: 18, color: Colors.textPrimary }}>Scan &amp; Pay</Text>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 28, alignItems: 'center' }}>
        {/* Amount */}
        <Text style={{ fontFamily: Font.semibold, fontSize: 13.5, color: Colors.textSecondary }}>Amount to pay</Text>
        <Money
          value={amountRupees}
          style={[{ fontFamily: Font.extrabold, fontSize: 40, letterSpacing: -1.2, color: accent, marginTop: 4 }, tnum]}
        />

        {/* QR card */}
        {selected ? (
          <Animated.View
            key={selected.id}
            entering={FadeIn.duration(180)}
            style={{
              marginTop: 22,
              padding: 22,
              borderRadius: Radius.hero,
              backgroundColor: Colors.canvas,
              borderWidth: 1,
              borderColor: Colors.border,
              alignItems: 'center',
            }}
          >
            <UpiQr value={uri} size={236} imageUrl={selected.qrImageUrl} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 }}>
              <Sym name="qr_code_2" size={17} color={accent} />
              <Text style={{ fontFamily: Font.bold, fontSize: 13.5, color: Colors.textPrimary }}>
                {selected.label || selected.upiId}
              </Text>
            </View>
            <Text style={[{ fontFamily: Font.medium, fontSize: 12, color: Colors.textMuted, marginTop: 2 }, tnum]}>
              {selected.upiId}
            </Text>
          </Animated.View>
        ) : (
          <View style={{ marginTop: 22, padding: 30, alignItems: 'center' }}>
            <Sym name="qr_code_2" size={48} color={Colors.textMuted} />
            <Text style={{ fontFamily: Font.semibold, fontSize: 13.5, color: Colors.textSecondary, marginTop: 10, textAlign: 'center' }}>
              Add a UPI ID in Profile → Payments to show a scan-to-pay QR.
            </Text>
          </View>
        )}

        <Text style={{ fontFamily: Font.medium, fontSize: 12.5, color: Colors.textSecondary, marginTop: 18, textAlign: 'center' }}>
          Ask the customer to scan with any UPI app{'\n'}(Google Pay, PhonePe, Paytm) to pay instantly.
        </Text>
      </View>

      {/* Method selector — live-updates the QR */}
      {methods.length > 1 ? (
        <View style={{ paddingHorizontal: 20, paddingBottom: 18 + insets.bottom, paddingTop: 6 }}>
          <Text style={{ fontFamily: Font.bold, fontSize: 12.5, color: Colors.textSecondary, marginBottom: 10 }}>
            Receive in
          </Text>
          <View style={{ gap: 8 }}>
            {methods.map((m) => {
              const active = m.id === (selected?.id ?? '');
              return (
                <Tap
                  key={m.id}
                  onPress={() => onSelect(m.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 11,
                    borderRadius: Radius.tile,
                    borderWidth: 1.5,
                    borderColor: active ? accent : Colors.border,
                    backgroundColor: active ? tile : Colors.canvas,
                  }}
                >
                  <Sym name="qr_code_2" size={18} color={active ? accent : Colors.textSecondary} />
                  <Text style={{ flex: 1, fontFamily: Font.bold, fontSize: 13.5, color: active ? accent : Colors.textPrimary }} numberOfLines={1}>
                    {m.label || m.upiId}
                  </Text>
                  <Text style={[{ fontFamily: Font.medium, fontSize: 12, color: Colors.textMuted }, tnum]} numberOfLines={1}>
                    {m.upiId}
                  </Text>
                </Tap>
              );
            })}
          </View>
        </View>
      ) : null}
    </Animated.View>
  );
}
