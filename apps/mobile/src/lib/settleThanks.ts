/**
 * Settlement thank-you — opens WhatsApp pre-filled with a warm, professional
 * thank-you after a khata payment. Adapts to partial vs full; works for saved,
 * unsaved and manually-typed numbers (wa.me with no number = contact picker).
 */
import { Linking } from 'react-native';
import { formatINR } from './format';

function waTarget(phone: string | null | undefined): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.length >= 10 ? `91${digits.slice(-10)}` : '';
}

export function buildSettleThankYou(
  shopName: string,
  customerName: string,
  paidRupees: number,
  balanceRupees: number,
): string {
  const name = customerName?.trim() || 'ji';
  const paid = formatINR(paidRupees);
  if (balanceRupees <= 0) {
    return (
      `Namaste ${name} 🙏\n\nThank you for clearing your balance of ${paid} at *${shopName}*. ` +
      `Your account is now fully settled. We truly appreciate your business!`
    );
  }
  return (
    `Namaste ${name} 🙏\n\nThank you for your payment of ${paid} at *${shopName}*. ` +
    `Your remaining balance is *${formatINR(balanceRupees)}*. We appreciate your business and look forward to serving you again!`
  );
}

/** Open WhatsApp with the thank-you message pre-filled. */
export async function shareSettleThankYou(opts: {
  shopName: string;
  customerName: string;
  paidRupees: number;
  balanceRupees: number;
  phone?: string | null;
}): Promise<void> {
  const text = encodeURIComponent(
    buildSettleThankYou(opts.shopName, opts.customerName, opts.paidRupees, opts.balanceRupees),
  );
  const target = waTarget(opts.phone);
  await Linking.openURL(`https://wa.me/${target}?text=${text}`);
}
