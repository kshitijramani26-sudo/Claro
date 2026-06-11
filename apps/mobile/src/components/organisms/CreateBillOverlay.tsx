import { Linking, ScrollView, Text, TextInput, View } from 'react-native';
import { useState } from 'react';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { OverlayShell } from './OverlayShell';
import { InvoiceCard } from './InvoiceCard';
import { Card } from '@/components/atoms/Card';
import { Sym } from '@/components/atoms/Icon';
import { Tap } from '@/components/atoms/Tap';
import { Money } from '@/components/atoms/Money';
import { Stepper } from '@/components/atoms/Stepper';
import { Select } from '@/components/atoms/Select';
import { PrimaryButton, OutlineButton } from '@/components/atoms/Button';
import { WhatsAppIcon } from '@/components/atoms/WhatsAppIcon';
import { ContactSuggest } from '@/components/molecules/ContactSuggest';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { BASE_URL, getAuthToken } from '@/lib/http';
import { formatINR } from '@/lib/format';
import { previewBill } from '@/lib/gstPreview';
import { GST_STATES, stateName } from '@/lib/states';
import { usePageTheme } from '@/theme/pageThemes';
import { Colors, Radius } from '@/theme/tokens';
import { Font, tnum } from '@/theme/typography';
import { cbTotal, useAppStore, type PayMode } from '@/state/store';
import type { BillResult, UpiInfo } from '@/data/types';
import type { SymbolName } from '@/lib/icons';

const PAY_MODES: { mode: PayMode; icon: SymbolName }[] = [
  { mode: 'Cash', icon: 'payments' },
  { mode: 'UPI', icon: 'qr_code_2' },
  { mode: 'Credit', icon: 'account_balance_wallet' },
];

const API_MODE: Record<PayMode, 'CASH' | 'UPI' | 'CREDIT'> = { Cash: 'CASH', UPI: 'UPI', Credit: 'CREDIT' };

export function CreateBillOverlay() {
  const theme = usePageTheme('billing');
  const cb = useAppStore((s) => s.cb);
  const business = useAppStore((s) => s.business);
  const cbSet = useAppStore((s) => s.cbSet);
  const cbAddCatalogItem = useAppStore((s) => s.cbAddCatalogItem);
  const cbAddCustomItem = useAppStore((s) => s.cbAddCustomItem);
  const cbInc = useAppStore((s) => s.cbInc);
  const cbDec = useAppStore((s) => s.cbDec);
  const cbReset = useAppStore((s) => s.cbReset);
  const closeOverlay = useAppStore((s) => s.closeOverlay);
  const flashToast = useAppStore((s) => s.flashToast);
  const refresh = useAppStore((s) => s.refresh);
  const [searchFocused, setSearchFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<BillResult | null>(null);
  const [savedUpi, setSavedUpi] = useState<UpiInfo | null>(null);

  const { data: staffList } = useApi(() => api.getStaff());
  const { data: catalogData } = useApi(() => api.getBillCatalog());
  const { data: methods } = useApi(() => api.getPaymentMethods());

  const staffNames = (staffList ?? []).map((m) => m.name);
  const catalog = (catalogData ?? []).filter((c) => c.name.toLowerCase().includes(cb.search.toLowerCase()));

  const gstRegistered = business?.gstRegistered ?? false;
  const gstMode = cb.gstMode ?? (gstRegistered ? (business?.gstDefaultMode ?? 'non_gst') : 'non_gst');
  const bizState = business?.stateCode ?? '27';
  const supplyState = cb.custState || bizState;
  const total = cbTotal(cb.items);

  const totals = saved
    ? {
        subtotal: saved.subtotal, taxable: saved.taxable, cgst: saved.cgst, sgst: saved.sgst,
        igst: saved.igst, taxTotal: saved.taxTotal, grand: saved.grandTotal, taxKind: saved.taxKind,
      }
    : previewBill(
        cb.items.map((it) => ({ price: it.price, qty: it.qty, taxRateBps: it.taxRateBps, inclusive: it.inclusive })),
        { gstMode, intra: supplyState === bizState },
      );

  const defaultMethod = (methods ?? []).find((m) => m.isDefault) ?? (methods ?? [])[0];
  const chosenMethod = (methods ?? []).find((m) => m.id === cb.payMethodId) ?? defaultMethod;

  const confirm = async (): Promise<BillResult | null> => {
    if (saved) return saved;
    if (cb.items.length === 0) return null;
    setSaving(true);
    try {
      const bill = await api.confirmBill({
        requestId: cb.requestId,
        items: cb.items.map((it) => ({
          inventoryItemId: it.inventoryItemId, name: it.name, qty: it.qty, priceRupees: it.price,
        })),
        paymentMode: API_MODE[cb.payMode],
        customerName: cb.custName,
        customerPhone: cb.custPhone,
        customerStateCode: cb.custState || null,
        staffId: (staffList ?? []).find((m) => m.name === cb.staff)?.id ?? null,
        gstMode: gstRegistered ? gstMode : null,
        paymentMethodId: chosenMethod?.id ?? null,
      });
      setSaved(bill);
      refresh();
      api.getBillUpi(bill.id).then(setSavedUpi).catch(() => undefined);
      return bill;
    } catch (e) {
      flashToast((e as Error).message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const sharePdf = async () => {
    const bill = await confirm();
    if (!bill) return;
    try {
      const res = await fetch(`${BASE_URL}/bills/${bill.id}/pdf`, {
        headers: { Authorization: `Bearer ${getAuthToken() ?? ''}` },
      });
      if (!res.ok) throw new Error('PDF failed');
      const bytes = new Uint8Array(await res.arrayBuffer());
      const file = new File(Paths.cache, `${bill.invoiceNo}.pdf`);
      file.write(bytes);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle: bill.invoiceNo });
      } else {
        flashToast('Invoice PDF saved');
      }
    } catch (e) {
      flashToast((e as Error).message);
    }
  };

  const shareWhatsApp = async () => {
    const bill = await confirm();
    if (!bill) return;
    const upi = savedUpi ?? (await api.getBillUpi(bill.id).catch(() => null));
    const lines = [
      `*${business?.name ?? 'Invoice'}* — ${bill.invoiceNo}`,
      ...bill.items.map((i) => `${i.name} × ${i.qty} = ${formatINR(i.lineTotal)}`),
      `*Total: ${formatINR(bill.grandTotal)}*`,
      upi ? `Pay via UPI: ${upi.upiId}` : '',
    ].filter(Boolean);
    const text = encodeURIComponent(lines.join('\n'));
    const digits = cb.custPhone.replace(/\D/g, '');
    const target = digits.length >= 10 ? `91${digits.slice(-10)}` : '';
    try {
      await Linking.openURL(`https://wa.me/${target}?text=${text}`);
    } catch {
      flashToast('Could not open WhatsApp');
    }
  };

  const done = () => {
    cbReset();
    closeOverlay();
  };

  // ---------- REVIEW STEP ----------
  if (cb.step === 'review') {
    return (
      <OverlayShell
        title={saved ? 'Bill Saved' : 'Review & Share'}
        closeIcon="arrow_back"
        onClose={() => (saved ? done() : cbSet({ step: 'build' }))}
        bg={theme.bg}
        footer={
          saved ? (
            <PrimaryButton label="Done" icon="check" onPress={done} />
          ) : (
            <PrimaryButton
              label={saving ? 'Saving…' : 'Confirm & Save Bill'}
              icon="check"
              disabled={saving}
              onPress={async () => {
                const bill = await confirm();
                if (bill) flashToast('Bill saved · ' + formatINR(bill.grandTotal));
              }}
            />
          )
        }
      >
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
          <InvoiceCard
            shopName={business?.name ?? ''}
            gstin={business?.gstin ?? ''}
            gstMode={saved ? saved.gstMode : gstMode}
            customer={saved?.customerName || cb.custName}
            items={cb.items}
            invoiceNo={saved?.invoiceNo ?? 'Draft'}
            date={saved?.date ?? new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            accent={theme.accent}
            totals={totals}
            qrBase64={savedUpi?.qrPngBase64 ?? null}
            upiLabel={chosenMethod ? `${chosenMethod.label || chosenMethod.upiId}` : business?.name}
          />

          {/* Receive payment in — saved UPI/QR methods, default preselected */}
          {(methods ?? []).length > 0 ? (
            <Card pad={16} style={{ marginTop: 14 }}>
              <Text style={{ fontFamily: Font.bold, fontSize: 13, color: Colors.textSecondary, marginBottom: 10 }}>
                Receive payment in
              </Text>
              <View style={{ gap: 8 }}>
                {(methods ?? []).map((m) => {
                  const active = m.id === (chosenMethod?.id ?? '');
                  return (
                    <Tap
                      key={m.id}
                      onPress={() => !saved && cbSet({ payMethodId: m.id })}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 11,
                        borderRadius: Radius.tile,
                        borderWidth: 1.5,
                        borderColor: active ? theme.accent : Colors.border,
                        backgroundColor: active ? theme.tile : Colors.canvas,
                        opacity: saved && !active ? 0.5 : 1,
                      }}
                    >
                      <Sym name="qr_code_2" size={18} color={active ? theme.accent : Colors.textSecondary} />
                      <Text style={{ flex: 1, fontFamily: Font.bold, fontSize: 13.5, color: active ? theme.accent : Colors.textPrimary }} numberOfLines={1}>
                        {m.label || m.upiId}
                      </Text>
                      <Text style={[{ fontFamily: Font.medium, fontSize: 12, color: Colors.textMuted }, tnum]} numberOfLines={1}>
                        {m.upiId}
                      </Text>
                    </Tap>
                  );
                })}
              </View>
            </Card>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <OutlineButton label="PDF" icon="ios_share" onPress={sharePdf} style={{ flex: 1 }} fontSize={14} />
            <OutlineButton label="WhatsApp" iconNode={<WhatsAppIcon size={18} />} onPress={shareWhatsApp} style={{ flex: 1 }} fontSize={14} />
          </View>
        </ScrollView>
      </OverlayShell>
    );
  }

  // ---------- BUILD STEP ----------
  return (
    <OverlayShell
      title="Create Bill"
      onClose={closeOverlay}
      bg={theme.bg}
      footer={
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontFamily: Font.semibold, fontSize: 13.5, color: Colors.textSecondary }}>Running total</Text>
            <Money value={total} style={[{ fontFamily: Font.extrabold, fontSize: 30, letterSpacing: -0.8, color: Colors.textPrimary }, tnum]} />
          </View>
          <PrimaryButton label="Review bill →" disabled={cb.items.length === 0} onPress={() => cbSet({ step: 'review' })} />
        </View>
      }
    >
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 30, gap: 14 }} keyboardShouldPersistTaps="handled">
        {/* Search catalog */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            height: 50,
            borderRadius: Radius.btn,
            borderWidth: 1.5,
            borderColor: searchFocused ? theme.accent : Colors.border,
            backgroundColor: Colors.canvas,
            paddingHorizontal: 14,
          }}
        >
          <Sym name="search" size={21} color={Colors.textMuted} />
          <TextInput
            value={cb.search}
            onChangeText={(t) => cbSet({ search: t })}
            placeholder="Search items…"
            placeholderTextColor={Colors.textMuted}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={{ flex: 1, fontFamily: Font.semibold, fontSize: 14.5, color: Colors.textPrimary }}
          />
        </View>

        {/* Catalog */}
        <Card style={{ maxHeight: 184 }}>
          <ScrollView nestedScrollEnabled style={{ paddingHorizontal: 18 }} keyboardShouldPersistTaps="handled">
            {catalog.map((c, i) => (
              <View
                key={c.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 12,
                  borderBottomWidth: i === catalog.length - 1 ? 0 : 1,
                  borderBottomColor: Colors.divider,
                }}
              >
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ fontFamily: Font.semibold, fontSize: 14.5, color: Colors.textPrimary }}>{c.name}</Text>
                  <Money value={c.price} style={{ fontFamily: Font.medium, fontSize: 12.5, color: Colors.textSecondary, marginTop: 1 }} />
                </View>
                <Tap
                  onPress={() => cbAddCatalogItem(c)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: Radius.tile,
                    backgroundColor: theme.tile,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Sym name="add" size={20} color={theme.accent} />
                </Tap>
              </View>
            ))}
            {catalog.length === 0 ? (
              <Text style={{ fontFamily: Font.medium, fontSize: 13, color: Colors.textMuted, paddingVertical: 16, textAlign: 'center' }}>
                No items match your search
              </Text>
            ) : null}
          </ScrollView>
        </Card>

        {/* Bill items */}
        {cb.items.length > 0 ? (
          <Card style={{ paddingHorizontal: 18 }}>
            {cb.items.map((it, i) => (
              <View
                key={it.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 13,
                  borderBottomWidth: i === cb.items.length - 1 ? 0 : 1,
                  borderBottomColor: Colors.divider,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: Font.bold, fontSize: 14.5, color: Colors.textPrimary }} numberOfLines={1}>
                    {it.name}
                  </Text>
                  <Money value={it.price} prefix="" style={{ fontFamily: Font.medium, fontSize: 12, color: Colors.textSecondary, marginTop: 1 }} />
                </View>
                <Stepper qty={it.qty} onInc={() => cbInc(it.id)} onDec={() => cbDec(it.id)} />
                <Money value={it.price * it.qty} style={[{ fontFamily: Font.extrabold, fontSize: 15, color: Colors.textPrimary, minWidth: 64, textAlign: 'right' }, tnum]} />
              </View>
            ))}
          </Card>
        ) : (
          <Card style={{ padding: 22, alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'center' }}>
            <Sym name="shopping_cart" size={22} color={Colors.textMuted} />
            <Text style={{ fontFamily: Font.semibold, fontSize: 13.5, color: Colors.textMuted }}>
              No items yet — search above or add a custom item
            </Text>
          </Card>
        )}

        {/* Add custom item */}
        <Card pad={18}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Sym name="edit_note" size={20} color={theme.accent} />
            <Text style={{ fontFamily: Font.bold, fontSize: 13.5, color: Colors.textPrimary }}>Add a custom item</Text>
          </View>
          <SheetField placeholder="Item name" value={cb.nName} onChangeText={(t) => cbSet({ nName: t })} accent={theme.accent} />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <SheetField placeholder="Quantity" value={cb.nQty} onChangeText={(t) => cbSet({ nQty: t })} accent={theme.accent} keyboardType="number-pad" style={{ flex: 1 }} />
            <SheetField placeholder="Unit price (₹)" value={cb.nPrice} onChangeText={(t) => cbSet({ nPrice: t })} accent={theme.accent} keyboardType="number-pad" style={{ flex: 1 }} />
          </View>
          <Tap
            onPress={cbAddCustomItem}
            style={{
              height: 46,
              borderRadius: Radius.btnSm,
              backgroundColor: theme.tile,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              marginTop: 12,
            }}
          >
            <Sym name="add_circle" size={21} color={theme.accent} />
            <Text style={{ fontFamily: Font.bold, fontSize: 14.5, color: theme.accent }}>Add to bill</Text>
          </Tap>
        </Card>

        {/* GST mode (GST-registered shops only) + place of supply */}
        {gstRegistered ? (
          <Card pad={18} style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: Font.bold, fontSize: 13.5, color: Colors.textPrimary }}>Bill type</Text>
              <View style={{ flexDirection: 'row', backgroundColor: Colors.segmentBg, borderRadius: Radius.tile, padding: 3 }}>
                {(['gst', 'non_gst'] as const).map((mode) => {
                  const active = gstMode === mode;
                  return (
                    <Tap
                      key={mode}
                      onPress={() => cbSet({ gstMode: mode })}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 7,
                        borderRadius: Radius.chip,
                        backgroundColor: active ? Colors.canvas : 'transparent',
                      }}
                    >
                      <Text style={{ fontFamily: Font.bold, fontSize: 12.5, color: active ? theme.accent : Colors.textSecondary }}>
                        {mode === 'gst' ? 'GST' : 'Non-GST'}
                      </Text>
                    </Tap>
                  );
                })}
              </View>
            </View>
            {gstMode === 'gst' ? (
              <Select
                label="Customer state (place of supply)"
                value={stateName(supplyState)}
                options={GST_STATES.map((s) => s.name)}
                onChange={(name) => cbSet({ custState: GST_STATES.find((s) => s.name === name)?.code ?? '' })}
                placeholder={stateName(bizState)}
                accent={theme.accent}
                height={48}
                radius={Radius.tile}
              />
            ) : null}
          </Card>
        ) : null}

        {/* Attribution / customer / payment */}
        <Card pad={18} style={{ gap: 16 }}>
          <Select
            label="Attribute to staff"
            value={cb.staff}
            options={staffNames}
            onChange={(v) => cbSet({ staff: v })}
            placeholder="Select staff member"
            accent={Colors.warning}
            height={48}
            radius={Radius.tile}
          />
          <SheetField placeholder="Customer name (optional)" value={cb.custName} onChangeText={(t) => cbSet({ custName: t })} accent={theme.accent} height={48} />
          <ContactSuggest query={cb.custName} accent={theme.accent} onPick={(h) => cbSet({ custName: h.name, custPhone: h.phone })} />
          <SheetField placeholder="Customer phone (optional)" value={cb.custPhone} onChangeText={(t) => cbSet({ custPhone: t })} accent={theme.accent} height={48} keyboardType="phone-pad" />
          <View style={{ flexDirection: 'row', gap: 9 }}>
            {PAY_MODES.map(({ mode, icon }) => {
              const active = cb.payMode === mode;
              return (
                <Tap
                  key={mode}
                  onPress={() => cbSet({ payMode: mode })}
                  style={{
                    flex: 1,
                    height: 50,
                    borderRadius: Radius.tile,
                    borderWidth: 1.5,
                    borderColor: active ? theme.accent : Colors.border,
                    backgroundColor: active ? theme.tile : Colors.canvas,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Sym name={icon} size={18} color={active ? theme.accent : Colors.textSecondary} />
                  <Text style={{ fontFamily: Font.bold, fontSize: 13, color: active ? theme.accent : Colors.textSecondary }}>
                    {mode}
                  </Text>
                </Tap>
              );
            })}
          </View>
        </Card>
      </ScrollView>
    </OverlayShell>
  );
}

/** Compact grey form field used inside cards/sheets (radius 10, #F7F8FA). */
function SheetField({
  value,
  onChangeText,
  placeholder,
  accent,
  keyboardType,
  height = 46,
  style,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  accent: string;
  keyboardType?: 'number-pad' | 'phone-pad';
  height?: number;
  style?: object;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={Colors.textMuted}
      keyboardType={keyboardType}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        {
          height,
          borderRadius: Radius.btnSm,
          borderWidth: 1.5,
          borderColor: focused ? accent : Colors.border,
          backgroundColor: Colors.inputBg,
          paddingHorizontal: 14,
          fontFamily: Font.semibold,
          fontSize: 14,
          color: Colors.textPrimary,
        },
        style,
      ]}
    />
  );
}
