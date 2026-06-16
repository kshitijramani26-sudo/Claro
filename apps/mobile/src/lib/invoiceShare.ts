/**
 * Invoice sharing — PDF generation (on-device via expo-print) and WhatsApp message.
 * The bill document contains NO QR code — only a PAID/UNPAID status badge.
 * (The separate scan-to-pay QR lives only in the post-confirm UPI flow.)
 */
import { Linking } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { formatINR } from './format';
import type { BillResult, Business } from '@/data/types';

interface ShareOpts {
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

// ─── Amount in words (Indian lakh system) ───────────────────────────────────

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
               'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
               'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function belowHundred(n: number): string {
  if (n < 20) return ones[n] ?? '';
  return (tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')).trim();
}

function belowThousand(n: number): string {
  if (n < 100) return belowHundred(n);
  return `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ' ' + belowHundred(n % 100) : ''}`;
}

export function amountInWords(rupees: number): string {
  const n = Math.round(Math.abs(rupees));
  if (n === 0) return 'Zero Rupees Only';
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rem = n % 1000;
  const parts: string[] = [];
  if (crore) parts.push(`${belowThousand(crore)} Crore`);
  if (lakh) parts.push(`${belowHundred(lakh)} Lakh`);
  if (thousand) parts.push(`${belowThousand(thousand)} Thousand`);
  if (rem) parts.push(belowThousand(rem));
  return parts.join(' ') + ' Rupees Only';
}

// ─── Invoice HTML ────────────────────────────────────────────────────────────

/** BillBook-grade professional invoice HTML — A4, Claro theme, no QR. */
export function invoiceHtml(bill: BillResult, business: Business | null, _opts: ShareOpts = {}): string {
  const isGst = bill.gstMode === 'gst';
  const hasGstTax = isGst && bill.taxTotal > 0;
  const docTitle = isGst ? 'TAX INVOICE' : 'BILL OF SUPPLY';
  const paid = isPaid(bill);
  const received = bill.amountReceived;
  const balance = bill.balanceDue;
  const isPartial = bill.paymentMode === 'CREDIT' && received > 0;
  const statusClass = paid ? 'status-paid' : (isPartial ? 'status-partial' : 'status-unpaid');
  const statusLabel = paid ? '✓ PAID' : (isPartial ? '⏳ PARTIAL' : '⏳ UNPAID');

  // Build items rows
  const itemRows = bill.items.map((item) => {
    const rate = formatINR(item.price);
    const amount = formatINR(item.lineTotal);
    if (hasGstTax) {
      const hsn = item.hsnCode ?? '';
      const slabPct = item.taxRateBps != null ? `${item.taxRateBps / 100}%` : '';
      const taxAmt = item.taxPaise != null ? formatINR(item.taxPaise) : '';
      return `<tr>
        <td class="td-name">${esc(item.name)}</td>
        <td class="td-c">${esc(hsn)}</td>
        <td class="td-c">${item.qty}</td>
        <td class="td-r">${rate}</td>
        <td class="td-c">${esc(slabPct)}</td>
        <td class="td-r">${taxAmt}</td>
        <td class="td-r bold">${amount}</td>
      </tr>`;
    } else {
      return `<tr>
        <td class="td-name">${esc(item.name)}</td>
        <td class="td-c">${item.qty}</td>
        <td class="td-r">${rate}</td>
        <td class="td-r bold">${amount}</td>
      </tr>`;
    }
  }).join('');

  // GST tax summary by rate
  const taxSummaryRows = hasGstTax ? (() => {
    const byRate: Record<number, { taxable: number; tax: number }> = {};
    bill.items.forEach((item) => {
      if ((item.taxRateBps ?? 0) > 0 && item.taxable != null && item.taxPaise != null) {
        const slab = item.taxRateBps!;
        byRate[slab] = byRate[slab] ?? { taxable: 0, tax: 0 };
        byRate[slab].taxable += item.taxable;
        byRate[slab].tax += item.taxPaise;
      }
    });
    const rows = Object.entries(byRate).map(([bps, v]) =>
      `<tr><td>${Number(bps) / 100}%</td><td class="td-r">${formatINR(v.taxable)}</td><td class="td-r">${formatINR(v.tax)}</td></tr>`
    ).join('');
    if (!rows) return '';
    return `<div class="tax-summary">
      <div class="section-label">Tax Summary</div>
      <table class="ts-table">
        <thead><tr><th>GST Rate</th><th class="td-r">Taxable</th><th class="td-r">Tax</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  })() : '';

  // Header columns for GST vs non-GST items table
  const tableHead = hasGstTax
    ? `<tr><th class="th-name">ITEMS</th><th class="td-c">HSN</th><th class="td-c">QTY</th><th class="td-r">RATE</th><th class="td-c">GST</th><th class="td-r">TAX</th><th class="td-r">AMOUNT</th></tr>`
    : `<tr><th class="th-name">ITEMS</th><th class="td-c">QTY</th><th class="td-r">RATE</th><th class="td-r">AMOUNT</th></tr>`;

  // Tax rows in totals block
  let taxTotalsRows = '';
  if (hasGstTax) {
    if (bill.taxKind === 'inter') {
      taxTotalsRows = `<tr><td>IGST</td><td>${formatINR(bill.igst)}</td></tr>`;
    } else {
      taxTotalsRows = `<tr><td>CGST</td><td>${formatINR(bill.cgst)}</td></tr>
        <tr><td>SGST</td><td>${formatINR(bill.sgst)}</td></tr>`;
    }
  }

  const discountRow = bill.discount > 0
    ? `<tr><td>Discount</td><td class="neg">− ${formatINR(bill.discount)}</td></tr>` : '';

  return `<!DOCTYPE html><html><head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4; margin: 20mm 18mm; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px; color: #0F1222; background: #fff;
      padding: 32px 36px;
      max-width: 720px; margin: 0 auto;
    }

    /* ── Header ── */
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 18px; border-bottom: 2px solid #2D1150; }
    .shop-name { font-size: 22px; font-weight: 800; color: #2D1150; letter-spacing: -0.4px; }
    .shop-meta { font-size: 12px; color: #6B7280; margin-top: 4px; line-height: 1.7; }
    .doc-block { text-align: right; }
    .doc-title { font-size: 17px; font-weight: 800; color: #2D1150; letter-spacing: 0.5px; }
    .doc-original { display: inline-block; font-size: 9.5px; font-weight: 700; color: #2D1150;
      border: 1px solid #2D1150; border-radius: 4px; padding: 1px 6px; margin-top: 4px; letter-spacing: 0.8px; }
    .status-badge { display: inline-block; margin-top: 8px; font-size: 11px; font-weight: 800;
      padding: 3px 10px; border-radius: 6px; letter-spacing: 0.6px; }
    .status-paid { background: #E8F7F0; color: #16A34A; }
    .status-unpaid { background: #FDECF2; color: #E5484D; }
    .status-partial { background: #FEF3E2; color: #C2700A; }

    /* ── Meta band ── */
    .meta-band { display: flex; gap: 0; margin-top: 14px; border: 1px solid #ECE6F4; border-radius: 8px; overflow: hidden; }
    .meta-cell { flex: 1; padding: 10px 14px; border-right: 1px solid #ECE6F4; }
    .meta-cell:last-child { border-right: none; }
    .meta-label { font-size: 10px; font-weight: 600; color: #6B7280; letter-spacing: 0.5px; text-transform: uppercase; }
    .meta-value { font-size: 13px; font-weight: 700; color: #0F1222; margin-top: 3px; }

    /* ── Bill To ── */
    .bill-to { margin-top: 18px; }
    .section-label { font-size: 10px; font-weight: 700; color: #6B7280; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 4px; }
    .customer-name { font-size: 14.5px; font-weight: 700; color: #0F1222; }
    .customer-phone { font-size: 12px; color: #6B7280; margin-top: 2px; }

    /* ── Items table ── */
    .items-section { margin-top: 22px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #2D1150; }
    thead th { padding: 9px 10px; font-size: 10.5px; font-weight: 700; color: #fff;
      letter-spacing: 0.5px; text-align: left; }
    .th-name { padding-left: 14px; }
    .td-c { text-align: center !important; }
    .td-r { text-align: right !important; }
    tbody tr { border-bottom: 1px solid #F2F3F7; }
    tbody tr:last-child { border-bottom: none; }
    tbody td { padding: 10px 10px; font-size: 13px; color: #0F1222; }
    .td-name { padding-left: 14px; font-weight: 600; }
    .bold { font-weight: 700; }

    /* ── Totals ── */
    .totals-row { display: flex; justify-content: flex-end; margin-top: 16px; }
    .totals-inner { width: 280px; }
    .totals-inner table { width: 100%; }
    .totals-inner td { padding: 5px 0; font-size: 13px; color: #6B7280; }
    .totals-inner td:last-child { text-align: right; color: #0F1222; font-weight: 600; }
    .neg { color: #E5484D !important; }
    .totals-box { background: #F7F5FC; border: 1.5px solid #ECE6F4; border-radius: 10px;
      padding: 14px 18px; margin-top: 12px; }
    .totals-box table td { padding: 6px 0; font-size: 13.5px; }
    .totals-box .grand-label { font-size: 15px; font-weight: 800; color: #2D1150; }
    .totals-box .grand-val { font-size: 15px; font-weight: 800; color: #2D1150; }
    .totals-box .received-val { color: #16A34A; font-weight: 700; }
    .totals-box .balance-val { color: #E5484D; font-weight: 700; }
    .words-row { margin-top: 8px; font-size: 11.5px; color: #6B7280; font-style: italic; }
    .words-row span { font-weight: 600; color: #0F1222; }

    /* ── Tax summary ── */
    .tax-summary { margin-top: 18px; }
    .ts-table { width: auto; min-width: 280px; }
    .ts-table thead th { padding: 7px 12px; font-size: 10px; background: #ECE6F4; color: #2D1150; }
    .ts-table tbody td { padding: 6px 12px; font-size: 12px; border-bottom: 1px solid #F2F3F7; }

    /* ── Terms ── */
    .terms { margin-top: 22px; padding: 14px 18px; background: #FAFAFA;
      border: 1px solid #E7E9F2; border-radius: 8px; }
    .terms-body { font-size: 11.5px; color: #6B7280; line-height: 1.7; margin-top: 4px; }

    /* ── Rx Section ── */
    .rx-section { margin-top: 22px; }
    .rx-title { font-size: 11px; font-weight: 800; color: #2D1150; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .rx-table { width: 100%; border: 1.5px solid #ECE6F4; border-radius: 8px; overflow: hidden; border-collapse: collapse; }
    .rx-table th { padding: 6px 8px; font-size: 10px; background: #F7F5FC; color: #2D1150; font-weight: 700; border: 1px solid #ECE6F4; }
    .rx-table td { padding: 8px 8px; font-size: 11.5px; text-align: center; border: 1px solid #ECE6F4; }
    .rx-table td:first-child { text-align: left; font-weight: 700; background: #F7F5FC; width: 80px; }
    .rx-meta { margin-top: 10px; font-size: 12px; color: #6B7280; line-height: 1.6; }
    .rx-meta span { font-weight: 700; color: #0F1222; margin-right: 15px; }

    /* ── Footer ── */
    .footer { text-align: center; color: #6B7280; font-size: 11px; margin-top: 28px;
      padding-top: 14px; border-top: 1px dashed #E3E5EC; }
  </style></head>
  <body>
    <!-- Header -->
    <div class="header">
      <div>
        <div class="shop-name">${esc(business?.name ?? 'Invoice')}</div>
        <div class="shop-meta">
          ${business?.phone ? `Mobile: ${esc(business.phone)}` : ''}
          ${business?.address ? `<br/>${esc(business.address)}` : ''}
          ${hasGstTax && business?.gstin ? `<br/>GSTIN: ${esc(business.gstin)}` : ''}
        </div>
      </div>
      <div class="doc-block">
        <div class="doc-title">${docTitle}</div>
        <div><span class="doc-original">ORIGINAL</span></div>
        <div><span class="status-badge ${statusClass}">${statusLabel}</span></div>
      </div>
    </div>

    <!-- Meta band: Invoice No | Date | Due Date -->
    <div class="meta-band">
      <div class="meta-cell">
        <div class="meta-label">Invoice No.</div>
        <div class="meta-value">${esc(bill.invoiceNo)}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-label">Invoice Date</div>
        <div class="meta-value">${esc(bill.date)}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-label">Due Date</div>
        <div class="meta-value">${paid ? esc(bill.date) : 'Upon receipt'}</div>
      </div>
      ${bill.deliveryDate ? `
      <div class="meta-cell">
        <div class="meta-label">Delivery Date</div>
        <div class="meta-value">${esc(bill.deliveryDate)}</div>
      </div>
      ` : ''}
    </div>

    <!-- Bill To -->
    ${bill.customerName ? `<div class="bill-to">
      <div class="section-label">Bill To</div>
      <div class="customer-name">${esc(bill.customerName)}</div>
    </div>` : ''}

    <!-- Items table -->
    <div class="items-section">
      <table>
        <thead>${tableHead}</thead>
        <tbody>${itemRows}</tbody>
      </table>
    </div>

    <!-- Totals -->
    <div class="totals-row">
      <div class="totals-inner">
        <table>
          <tr><td>Subtotal</td><td>${formatINR(bill.subtotal)}</td></tr>
          ${discountRow}
          ${taxTotalsRows}
        </table>
        <div class="totals-box">
          <table>
            <tr>
              <td class="grand-label">Total Amount</td>
              <td class="grand-val td-r">${formatINR(bill.grandTotal)}</td>
            </tr>
            <tr>
              <td style="color:#6B7280">Received</td>
              <td class="received-val td-r">${formatINR(received)}</td>
            </tr>
            <tr>
              <td style="color:#6B7280">Balance Due</td>
              <td class="${balance > 0 ? 'balance-val' : 'received-val'} td-r">${formatINR(balance)}</td>
            </tr>
          </table>
        </div>
        <div class="words-row"><span>${amountInWords(bill.grandTotal)}</span></div>
      </div>
    </div>

    ${taxSummaryRows}

    <!-- Eye Prescription (Rx) -->
    ${bill.prescription ? (() => {
      const rx = bill.prescription;
      const rxRow = (label: string, sph: string, cyl: string, axis: any, vn: string) => {
        if (!sph && !cyl && !axis && !vn) return '';
        return `<tr>
          <td>${label}</td>
          <td>${esc(sph || '—')}</td>
          <td>${esc(cyl || '—')}</td>
          <td>${axis != null ? esc(String(axis)) : '—'}</td>
          <td>${esc(vn || '—')}</td>
        </tr>`;
      };
      
      const rDist = rxRow('R. Dist', rx.rDistSph, rx.rDistCyl, rx.rDistAxis, rx.rDistVn);
      const rNear = rxRow('R. Near', rx.rNearSph, rx.rNearCyl, rx.rNearAxis, rx.rNearVn);
      const lDist = rxRow('L. Dist', rx.lDistSph, rx.lDistCyl, rx.lDistAxis, rx.lDistVn);
      const lNear = rxRow('L. Near', rx.lNearSph, rx.lNearCyl, rx.lNearAxis, rx.lNearVn);
      
      if (!rDist && !rNear && !lDist && !lNear) return '';
      
      return `<div class="rx-section" style="margin-top: 22px;">
        <div class="rx-title" style="font-size: 11px; font-weight: 800; color: #2D1150; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Eye Prescription (Rx)</div>
        <table class="rx-table" style="width: 100%; border: 1.5px solid #ECE6F4; border-radius: 8px; overflow: hidden; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="padding: 6px 8px; font-size: 10px; background: #F7F5FC; color: #2D1150; font-weight: 700; border: 1px solid #ECE6F4; text-align: left;">Eye</th>
              <th style="padding: 6px 8px; font-size: 10px; background: #F7F5FC; color: #2D1150; font-weight: 700; border: 1px solid #ECE6F4; text-align: center;">SPH</th>
              <th style="padding: 6px 8px; font-size: 10px; background: #F7F5FC; color: #2D1150; font-weight: 700; border: 1px solid #ECE6F4; text-align: center;">CYL</th>
              <th style="padding: 6px 8px; font-size: 10px; background: #F7F5FC; color: #2D1150; font-weight: 700; border: 1px solid #ECE6F4; text-align: center;">Axis</th>
              <th style="padding: 6px 8px; font-size: 10px; background: #F7F5FC; color: #2D1150; font-weight: 700; border: 1px solid #ECE6F4; text-align: center;">V.A.</th>
            </tr>
          </thead>
          <tbody>
            ${rDist}
            ${rNear}
            ${lDist}
            ${lNear}
          </tbody>
        </table>
        <div class="rx-meta" style="margin-top: 10px; font-size: 12px; color: #6B7280; line-height: 1.6;">
          ${rx.addR ? `<span>Add R: <b>${esc(rx.addR)}</b></span>` : ''}
          ${rx.addL ? `<span>Add L: <b>${esc(rx.addL)}</b></span>` : ''}
          ${rx.pd ? `<span>P.D.: <b>${esc(rx.pd)} mm</b></span>` : ''}
          ${rx.lensTypes && rx.lensTypes.length > 0 ? `<br/><span>Lens: <b>${esc(rx.lensTypes.join(', '))}</b></span>` : ''}
          ${rx.remarks ? `<br/><span>Remarks: <i>${esc(rx.remarks)}</i></span>` : ''}
        </div>
      </div>`;
    })() : ''}

    <!-- Terms & Conditions -->
    <div class="terms">
      <div class="section-label">Terms &amp; Conditions</div>
      <div class="terms-body">
        1. Goods once sold will not be taken back or exchanged.<br/>
        2. All disputes are subject to local jurisdiction only.<br/>
        3. Payment due upon receipt unless credit terms are agreed in writing.
      </div>
    </div>

    <div style="margin-top:14px; text-align:center; font-size:11px; color:#6B7280; font-style:italic;">
      This is a digitally generated invoice and does not require a signature.
    </div>

    <div class="footer">Thank you for your business &nbsp;·&nbsp; <span style="color:#2D1150; font-weight:700;">Powered by Claro</span></div>
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
  if (bill.paymentMode === 'CREDIT') {
    if (bill.amountReceived > 0) {
      lines.push('⏳ Status: PARTIALLY PAID');
      lines.push(`• Paid: ${formatINR(bill.amountReceived)}`);
      lines.push(`• Balance Due: ${formatINR(bill.balanceDue)}`);
    } else {
      lines.push('🟠 Status: UNPAID');
      lines.push(`• Balance Due: ${formatINR(bill.balanceDue)}`);
    }
  } else {
    lines.push('✅ Status: PAID');
  }
  if (business?.industry === 'Optical') {
    if (bill.orderStatus) {
      const statusEmoji = bill.orderStatus === 'delivered' ? '✅ Delivered' : bill.orderStatus === 'ready' ? '👓 Ready for Pickup' : '⏳ Pending';
      lines.push(`Specs Status: ${statusEmoji}`);
    }
    if (bill.deliveryDate) {
      lines.push(`Expected Delivery: ${bill.deliveryDate}`);
    }
    if (bill.prescription) {
      const rx = bill.prescription;
      lines.push('');
      lines.push('*Eye Prescription (Rx)*:');
      if (rx.rDistSph || rx.rDistCyl || rx.rDistAxis || rx.rDistVn) {
        lines.push(`• R. Dist: SPH ${rx.rDistSph || '—'} | CYL ${rx.rDistCyl || '—'} | Axis ${rx.rDistAxis ?? '—'} | VA ${rx.rDistVn || '—'}`);
      }
      if (rx.rNearSph || rx.rNearCyl || rx.rNearAxis || rx.rNearVn) {
        lines.push(`• R. Near: SPH ${rx.rNearSph || '—'} | CYL ${rx.rNearCyl || '—'} | Axis ${rx.rNearAxis ?? '—'} | VA ${rx.rNearVn || '—'}`);
      }
      if (rx.lDistSph || rx.lDistCyl || rx.lDistAxis || rx.lDistVn) {
        lines.push(`• L. Dist: SPH ${rx.lDistSph || '—'} | CYL ${rx.lDistCyl || '—'} | Axis ${rx.lDistAxis ?? '—'} | VA ${rx.lDistVn || '—'}`);
      }
      if (rx.lNearSph || rx.lNearCyl || rx.lNearAxis || rx.lNearVn) {
        lines.push(`• L. Near: SPH ${rx.lNearSph || '—'} | CYL ${rx.lNearCyl || '—'} | Axis ${rx.lNearAxis ?? '—'} | VA ${rx.lNearVn || '—'}`);
      }
      const addParts: string[] = [];
      if (rx.addR) addParts.push(`Add R: ${rx.addR}`);
      if (rx.addL) addParts.push(`Add L: ${rx.addL}`);
      if (rx.pd) addParts.push(`P.D.: ${rx.pd} mm`);
      if (addParts.length > 0) {
        lines.push(`• ${addParts.join(' | ')}`);
      }
      if (rx.lensTypes && rx.lensTypes.length > 0) {
        lines.push(`• Lens: ${rx.lensTypes.join(', ')}`);
      }
      if (rx.remarks) {
        lines.push(`• Remarks: ${rx.remarks}`);
      }
    }
  }
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
