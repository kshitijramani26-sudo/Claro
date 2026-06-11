/**
 * Client-side UPI helpers — mirror of services/api/app/services/upi.py so the
 * scan-to-pay QR can be built and rendered on-device (works in mock mode too,
 * and updates live as the payment method / amount changes). The server still
 * generates the QR baked into the PDF; this is the interactive on-screen one.
 */

/** UPI VPA format: handle@psp, e.g. `sharma@oksbi`. */
const UPI_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

export function isValidUpiId(vpa: string): boolean {
  return UPI_RE.test(vpa.trim());
}

/**
 * Build an `upi://pay` deep link encoding the exact amount so the customer's
 * UPI app opens pre-filled. Amount is rupees (display edge); we emit 2 dp.
 */
export function buildUpiUri(opts: {
  vpa: string;
  payeeName: string;
  amountRupees?: number;
  note?: string;
}): string {
  const params: string[] = [`pa=${encodeURIComponent(opts.vpa.trim())}`, `pn=${encodeURIComponent(opts.payeeName.trim())}`];
  if (opts.amountRupees != null && opts.amountRupees > 0) {
    params.push(`am=${opts.amountRupees.toFixed(2)}`);
  }
  params.push('cu=INR');
  if (opts.note) params.push(`tn=${encodeURIComponent(opts.note.slice(0, 50))}`);
  return `upi://pay?${params.join('&')}`;
}
