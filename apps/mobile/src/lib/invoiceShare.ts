/**
 * Invoice sharing — PDF generation (on-device via expo-print, so it works in
 * both mock and real mode) and the professional WhatsApp message. The on-screen
 * invoice, the PDF, and the WhatsApp text all describe the same bill.
 */
import { Linking } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { formatINR } from './format';
import type { BillResult, Business } from '@/data/types';

interface ShareOpts {
  /** UPI deep link for the QR (UPI bills only). */
  upiUri?: string | null;
  /** Pre-rendered QR PNG (base64, no data: prefix) to embed in the PDF. */
  qrPngBase64?: string | null;
  /** UPI id printed under the QR. */
  upiId?: string | null;
  /** Hosted PDF URL (Supabase Storage) for the WhatsApp message, when available. */
  pdfUrl?: string | null;
  /** Customer phone (any format) for wa.me targeting. */
  customerPhone?: string | null;
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function isPaid(bill: BillResult): boolean {
  return bill.paymentMode !== 'CREDIT';
}

/** Professional invoice HTML mirroring the on-screen InvoiceCard. */
export function invoiceHtml(bill: BillResult, business: Business | null, opts: ShareOpts = {}): string {
  const gst = bill.gstMode === 'gst' && bill.taxTotal > 0;
  const rows = bill.items
    .map(
      (i) => `<tr>
        <td class="name">${esc(i.name)} <span class="qty">× ${i.qty}</span></td>
        <td class="amt">${formatINR(i.lineTotal)}</td>
      </tr>`,
    )
    .join('');

  const taxRows = gst
    ? bill.taxKind === 'inter'
      ? `<tr><td>IGST</td><td>${formatINR(bill.igst)}</td></tr>`
      : `<tr><td>CGST</td><td>${formatINR(bill.cgst)}</td></tr>
         <tr><td>SGST</td><td>${formatINR(bill.sgst)}</td></tr>`
    : '';

  const discountRow = bill.discount > 0 ? `<tr><td>Discount</td><td>− ${formatINR(bill.discount)}</td></tr>` : '';

  const qrBlock =
    bill.paymentMode === 'UPI' && (opts.qrPngBase64 || opts.upiId)
      ? `<div class="qr">
          ${opts.qrPngBase64 ? `<img src="data:image/png;base64,${opts.qrPngBase64}" width="120" height="120" />` : ''}
          <div class="qrtext">
            <div class="qrh">Scan to pay via UPI</div>
            <div class="qramt">${formatINR(bill.grandTotal)}</div>
            <div class="qrid">${esc(opts.upiId ?? '')}</div>
          </div>
        </div>`
      : '';

  const paid = isPaid(bill);
  const statusChip = `<span class="status ${paid ? 'paid' : 'unpaid'}">${paid ? 'PAID' : 'UNPAID'}</span>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #0F1222; padding: 28px; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; }
    .shop { font-size: 22px; font-weight: 800; }
    .gstin { font-size: 12px; color: #6B7280; margin-top: 4px; }
    .inv { text-align: right; }
    .invno { font-size: 13px; font-weight: 700; color: #6D28D9; }
    .date { font-size: 12px; color: #9AA0AC; margin-top: 2px; }
    .status { display: inline-block; margin-top: 6px; font-size: 11px; font-weight: 800; padding: 3px 9px; border-radius: 7px; }
    .status.paid { color: #16A34A; background: #E8F7F0; }
    .status.unpaid { color: #E5484D; background: #FDECF2; }
    .billed { font-size: 13px; color: #6B7280; margin: 14px 0; }
    hr { border: none; border-top: 1px dashed #E3E5EC; margin: 8px 0 4px; }
    table { width: 100%; border-collapse: collapse; }
    .items td { padding: 10px 0; border-bottom: 1px solid #F4F5F8; font-size: 14px; }
    .items .name { font-weight: 600; }
    .items .qty { color: #9AA0AC; font-weight: 500; }
    .items .amt { text-align: right; font-weight: 700; }
    .totals { margin-top: 12px; }
    .totals td { padding: 5px 0; font-size: 13.5px; color: #6B7280; }
    .totals td:last-child { text-align: right; color: #0F1222; font-weight: 600; }
    .grand td { border-top: 1.5px solid #EEF0F4; padding-top: 12px; font-size: 16px; font-weight: 800; color: #0F1222; }
    .grand td:last-child { color: #6D28D9; font-size: 22px; }
    .qr { display: flex; align-items: center; gap: 18px; background: #F7F8FA; border-radius: 14px; padding: 18px; margin-top: 22px; }
    .qrh { font-size: 13px; font-weight: 600; }
    .qramt { font-size: 20px; font-weight: 800; color: #6D28D9; margin-top: 4px; }
    .qrid { font-size: 12px; color: #9AA0AC; margin-top: 3px; }
    .foot { text-align: center; color: #9AA0AC; font-size: 11px; margin-top: 26px; }
  </style></head>
  <body>
    <div class="head">
      <div>
        <div class="shop">${esc(business?.name ?? 'Invoice')}</div>
        ${gst && business?.gstin ? `<div class="gstin">GSTIN ${esc(business.gstin)}</div>` : ''}
      </div>
      <div class="inv">
        <div class="invno">${esc(bill.invoiceNo)}</div>
        <div class="date">${esc(bill.date)}</div>
        ${statusChip}
      </div>
    </div>
    <div class="billed">Billed to ${esc(bill.customerName || 'Walk-in customer')}</div>
    <hr />
    <table class="items"><tbody>${rows}</tbody></table>
    <table class="totals"><tbody>
      <tr><td>Subtotal</td><td>${formatINR(bill.subtotal)}</td></tr>
      ${discountRow}
      ${taxRows}
      <tr class="grand"><td>Total</td><td>${formatINR(bill.grandTotal)}</td></tr>
    </tbody></table>
    ${qrBlock}
    <div class="foot">Thank you for your business · Powered by Claro</div>
  </body></html>`;
}

/** Generate the invoice PDF on-device and open the native share sheet. */
export async function sharePdfFile(bill: BillResult, business: Business | null, opts: ShareOpts = {}): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html: invoiceHtml(bill, business, opts) });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `${bill.invoiceNo}.pdf`, UTI: 'com.adobe.pdf' });
  }
}

/** The WhatsApp message — shop, invoice no, items, total, PAID/UNPAID, link. */
export function buildInvoiceMessage(bill: BillResult, business: Business | null, opts: ShareOpts = {}): string {
  const lines = [
    `*${business?.name ?? 'Invoice'}*  ·  ${bill.invoiceNo}`,
    ...bill.items.map((i) => `• ${i.name} × ${i.qty} — ${formatINR(i.lineTotal)}`),
  ];
  if (bill.discount > 0) lines.push(`Discount: − ${formatINR(bill.discount)}`);
  lines.push(`*Total: ${formatINR(bill.grandTotal)}*`);
  lines.push(isPaid(bill) ? '✅ Status: PAID' : '🟠 Status: UNPAID');
  if (opts.upiId && !isPaid(bill)) lines.push(`Pay via UPI: ${opts.upiId}`);
  if (opts.pdfUrl) lines.push(`Invoice PDF: ${opts.pdfUrl}`);
  lines.push('', `Thank you! — ${business?.name ?? ''}`.trim());
  return lines.join('\n');
}

function waTarget(phone: string | null | undefined): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.length >= 10 ? `91${digits.slice(-10)}` : '';
}

/** Open WhatsApp pre-filled with the professional invoice message (+ hosted link). */
export async function shareWhatsAppInvoice(bill: BillResult, business: Business | null, opts: ShareOpts = {}): Promise<void> {
  const text = encodeURIComponent(buildInvoiceMessage(bill, business, opts));
  const target = waTarget(opts.customerPhone);
  await Linking.openURL(`https://wa.me/${target}?text=${text}`);
}
