import { Image, Text, View } from 'react-native';
import { Card } from '@/components/atoms/Card';
import { Sym } from '@/components/atoms/Icon';
import { Money } from '@/components/atoms/Money';
import type { BillItem } from '@/state/store';
import { formatINR } from '@/lib/format';
import type { PreviewTotals } from '@/lib/gstPreview';
import { Colors, Radius } from '@/theme/tokens';
import { Font, tnum } from '@/theme/typography';

interface Props {
  shopName: string;
  gstin: string;
  /** 'gst' shows GSTIN + tax rows; 'non_gst' = simple template. */
  gstMode: 'gst' | 'non_gst';
  customer: string;
  items: BillItem[];
  invoiceNo: string;
  date: string;
  accent: string;
  /** Server (post-confirm) or client-preview totals — always engine math, never 9%+9% guesswork. */
  totals: PreviewTotals;
  /** Real UPI QR (base64 PNG) once the bill is saved; placeholder glyph before. */
  qrBase64?: string | null;
  upiLabel?: string;
}

export function InvoiceCard({ shopName, gstin, gstMode, customer, items, invoiceNo, date, accent, totals, qrBase64, upiLabel }: Props) {
  const showTax = gstMode === 'gst' && totals.taxTotal > 0;
  return (
    <Card>
      {/* Header */}
      <View style={{ padding: 22, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ fontFamily: Font.extrabold, fontSize: 18, color: Colors.textPrimary }}>{shopName}</Text>
            {gstMode === 'gst' && gstin ? (
              <Text style={{ fontFamily: Font.medium, fontSize: 11.5, color: Colors.textSecondary, marginTop: 3 }}>
                GSTIN {gstin}
              </Text>
            ) : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: Font.bold, fontSize: 12, color: accent }}>{invoiceNo}</Text>
            <Text style={{ fontFamily: Font.medium, fontSize: 11.5, color: Colors.textMuted, marginTop: 2 }}>{date}</Text>
          </View>
        </View>
        <Text style={{ fontFamily: Font.medium, fontSize: 12.5, color: Colors.textSecondary, marginTop: 10 }}>
          Billed to {customer || 'Walk-in customer'}
        </Text>
      </View>

      {/* Dashed separator */}
      <View style={{ marginHorizontal: 22, borderBottomWidth: 1, borderStyle: 'dashed', borderColor: Colors.dashed }} />

      {/* Line items */}
      <View style={{ paddingHorizontal: 22, paddingTop: 6 }}>
        {items.map((it) => (
          <View
            key={it.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 11,
              borderBottomWidth: 1,
              borderBottomColor: Colors.rowDivider,
            }}
          >
            <Text style={{ fontFamily: Font.semibold, fontSize: 14, color: Colors.textPrimary, flex: 1, paddingRight: 10 }}>
              {it.name} <Text style={{ fontFamily: Font.medium, color: Colors.textMuted }}>× {it.qty}</Text>
            </Text>
            <Money value={it.price * it.qty} style={[{ fontFamily: Font.bold, fontSize: 14, color: Colors.textPrimary }, tnum]} />
          </View>
        ))}
      </View>

      {/* Totals */}
      <View style={{ paddingHorizontal: 22, paddingTop: 14, paddingBottom: 22 }}>
        <TotalRow label="Subtotal" value={formatINR(totals.subtotal)} />
        {showTax && totals.taxKind === 'intra' ? (
          <>
            <TotalRow label="CGST" value={formatINR(totals.cgst)} />
            <TotalRow label="SGST" value={formatINR(totals.sgst)} />
          </>
        ) : null}
        {showTax && totals.taxKind === 'inter' ? <TotalRow label="IGST" value={formatINR(totals.igst)} /> : null}
        {showTax ? (
          <Text style={{ fontFamily: Font.medium, fontSize: 11, color: Colors.textMuted, marginTop: 2 }}>
            GST included in MRP where applicable
          </Text>
        ) : null}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 10,
            paddingTop: 12,
            borderTopWidth: 1.5,
            borderTopColor: Colors.navBorder,
          }}
        >
          <Text style={{ fontFamily: Font.bold, fontSize: 15, color: Colors.textPrimary }}>Total</Text>
          <Money value={totals.grand} style={[{ fontFamily: Font.extrabold, fontSize: 26, letterSpacing: -0.6, color: accent }, tnum]} />
        </View>
      </View>

      {/* UPI QR — real once saved, placeholder glyph before */}
      <View
        style={{
          backgroundColor: Colors.inputBg,
          paddingVertical: 20,
          paddingHorizontal: 22,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 18,
          borderBottomLeftRadius: Radius.card,
          borderBottomRightRadius: Radius.card,
        }}
      >
        <View
          style={{
            width: 92,
            height: 92,
            borderRadius: Radius.card,
            backgroundColor: Colors.canvas,
            borderWidth: 1,
            borderColor: Colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {qrBase64 ? (
            <Image source={{ uri: `data:image/png;base64,${qrBase64}` }} style={{ width: 86, height: 86 }} resizeMode="contain" />
          ) : (
            <Sym name="qr_code_2" size={64} color={Colors.textPrimary} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: Font.semibold, fontSize: 13.5, color: Colors.textPrimary }}>Scan to pay via UPI</Text>
          <Money value={totals.grand} style={[{ fontFamily: Font.extrabold, fontSize: 20, letterSpacing: -0.4, color: accent, marginTop: 4 }, tnum]} />
          <Text style={{ fontFamily: Font.medium, fontSize: 11.5, color: Colors.textMuted, marginTop: 3 }}>
            {upiLabel || shopName}
          </Text>
        </View>
      </View>
    </Card>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
      <Text style={{ fontFamily: Font.medium, fontSize: 13.5, color: Colors.textSecondary }}>{label}</Text>
      <Text style={[{ fontFamily: Font.semibold, fontSize: 13.5, color: Colors.textPrimary }, tnum]}>{value}</Text>
    </View>
  );
}
