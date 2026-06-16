import { ScrollView, Text, TextInput, View } from 'react-native';
import { useState, useEffect } from 'react';
import { OverlayShell } from './OverlayShell';
import { SegmentedControl } from '@/components/atoms/SegmentedControl';
import { InvoiceCard } from './InvoiceCard';
import { ScanPayOverlay } from './ScanPayOverlay';
import { Card } from '@/components/atoms/Card';
import { Sym } from '@/components/atoms/Icon';
import { Tap } from '@/components/atoms/Tap';
import { Money } from '@/components/atoms/Money';
import { Stepper } from '@/components/atoms/Stepper';
import { Select } from '@/components/atoms/Select';
import { PrimaryButton, OutlineButton } from '@/components/atoms/Button';
import { WhatsAppIcon } from '@/components/atoms/WhatsAppIcon';
import { ContactSuggest } from '@/components/molecules/ContactSuggest';
import { PowerWheelSheet, useRxWheelOptions, type WheelOption, type DualOptions } from '@/components/molecules/PowerWheelSheet';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { formatINR, formatDateDMY } from '@/lib/format';
import { previewBill } from '@/lib/gstPreview';
import { buildUpiUri } from '@/lib/upi';
import { sharePdfFile, shareWhatsAppInvoice } from '@/lib/invoiceShare';
import { GST_STATES, stateName } from '@/lib/states';
import { usePageTheme } from '@/theme/pageThemes';
import { Colors, Radius } from '@/theme/tokens';
import { Font, tnum } from '@/theme/typography';
import { cbTotal, cbDiscountRupees, useAppStore, type PayMode } from '@/state/store';
import type { BillResult, UpiInfo } from '@/data/types';
import type { SymbolName } from '@/lib/icons';

const PAY_MODES: { mode: PayMode; icon: SymbolName }[] = [
  { mode: 'Cash', icon: 'payments' },
  { mode: 'UPI', icon: 'qr_code_2' },
  { mode: 'Credit', icon: 'account_balance_wallet' },
];

const API_MODE: Record<PayMode, 'CASH' | 'UPI' | 'CREDIT'> = { Cash: 'CASH', UPI: 'UPI', Credit: 'CREDIT' };

function phoneMatch(p1?: string, p2?: string): boolean {
  if (!p1 || !p2) return false;
  const clean1 = p1.replace(/\D/g, '');
  const clean2 = p2.replace(/\D/g, '');
  if (clean1.length >= 10 && clean2.length >= 10) {
    return clean1.slice(-10) === clean2.slice(-10);
  }
  return clean1 === clean2;
}

export function CreateBillOverlay() {
  const theme = usePageTheme('billing');
  const cb = useAppStore((s) => s.cb);
  const business = useAppStore((s) => s.business);
  const cbSet = useAppStore((s) => s.cbSet);
  const cbAddCatalogItem = useAppStore((s) => s.cbAddCatalogItem);
  const cbAddCustomItem = useAppStore((s) => s.cbAddCustomItem);
  const cbInc = useAppStore((s) => s.cbInc);
  const cbDec = useAppStore((s) => s.cbDec);
  const cbSetItemKind = useAppStore((s) => s.cbSetItemKind);
  const cbReset = useAppStore((s) => s.cbReset);
  const closeOverlay = useAppStore((s) => s.closeOverlay);
  const flashToast = useAppStore((s) => s.flashToast);
  const refresh = useAppStore((s) => s.refresh);
  const [searchFocused, setSearchFocused] = useState(false);
  const [discountFocused, setDiscountFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<BillResult | null>(null);
  const [savedUpi, setSavedUpi] = useState<UpiInfo | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

  const [prescription, setPrescription] = useState<any | null>(null);
  const [rxModalOpen, setRxModalOpen] = useState(false);
  const rxWheel = useRxWheelOptions();
  const [wheel, setWheel] = useState<{
    title: string;
    value: string;
    onSelect: (v: string) => void;
    options?: WheelOption[];
    dual?: DualOptions;
  } | null>(null);
  const openWheelSingle = (title: string, options: WheelOption[], value: string, onSelect: (v: string) => void) =>
    setWheel({ title, value, onSelect, options });
  const openWheelDual = (title: string, dual: DualOptions, value: string, onSelect: (v: string) => void) =>
    setWheel({ title, value, onSelect, dual });
  const [deliveryDate, setDeliveryDate] = useState<string>(''); // YYYY-MM-DD
  const [orderStatus, setOrderStatus] = useState<'pending' | 'ready' | 'delivered'>('delivered');
  const [lastRxInfo, setLastRxInfo] = useState<{ date: string; rx: any } | null>(null);

  // Eye prescription fields state
  const [rDistSph, setRDistSph] = useState('');
  const [rDistCyl, setRDistCyl] = useState('');
  const [rDistAxis, setRDistAxis] = useState('');
  const [rDistVn, setRDistVn] = useState('');

  const [rNearSph, setRNearSph] = useState('');
  const [rNearCyl, setRNearCyl] = useState('');
  const [rNearAxis, setRNearAxis] = useState('');
  const [rNearVn, setRNearVn] = useState('');

  const [lDistSph, setLDistSph] = useState('');
  const [lDistCyl, setLDistCyl] = useState('');
  const [lDistAxis, setLDistAxis] = useState('');
  const [lDistVn, setLDistVn] = useState('');

  const [lNearSph, setLNearSph] = useState('');
  const [lNearCyl, setLNearCyl] = useState('');
  const [lNearAxis, setLNearAxis] = useState('');
  const [lNearVn, setLNearVn] = useState('');

  const [addR, setAddR] = useState('');
  const [addL, setAddL] = useState('');
  const [pd, setPd] = useState('');
  const [remarks, setRemarks] = useState('');
  const [lensTypes, setLensTypes] = useState<string[]>([]);

  useEffect(() => {
    if (rxModalOpen) {
      if (prescription) {
        setRDistSph(prescription.rDistSph || '');
        setRDistCyl(prescription.rDistCyl || '');
        setRDistAxis(prescription.rDistAxis ? String(prescription.rDistAxis) : '');
        setRDistVn(prescription.rDistVn || '');
        setRNearSph(prescription.rNearSph || '');
        setRNearCyl(prescription.rNearCyl || '');
        setRNearAxis(prescription.rNearAxis ? String(prescription.rNearAxis) : '');
        setRNearVn(prescription.rNearVn || '');
        
        setLDistSph(prescription.lDistSph || '');
        setLDistCyl(prescription.lDistCyl || '');
        setLDistAxis(prescription.lDistAxis ? String(prescription.lDistAxis) : '');
        setLDistVn(prescription.lDistVn || '');
        setLNearSph(prescription.lNearSph || '');
        setLNearCyl(prescription.lNearCyl || '');
        setLNearAxis(prescription.lNearAxis ? String(prescription.lNearAxis) : '');
        setLNearVn(prescription.lNearVn || '');

        setAddR(prescription.addR || '');
        setAddL(prescription.addL || '');
        setPd(prescription.pd || '');
        setRemarks(prescription.remarks || '');
        setLensTypes(prescription.lensTypes || []);
      } else {
        setRDistSph(''); setRDistCyl(''); setRDistAxis(''); setRDistVn('');
        setRNearSph(''); setRNearCyl(''); setRNearAxis(''); setRNearVn('');
        setLDistSph(''); setLDistCyl(''); setLDistAxis(''); setLDistVn('');
        setLNearSph(''); setLNearCyl(''); setLNearAxis(''); setLNearVn('');
        setAddR(''); setAddL(''); setPd(''); setRemarks(''); setLensTypes([]);
      }
    }
  }, [rxModalOpen]);

  useEffect(() => {
    if (!cb.custName && !cb.custPhone) {
      setLastRxInfo(null);
      return;
    }
    const query = cb.custPhone || cb.custName;
    api.searchCustomers(query).then((hits) => {
      const hit = hits.find((h) => {
        if (cb.custPhone) {
          return phoneMatch(h.phone, cb.custPhone);
        }
        if (cb.custName) {
          const cName = cb.custName.trim().toLowerCase();
          const hName = h.name.trim().toLowerCase();
          return hName.startsWith(cName) || cName.startsWith(hName);
        }
        return false;
      });
      if (hit) {
        api.getLatestPrescription(hit.id).then((rx) => {
          if (rx) {
            setLastRxInfo({ date: rx.date, rx });
          } else {
            setLastRxInfo(null);
          }
        });
      } else {
        setLastRxInfo(null);
      }
    }).catch(() => setLastRxInfo(null));
  }, [cb.custName, cb.custPhone]);

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
  const discountRupees = cbDiscountRupees(cb, total);

  const totals = saved
    ? {
        subtotal: saved.subtotal, discount: saved.discount, taxable: saved.taxable, cgst: saved.cgst,
        sgst: saved.sgst, igst: saved.igst, taxTotal: saved.taxTotal, grand: saved.grandTotal, taxKind: saved.taxKind,
      }
    : previewBill(
        cb.items.map((it) => ({ price: it.price, qty: it.qty, taxRateBps: it.taxRateBps, inclusive: it.inclusive })),
        { gstMode, intra: supplyState === bizState, discountRupees },
      );

  // Advance / part payment — bill becomes CREDIT with an advance paid now.
  const isAdvance = cb.payKind === 'advance';
  const receivedRupees = isAdvance ? Math.max(0, Math.min(totals.grand, parseFloat(cb.receivedInput) || 0)) : 0;
  const balanceDueRupees = isAdvance ? Math.max(0, totals.grand - receivedRupees) : 0;
  const effectivePayMode: 'CASH' | 'UPI' | 'CREDIT' = isAdvance ? 'CREDIT' : API_MODE[cb.payMode];

  const defaultMethod = (methods ?? []).find((m) => m.isDefault) ?? (methods ?? [])[0];
  const chosenMethod = (methods ?? []).find((m) => m.id === cb.payMethodId) ?? defaultMethod;
  const isUpi = (!isAdvance && cb.payMode === 'UPI') || (isAdvance && cb.receivedMode === 'UPI');
  const upiUri = chosenMethod
    ? buildUpiUri({ vpa: chosenMethod.upiId, payeeName: business?.name ?? '', amountRupees: isAdvance && cb.receivedMode === 'UPI' ? receivedRupees : totals.grand, note: saved?.invoiceNo ?? 'Bill' })
    : null;

  const confirm = async (): Promise<BillResult | null> => {
    if (saved) return saved;
    if (cb.items.length === 0) return null;
    if (isAdvance && !cb.custName.trim()) {
      flashToast('Add the customer name for an advance / part payment');
      return null;
    }
    setSaving(true);
    try {
      const bill = await api.confirmBill({
        requestId: cb.requestId,
        items: cb.items.map((it) => ({
          inventoryItemId: it.inventoryItemId,
          name: it.name,
          qty: it.qty,
          priceRupees: it.price,
          itemKind: it.itemKind || 'other',
        })),
        paymentMode: effectivePayMode,
        customerName: cb.custName,
        customerPhone: cb.custPhone,
        customerStateCode: cb.custState || null,
        staffId: (staffList ?? []).find((m) => m.name === cb.staff)?.id ?? null,
        gstMode: gstRegistered ? gstMode : null,
        paymentMethodId: chosenMethod?.id ?? null,
        discountPaise: Math.round(discountRupees * 100),
        amountReceivedPaise: isAdvance ? Math.round(receivedRupees * 100) : 0,
        receivedMode: isAdvance ? (cb.receivedMode === 'UPI' ? 'UPI' : 'CASH') : null,
        prescription,
        orderStatus,
        deliveryDate: deliveryDate.trim() || null,
      });
      setSaved(bill);
      refresh();
      if (effectivePayMode === 'UPI') api.getBillUpi(bill.id).then(setSavedUpi).catch(() => undefined);
      return bill;
    } catch (e) {
      flashToast((e as Error).message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  /** QR / UPI id details for PDF + WhatsApp (best-effort hosted link). */
  const shareDetails = async (bill: BillResult) => {
    const upi = bill.paymentMode === 'UPI' ? savedUpi ?? (await api.getBillUpi(bill.id).catch(() => null)) : null;
    const link = await api.getBillShareLink(bill.id).catch(() => null);
    return {
      pdfUrl: link,
      customerPhone: cb.custPhone || null,
    };
  };

  const sharePdf = async () => {
    const bill = await confirm();
    if (!bill) return;
    try {
      await sharePdfFile(bill, business, await shareDetails(bill));
    } catch (e) {
      flashToast((e as Error).message);
    }
  };

  const shareWhatsApp = async () => {
    const bill = await confirm();
    if (!bill) return;
    try {
      await shareWhatsAppInvoice(bill, business, await shareDetails(bill));
    } catch {
      flashToast('Could not open WhatsApp');
    }
  };

  const done = () => {
    cbReset();
    closeOverlay();
  };

  // Add a custom line to the bill AND remember it in the catalogue (untracked) so
  // the shopkeeper sees it auto-suggested next time. Dedupe by name (case-insensitive).
  const addCustomItem = () => {
    const name = cb.nName.trim();
    const price = parseFloat(cb.nPrice) || 0;
    cbAddCustomItem(); // adds to bill + clears the fields (no-op if invalid)
    if (name && price > 0 && !(catalogData ?? []).some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      api.addInventory({ name, qty: 0, threshold: 0, costRupees: 0, priceRupees: price })
        .then(() => refresh())
        .catch(() => undefined);
    }
  };

  // ---------- REVIEW STEP ----------
  if (cb.step === 'review') {
    return (
      <>
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
            date={saved?.date ?? formatDateDMY(new Date())}
            accent={theme.accent}
            totals={totals}
            showQr={isUpi}
            upiUri={upiUri}
            qrImageUrl={chosenMethod?.qrImageUrl ?? null}
            upiLabel={chosenMethod ? `${chosenMethod.label || chosenMethod.upiId}` : business?.name}
            onQrPress={() => setScanOpen(true)}
            amountReceived={saved ? saved.amountReceived : receivedRupees}
            balanceDue={saved ? saved.balanceDue : balanceDueRupees}
            prescription={saved ? saved.prescription : prescription}
            orderStatus={saved ? saved.orderStatus : orderStatus}
            deliveryDate={saved ? saved.deliveryDate : (deliveryDate ? new Date(deliveryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null)}
          />

          {/* Receive payment in — saved UPI/QR methods, default preselected (UPI bills) */}
          {isUpi && (methods ?? []).length > 0 ? (
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
            <OutlineButton label="Send on WhatsApp" iconNode={<WhatsAppIcon size={18} />} onPress={shareWhatsApp} style={{ flex: 1.5 }} fontSize={14} />
            <OutlineButton label="Share / Save" icon="ios_share" onPress={sharePdf} style={{ flex: 1 }} fontSize={14} />
          </View>
        </ScrollView>
      </OverlayShell>
      {scanOpen ? (
        <ScanPayOverlay
          shopName={business?.name ?? ''}
          amountRupees={isAdvance && cb.receivedMode === 'UPI' ? receivedRupees : totals.grand}
          methods={methods ?? []}
          selectedId={chosenMethod?.id ?? null}
          onSelect={(id) => cbSet({ payMethodId: id })}
          onClose={() => setScanOpen(false)}
          bg={theme.bg}
          accent={theme.accent}
          tile={theme.tile}
        />
      ) : null}
      </>
    );
  }

  // ---------- BUILD STEP ----------
  return (
    <>
      <OverlayShell
        title="Create Bill"
        onClose={closeOverlay}
        bg={theme.bg}
        footer={
          rxModalOpen ? null : (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View>
                  <Text style={{ fontFamily: Font.semibold, fontSize: 13.5, color: Colors.textSecondary }}>
                    {discountRupees > 0 ? 'Payable' : 'Running total'}
                  </Text>
                  {discountRupees > 0 ? (
                    <Text style={[{ fontFamily: Font.medium, fontSize: 11.5, color: Colors.success, marginTop: 1 }, tnum]}>
                      {formatINR(total)} − {formatINR(discountRupees)} off
                    </Text>
                  ) : null}
                </View>
                <Money value={discountRupees > 0 ? totals.grand : total} style={[{ fontFamily: Font.extrabold, fontSize: 30, letterSpacing: -0.8, color: Colors.textPrimary }, tnum]} />
              </View>
              <PrimaryButton label="Review bill →" disabled={cb.items.length === 0} onPress={() => cbSet({ step: 'review' })} />
            </View>
          )
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
                    {business?.industry === 'Optical' && (
                      <View style={{ flexDirection: 'row', gap: 4, marginTop: 5 }}>
                        {(['frame', 'lens', 'other'] as const).map((k) => {
                          const active = (it.itemKind || 'other') === k;
                          return (
                            <Tap
                              key={k}
                              onPress={() => {
                                cbSetItemKind(it.id, k);
                                if (k === 'lens') {
                                  setRxModalOpen(true);
                                }
                              }}
                              style={{
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 6,
                                backgroundColor: active ? theme.tile : Colors.divider,
                              }}
                            >
                              <Text style={{ fontFamily: Font.bold, fontSize: 10, color: active ? theme.accent : Colors.textSecondary, textTransform: 'capitalize' }}>
                                {k === 'lens' ? 'Lens/Glasses' : k}
                              </Text>
                            </Tap>
                          );
                        })}
                      </View>
                    )}
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
              onPress={addCustomItem}
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

          {/* Discount — flat ₹ or % of subtotal, applied to the whole bill (pre-tax) */}
          {cb.items.length > 0 ? (
            <Card pad={18} style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Sym name="sell" size={20} color={theme.accent} />
                  <Text style={{ fontFamily: Font.bold, fontSize: 13.5, color: Colors.textPrimary }}>Add discount</Text>
                </View>
                <View style={{ flexDirection: 'row', backgroundColor: Colors.segmentBg, borderRadius: Radius.tile, padding: 3 }}>
                  {(['amount', 'percent'] as const).map((kind) => {
                    const active = cb.discountKind === kind;
                    return (
                      <Tap
                        key={kind}
                        onPress={() => cbSet({ discountKind: kind })}
                        style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.chip, backgroundColor: active ? Colors.canvas : 'transparent' }}
                      >
                        <Text style={{ fontFamily: Font.bold, fontSize: 12.5, color: active ? theme.accent : Colors.textSecondary }}>
                          {kind === 'amount' ? '₹' : '%'}
                        </Text>
                      </Tap>
                    );
                  })}
                </View>
              </View>
              <TextInput
                value={cb.discountInput}
                onChangeText={(t) => cbSet({ discountInput: t })}
                placeholder={cb.discountKind === 'percent' ? 'Discount % (e.g. 10)' : 'Discount amount (₹)'}
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
                onFocus={() => setDiscountFocused(true)}
                onBlur={() => setDiscountFocused(false)}
                style={{
                  height: 46, borderRadius: Radius.btnSm, borderWidth: 1.5,
                  borderColor: discountFocused ? theme.accent : Colors.border, backgroundColor: Colors.inputBg,
                  paddingHorizontal: 14, fontFamily: Font.semibold, fontSize: 14, color: Colors.textPrimary,
                }}
              />
              {discountRupees > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: Font.medium, fontSize: 12.5, color: Colors.success }}>
                    You save {formatINR(discountRupees)}
                  </Text>
                  <Text style={[{ fontFamily: Font.bold, fontSize: 13, color: Colors.textSecondary }, tnum]}>
                    Payable {formatINR(totals.grand)}
                  </Text>
                </View>
              ) : null}
            </Card>
          ) : null}

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

          {/* Specs order details */}
          {business?.industry === 'Optical' && (
            <Card pad={18} style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Sym name="visibility" size={20} color={theme.accent} />
                  <Text style={{ fontFamily: Font.bold, fontSize: 13.5, color: Colors.textPrimary }}>Specs Order Details</Text>
                </View>
                <Tap
                  onPress={() => setRxModalOpen(true)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: Radius.chip,
                    backgroundColor: prescription ? Colors.successTile : theme.tile,
                  }}
                >
                  <Text style={{ fontFamily: Font.bold, fontSize: 12, color: prescription ? Colors.success : theme.accent }}>
                    {prescription ? 'Edit Rx (Attached)' : '+ Add Rx Power'}
                  </Text>
                </Tap>
              </View>
              
              {lastRxInfo && !prescription && (
                <Tap
                  onPress={() => {
                    const rx = lastRxInfo.rx;
                    const payload = {
                      date: new Date().toISOString().split('T')[0],
                      rDistSph: rx.rDistSph || '',
                      rDistCyl: rx.rDistCyl || '',
                      rDistAxis: rx.rDistAxis ?? null,
                      rDistVn: rx.rDistVn || '',
                      rNearSph: rx.rNearSph || '',
                      rNearCyl: rx.rNearCyl || '',
                      rNearAxis: rx.rNearAxis ?? null,
                      rNearVn: rx.rNearVn || '',
                      lDistSph: rx.lDistSph || '',
                      lDistCyl: rx.lDistCyl || '',
                      lDistAxis: rx.lDistAxis ?? null,
                      lDistVn: rx.lDistVn || '',
                      lNearSph: rx.lNearSph || '',
                      lNearCyl: rx.lNearCyl || '',
                      lNearAxis: rx.lNearAxis ?? null,
                      lNearVn: rx.lNearVn || '',
                      addR: rx.addR || '',
                      addL: rx.addL || '',
                      pd: rx.pd || '',
                      lensTypes: rx.lensTypes || [],
                      remarks: rx.remarks || '',
                    };
                    setPrescription(payload);
                    flashToast('Previous Rx attached to bill');
                  }}
                  style={{
                    padding: 12, borderRadius: Radius.tile, borderWidth: 1.5, borderColor: Colors.success,
                    backgroundColor: Colors.successTile, alignItems: 'center', justifyContent: 'center', marginTop: 4
                  }}
                >
                  <Text style={{ fontFamily: Font.bold, fontSize: 13, color: Colors.success }}>
                    Use last Rx ({new Date(lastRxInfo.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })})
                  </Text>
                </Tap>
              )}

              <View style={{ gap: 10, marginTop: 4 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: Font.semibold, fontSize: 12, color: Colors.textSecondary, marginBottom: 4 }}>Order Status</Text>
                    <SegmentedControl
                      options={[
                        { key: 'pending', label: 'Pending' },
                        { key: 'ready', label: 'Ready' },
                        { key: 'delivered', label: 'Delivered' },
                      ]}
                      value={orderStatus}
                      onChange={(val) => setOrderStatus(val as any)}
                      accent={theme.accent}
                    />
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: Font.semibold, fontSize: 12, color: Colors.textSecondary, marginBottom: 4 }}>Delivery Date (optional)</Text>
                  <SheetField
                    placeholder="YYYY-MM-DD (e.g. 2026-06-18)"
                    value={deliveryDate}
                    onChangeText={(t) => {
                      setDeliveryDate(t);
                      if (t.trim() && orderStatus === 'delivered') {
                        setOrderStatus('pending');
                      }
                    }}
                    accent={theme.accent}
                    height={44}
                  />
                </View>
              </View>
            </Card>
          )}

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
            {/* Full payment vs advance / part payment */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: Font.bold, fontSize: 13.5, color: Colors.textPrimary }}>Payment</Text>
              <View style={{ flexDirection: 'row', backgroundColor: Colors.segmentBg, borderRadius: Radius.tile, padding: 3 }}>
                {(['full', 'advance'] as const).map((k) => {
                  const active = cb.payKind === k;
                  return (
                    <Tap key={k} onPress={() => cbSet({ payKind: k })} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.chip, backgroundColor: active ? Colors.canvas : 'transparent' }}>
                      <Text style={{ fontFamily: Font.bold, fontSize: 12.5, color: active ? theme.accent : Colors.textSecondary }}>
                        {k === 'full' ? 'Full payment' : 'Advance / Part'}
                      </Text>
                    </Tap>
                  );
                })}
              </View>
            </View>

            {!isAdvance ? (
              <View style={{ flexDirection: 'row', gap: 9 }}>
                {PAY_MODES.map(({ mode, icon }) => {
                  const active = cb.payMode === mode;
                  return (
                    <Tap
                      key={mode}
                      onPress={() => cbSet({ payMode: mode })}
                      style={{
                        flex: 1, height: 50, borderRadius: Radius.tile, borderWidth: 1.5,
                        borderColor: active ? theme.accent : Colors.border, backgroundColor: active ? theme.tile : Colors.canvas,
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}
                    >
                      <Sym name={icon} size={18} color={active ? theme.accent : Colors.textSecondary} />
                      <Text style={{ fontFamily: Font.bold, fontSize: 13, color: active ? theme.accent : Colors.textSecondary }}>{mode}</Text>
                    </Tap>
                  );
                })}
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                <SheetField placeholder="Amount received now (₹)" value={cb.receivedInput} onChangeText={(t) => cbSet({ receivedInput: t })} accent={theme.accent} height={48} keyboardType="number-pad" />
                <View style={{ flexDirection: 'row', gap: 9 }}>
                  {(['Cash', 'UPI'] as const).map((m) => {
                    const active = cb.receivedMode === m;
                    return (
                      <Tap
                        key={m}
                        onPress={() => cbSet({ receivedMode: m })}
                        style={{
                          flex: 1, height: 46, borderRadius: Radius.tile, borderWidth: 1.5,
                          borderColor: active ? theme.accent : Colors.border, backgroundColor: active ? theme.tile : Colors.canvas,
                          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                      >
                        <Sym name={m === 'Cash' ? 'payments' : 'qr_code_2'} size={17} color={active ? theme.accent : Colors.textSecondary} />
                        <Text style={{ fontFamily: Font.bold, fontSize: 13, color: active ? theme.accent : Colors.textSecondary }}>{`Received in ${m}`}</Text>
                      </Tap>
                    );
                  })}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
                  <Text style={{ fontFamily: Font.semibold, fontSize: 13, color: Colors.textSecondary }}>Balance due (to Khata)</Text>
                  <Money value={balanceDueRupees} style={[{ fontFamily: Font.extrabold, fontSize: 18, color: Colors.danger }, tnum]} />
                </View>
                <Text style={{ fontFamily: Font.medium, fontSize: 11.5, color: Colors.textMuted }}>
                  The balance is added to the customer's Khata. Collect it later from their page.
                </Text>
              </View>
            )}
          </Card>
        </ScrollView>
      </OverlayShell>
      {rxModalOpen && (
        <OverlayShell
          title="Eye Prescription (Rx)"
          closeIcon="close"
          onClose={() => setRxModalOpen(false)}
          bg={theme.bg}
          footer={
            <PrimaryButton
              label="Save Prescription"
              icon="check"
              onPress={() => {
                const payload = {
                  date: new Date().toISOString().split('T')[0],
                  rDistSph,
                  rDistCyl,
                  rDistAxis: parseInt(rDistAxis, 10) || null,
                  rDistVn,
                  rNearSph,
                  rNearCyl,
                  rNearAxis: parseInt(rNearAxis, 10) || null,
                  rNearVn,
                  lDistSph,
                  lDistCyl,
                  lDistAxis: parseInt(lDistAxis, 10) || null,
                  lDistVn,
                  lNearSph,
                  lNearCyl,
                  lNearAxis: parseInt(lNearAxis, 10) || null,
                  lNearVn,
                  addR,
                  addL,
                  pd,
                  lensTypes,
                  remarks,
                };
                setPrescription(payload);
                setRxModalOpen(false);
                flashToast('Eye prescription attached to bill');
              }}
            />
          }
        >
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 14 }} keyboardShouldPersistTaps="handled">
            {lastRxInfo && (
              <Tap
                onPress={() => {
                  const rx = lastRxInfo.rx;
                  setRDistSph(rx.rDistSph || '');
                  setRDistCyl(rx.rDistCyl || '');
                  setRDistAxis(rx.rDistAxis ? String(rx.rDistAxis) : '');
                  setRDistVn(rx.rDistVn || '');
                  setRNearSph(rx.rNearSph || '');
                  setRNearCyl(rx.rNearCyl || '');
                  setRNearAxis(rx.rNearAxis ? String(rx.rNearAxis) : '');
                  setRNearVn(rx.rNearVn || '');
                  
                  setLDistSph(rx.lDistSph || '');
                  setLDistCyl(rx.lDistCyl || '');
                  setLDistAxis(rx.lDistAxis ? String(rx.lDistAxis) : '');
                  setLDistVn(rx.lDistVn || '');
                  setLNearSph(rx.lNearSph || '');
                  setLNearCyl(rx.lNearCyl || '');
                  setLNearAxis(rx.lNearAxis ? String(rx.lNearAxis) : '');
                  setLNearVn(rx.lNearVn || '');

                  setAddR(rx.addR || '');
                  setAddL(rx.addL || '');
                  setPd(rx.pd || '');
                  setRemarks(rx.remarks || '');
                  setLensTypes(rx.lensTypes || []);
                  flashToast('Last Rx loaded successfully');
                }}
                style={{
                  padding: 12, borderRadius: Radius.tile, borderWidth: 1.5, borderColor: Colors.success,
                  backgroundColor: Colors.successTile, alignItems: 'center', justifyContent: 'center', marginBottom: 6
                }}
              >
                <Text style={{ fontFamily: Font.bold, fontSize: 13, color: Colors.success }}>
                  Use last Rx ({new Date(lastRxInfo.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })})
                </Text>
              </Tap>
            )}

            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 4 }}>
              <Text style={{ width: 60, fontFamily: Font.bold, fontSize: 11, color: Colors.textSecondary }}>Eye (Dist)</Text>
              <Text style={{ flex: 1, textAlign: 'center', fontFamily: Font.bold, fontSize: 11, color: Colors.textSecondary }}>SPH</Text>
              <Text style={{ flex: 1, textAlign: 'center', fontFamily: Font.bold, fontSize: 11, color: Colors.textSecondary }}>CYL</Text>
              <Text style={{ width: 44, textAlign: 'center', fontFamily: Font.bold, fontSize: 11, color: Colors.textSecondary }}>Axis</Text>
              <Text style={{ width: 44, textAlign: 'center', fontFamily: Font.bold, fontSize: 11, color: Colors.textSecondary }}>V.A.</Text>
            </View>

            {/* Right eye distance */}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Text style={{ width: 60, fontFamily: Font.bold, fontSize: 12, color: Colors.textPrimary }}>R. Dist</Text>
              <RxPowerCell flex={1} display={rDistSph} accent={theme.accent} onPress={() => openWheelDual('Right · Distance · SPH', rxWheel.sph, rDistSph, setRDistSph)} />
              <RxPowerCell flex={1} display={rDistCyl} accent={theme.accent} onPress={() => openWheelDual('Right · Distance · CYL', rxWheel.cyl, rDistCyl, setRDistCyl)} />
              <RxPowerCell width={44} display={rDistAxis ? `${rDistAxis}°` : ''} accent={theme.accent} onPress={() => openWheelSingle('Right · Distance · AXIS', rxWheel.axis, rDistAxis, setRDistAxis)} />
              <TextInput
                value={rDistVn}
                onChangeText={setRDistVn}
                placeholder="V.A."
                style={{ width: 44, height: 38, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, backgroundColor: Colors.inputBg, textAlign: 'center', fontFamily: Font.semibold, fontSize: 11, color: Colors.textPrimary }}
              />
            </View>

            {/* Right eye near */}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Text style={{ width: 60, fontFamily: Font.bold, fontSize: 12, color: Colors.textPrimary }}>R. Near</Text>
              <RxPowerCell flex={1} display={rNearSph} accent={theme.accent} onPress={() => openWheelDual('Right · Near · SPH', rxWheel.sph, rNearSph, setRNearSph)} />
              <RxPowerCell flex={1} display={rNearCyl} accent={theme.accent} onPress={() => openWheelDual('Right · Near · CYL', rxWheel.cyl, rNearCyl, setRNearCyl)} />
              <RxPowerCell width={44} display={rNearAxis ? `${rNearAxis}°` : ''} accent={theme.accent} onPress={() => openWheelSingle('Right · Near · AXIS', rxWheel.axis, rNearAxis, setRNearAxis)} />
              <TextInput
                value={rNearVn}
                onChangeText={setRNearVn}
                placeholder="V.A."
                style={{ width: 44, height: 38, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, backgroundColor: Colors.inputBg, textAlign: 'center', fontFamily: Font.semibold, fontSize: 11, color: Colors.textPrimary }}
              />
            </View>

            {/* Left eye distance */}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Text style={{ width: 60, fontFamily: Font.bold, fontSize: 12, color: Colors.textPrimary }}>L. Dist</Text>
              <RxPowerCell flex={1} display={lDistSph} accent={theme.accent} onPress={() => openWheelDual('Left · Distance · SPH', rxWheel.sph, lDistSph, setLDistSph)} />
              <RxPowerCell flex={1} display={lDistCyl} accent={theme.accent} onPress={() => openWheelDual('Left · Distance · CYL', rxWheel.cyl, lDistCyl, setLDistCyl)} />
              <RxPowerCell width={44} display={lDistAxis ? `${lDistAxis}°` : ''} accent={theme.accent} onPress={() => openWheelSingle('Left · Distance · AXIS', rxWheel.axis, lDistAxis, setLDistAxis)} />
              <TextInput
                value={lDistVn}
                onChangeText={setLDistVn}
                placeholder="V.A."
                style={{ width: 44, height: 38, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, backgroundColor: Colors.inputBg, textAlign: 'center', fontFamily: Font.semibold, fontSize: 11, color: Colors.textPrimary }}
              />
            </View>

            {/* Left eye near */}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Text style={{ width: 60, fontFamily: Font.bold, fontSize: 12, color: Colors.textPrimary }}>L. Near</Text>
              <RxPowerCell flex={1} display={lNearSph} accent={theme.accent} onPress={() => openWheelDual('Left · Near · SPH', rxWheel.sph, lNearSph, setLNearSph)} />
              <RxPowerCell flex={1} display={lNearCyl} accent={theme.accent} onPress={() => openWheelDual('Left · Near · CYL', rxWheel.cyl, lNearCyl, setLNearCyl)} />
              <RxPowerCell width={44} display={lNearAxis ? `${lNearAxis}°` : ''} accent={theme.accent} onPress={() => openWheelSingle('Left · Near · AXIS', rxWheel.axis, lNearAxis, setLNearAxis)} />
              <TextInput
                value={lNearVn}
                onChangeText={setLNearVn}
                placeholder="V.A."
                style={{ width: 44, height: 38, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, backgroundColor: Colors.inputBg, textAlign: 'center', fontFamily: Font.semibold, fontSize: 11, color: Colors.textPrimary }}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: Font.semibold, fontSize: 12, color: Colors.textSecondary, marginBottom: 4 }}>Add R</Text>
                <RxPowerCell display={addR} accent={theme.accent} onPress={() => openWheelSingle('Right · ADD', rxWheel.add, addR, setAddR)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: Font.semibold, fontSize: 12, color: Colors.textSecondary, marginBottom: 4 }}>Add L</Text>
                <RxPowerCell display={addL} accent={theme.accent} onPress={() => openWheelSingle('Left · ADD', rxWheel.add, addL, setAddL)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: Font.semibold, fontSize: 12, color: Colors.textSecondary, marginBottom: 4 }}>P.D. (mm)</Text>
                <SheetField placeholder="64" value={pd} onChangeText={setPd} accent={theme.accent} height={38} />
              </View>
            </View>

            <View style={{ gap: 6, marginTop: 4 }}>
              <Text style={{ fontFamily: Font.semibold, fontSize: 12, color: Colors.textSecondary }}>Lens Types</Text>
              <View style={{ flexWrap: 'wrap', flexDirection: 'row', gap: 6 }}>
                {[
                  'Single Vision', 'Bifocal', 'Progressive',
                  'CR-39', 'Anti-reflection', 'Blue Cut',
                  'Photochromic', 'Glass', 'Plastic'
                ].map((chip) => {
                  const active = lensTypes.includes(chip);
                  return (
                    <Tap
                      key={chip}
                      onPress={() => {
                        if (active) {
                          setLensTypes(lensTypes.filter((c) => c !== chip));
                        } else {
                          setLensTypes([...lensTypes, chip]);
                        }
                      }}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: Radius.chip,
                        borderWidth: 1.5,
                        borderColor: active ? theme.accent : Colors.border,
                        backgroundColor: active ? theme.tile : Colors.canvas,
                      }}
                    >
                      <Text style={{ fontFamily: Font.bold, fontSize: 11, color: active ? theme.accent : Colors.textSecondary }}>
                        {chip}
                      </Text>
                    </Tap>
                  );
                })}
              </View>
            </View>

            <View style={{ gap: 4, marginTop: 4 }}>
              <Text style={{ fontFamily: Font.semibold, fontSize: 12, color: Colors.textSecondary }}>Remarks</Text>
              <SheetField placeholder="Any special notes or fitting instructions..." value={remarks} onChangeText={setRemarks} accent={theme.accent} height={38} />
            </View>
          </ScrollView>
        </OverlayShell>
      )}
      {wheel && (
        <PowerWheelSheet
          title={wheel.title}
          options={wheel.options}
          dual={wheel.dual}
          value={wheel.value}
          accent={theme.accent}
          onSelect={wheel.onSelect}
          onClose={() => setWheel(null)}
        />
      )}
    </>
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

/**
 * Tappable Rx power cell — shows the set value (accent-tinted) or "—" when blank,
 * and opens the wheel picker on press. No keyboard entry. Optional by design.
 */
function RxPowerCell({
  display,
  accent,
  onPress,
  width,
  flex,
}: {
  display: string;
  accent: string;
  onPress: () => void;
  width?: number;
  flex?: number;
}) {
  const empty = !display;
  return (
    <Tap
      onPress={onPress}
      hitSlop={8}
      style={{
        width,
        flex,
        height: 38,
        borderWidth: 1.5,
        borderColor: empty ? Colors.border : accent,
        borderRadius: 6,
        backgroundColor: empty ? Colors.inputBg : `${accent}12`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text numberOfLines={1} style={{ fontFamily: Font.bold, fontSize: 12, color: empty ? Colors.textMuted : Colors.textPrimary }}>
        {empty ? '—' : display}
      </Text>
    </Tap>
  );
}
