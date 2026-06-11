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
  discount: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxTotal: number;
  grand: number;
  taxKind: 'intra' | 'inter' | 'none';
}

/** Largest-remainder proportional allocation in paise — sums exactly to discount. */
function allocateDiscount(grosses: number[], discount: number): number[] {
  const total = grosses.reduce((s, g) => s + g, 0);
  if (discount <= 0 || total === 0) return grosses.map(() => 0);
  const shares = grosses.map((g) => Math.floor((discount * g) / total));
  const remainders = grosses.map((g) => (discount * g) % total);
  let leftover = discount - shares.reduce((s, v) => s + v, 0);
  const order = grosses.map((_, i) => i).sort((a, b) => remainders[b]! - remainders[a]!);
  for (let k = 0; k < leftover; k++) shares[order[k]!]! += 1;
  return shares;
}

export function previewBill(
  lines: PreviewLine[],
  opts: { gstMode: 'gst' | 'non_gst'; intra: boolean; discountRupees?: number },
): PreviewTotals {
  const grosses = lines.map((line) => Math.round(line.price * 100) * line.qty);
  const subtotal = grosses.reduce((s, g) => s + g, 0);
  // Discount is applied to the bill total, pre-tax (billing_rules §3), clamped to subtotal.
  const discount = Math.min(subtotal, Math.max(0, Math.round((opts.discountRupees ?? 0) * 100)));
  const allocated = allocateDiscount(grosses, discount);

  let taxable = 0;
  let tax = 0;
  lines.forEach((line, i) => {
    const base = grosses[i]! - allocated[i]!;
    if (opts.gstMode === 'gst' && line.taxRateBps > 0) {
      if (line.inclusive) {
        const t = Math.round((base * 10000) / (10000 + line.taxRateBps));
        taxable += t;
        tax += base - t;
      } else {
        taxable += base;
        tax += Math.round((base * line.taxRateBps) / 10000);
      }
    } else {
      taxable += base;
    }
  });

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
    discount: discount / 100,
    taxable: taxable / 100,
    cgst: cgst / 100,
    sgst: sgst / 100,
    igst: igst / 100,
    taxTotal: tax / 100,
    grand: (taxable + tax) / 100,
    taxKind,
  };
}
