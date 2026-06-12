import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { OverlayShell } from './OverlayShell';
import { InvoiceCard } from './InvoiceCard';
import { ScanPayOverlay } from './ScanPayOverlay';
import { OutlineButton } from '@/components/atoms/Button';
import { WhatsAppIcon } from '@/components/atoms/WhatsAppIcon';
import { EmptyState } from '@/components/molecules/EmptyState';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { buildUpiUri } from '@/lib/upi';
import { sharePdfFile, shareWhatsAppInvoice } from '@/lib/invoiceShare';
import { usePageTheme } from '@/theme/pageThemes';
import { useAppStore } from '@/state/store';
import type { BillItem } from '@/state/store';

/** Read-only invoice summary — opened by tapping a transaction in the feed (A5). */
export function InvoiceSummaryOverlay() {
  const theme = usePageTheme('billing');
  const billId = useAppStore((s) => s.selBill);
  const business = useAppStore((s) => s.business);
  const closeOverlay = useAppStore((s) => s.closeOverlay);
  const flashToast = useAppStore((s) => s.flashToast);
  const [scanOpen, setScanOpen] = useState(false);

  const { data: bill, error } = useApi(() => api.getBill(billId ?? ''), [billId]);
  const { data: methods } = useApi(() => api.getPaymentMethods());

  const defaultMethod = (methods ?? []).find((m) => m.isDefault) ?? (methods ?? [])[0] ?? null;
  const isUpi = bill?.paymentMode === 'UPI';
  const upiUri = bill && defaultMethod
    ? buildUpiUri({ vpa: defaultMethod.upiId, payeeName: business?.name ?? '', amountRupees: bill.grandTotal, note: bill.invoiceNo })
    : null;

  const items: BillItem[] = (bill?.items ?? []).map((it, i) => ({
    id: String(i), name: it.name, price: it.price, qty: it.qty,
    inventoryItemId: null, taxRateBps: 0, inclusive: true,
  }));

  const totals = bill
    ? { subtotal: bill.subtotal, discount: bill.discount, taxable: bill.taxable, cgst: bill.cgst,
        sgst: bill.sgst, igst: bill.igst, taxTotal: bill.taxTotal, grand: bill.grandTotal, taxKind: bill.taxKind }
    : { subtotal: 0, discount: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, taxTotal: 0, grand: 0, taxKind: 'none' as const };

  const shareDetails = async () => {
    if (!bill) return {};
    const upi = isUpi ? await api.getBillUpi(bill.id).catch(() => null) : null;
    const link = await api.getBillShareLink(bill.id).catch(() => null);
    return { pdfUrl: link };
  };

  return (
    <>
      <OverlayShell title="Invoice" closeIcon="arrow_back" onClose={closeOverlay} bg={theme.bg}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 30 }}>
          {error || !bill ? (
            <EmptyState
              icon="cloud_off"
              tileBg={theme.tile}
              tileFg={theme.accent}
              title={error ? "Couldn't load this invoice" : 'Loading…'}
              sub={error ?? 'Fetching the bill details.'}
            />
          ) : (
            <>
              <InvoiceCard
                shopName={business?.name ?? ''}
                gstin={business?.gstin ?? ''}
                gstMode={bill.gstMode}
                customer={bill.customerName}
                items={items}
                invoiceNo={bill.invoiceNo}
                date={bill.date}
                accent={theme.accent}
                totals={totals}
                showQr={isUpi}
                upiUri={upiUri}
                qrImageUrl={defaultMethod?.qrImageUrl ?? null}
                upiLabel={defaultMethod ? defaultMethod.label || defaultMethod.upiId : business?.name}
                onQrPress={() => setScanOpen(true)}
              />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <OutlineButton
                  label="PDF"
                  icon="picture_as_pdf"
                  style={{ flex: 1 }}
                  fontSize={14}
                  onPress={async () => {
                    try { await sharePdfFile(bill, business, await shareDetails()); }
                    catch (e) { flashToast((e as Error).message); }
                  }}
                />
                <OutlineButton
                  label="WhatsApp"
                  iconNode={<WhatsAppIcon size={18} />}
                  style={{ flex: 1 }}
                  fontSize={14}
                  onPress={async () => {
                    try { await shareWhatsAppInvoice(bill, business, await shareDetails()); }
                    catch { flashToast('Could not open WhatsApp'); }
                  }}
                />
              </View>
            </>
          )}
        </ScrollView>
      </OverlayShell>
      {scanOpen && bill ? (
        <ScanPayOverlay
          shopName={business?.name ?? ''}
          amountRupees={bill.grandTotal}
          methods={methods ?? []}
          selectedId={defaultMethod?.id ?? null}
          onSelect={() => undefined}
          onClose={() => setScanOpen(false)}
          bg={theme.bg}
          accent={theme.accent}
          tile={theme.tile}
        />
      ) : null}
    </>
  );
}
