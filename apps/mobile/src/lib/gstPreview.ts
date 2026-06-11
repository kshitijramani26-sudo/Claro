/**
 * Client-side mirror of the server GST engine — PREVIEW ONLY.
 * The server recomputes on confirm and its result is the saved truth;
 * this exists so the review screen shows the right numbers before saving.
 * Works in rupees (display layer); mirrors services/api/app/services/gst.py.
 */
export interface PreviewLine {
  price: number; // unit price, rupees
  qty: number;
  taxRateBps: number;
  inclusive: boolean;
}

export interface PreviewTotals {
  subtotal: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxTotal: number;
  grand: number;
  taxKind: 'intra' | 'inter' | 'none';
}

export function previewBill(
  lines: PreviewLine[],
  opts: { gstMode: 'gst' | 'non_gst'; intra: boolean },
): PreviewTotals {
  let subtotal = 0;
  let taxable = 0;
  let tax = 0;
  for (const line of lines) {
    const grossPaise = Math.round(line.price * 100) * line.qty;
    subtotal += grossPaise;
    if (opts.gstMode === 'gst' && line.taxRateBps > 0) {
      if (line.inclusive) {
        const t = Math.round((grossPaise * 10000) / (10000 + line.taxRateBps));
        taxable += t;
        tax += grossPaise - t;
      } else {
        taxable += grossPaise;
        tax += Math.round((grossPaise * line.taxRateBps) / 10000);
      }
    } else {
      taxable += grossPaise;
    }
  }
  const taxKind: PreviewTotals['taxKind'] = opts.gstMode === 'gst' ? (opts.intra ? 'intra' : 'inter') : 'none';
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  if (taxKind === 'intra') {
    cgst = Math.floor(tax / 2);
    sgst = cgst;
    cgst += tax - cgst - sgst; // odd paise into CGST, matching the server
  } else if (taxKind === 'inter') {
    igst = tax;
  }
  return {
    subtotal: subtotal / 100,
    taxable: taxable / 100,
    cgst: cgst / 100,
    sgst: sgst / 100,
    igst: igst / 100,
    taxTotal: tax / 100,
    grand: (taxable + tax) / 100,
    taxKind,
  };
}
