/** Indian lakh-system money formatting — ported exactly from the design handoff. */

/** Full format: ₹1,42,300 (last 3 digits, then groups of 2). */
export function formatINR(n: number): string {
  const s = String(Math.abs(Math.round(n)));
  if (s.length <= 3) return (n < 0 ? '-' : '') + '₹' + s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return (n < 0 ? '-' : '') + '₹' + rest + ',' + last3;
}

/** Compact format: ₹1.42L / ₹24.9k / ₹2.86Cr. */
export function formatINRShort(n: number): string {
  n = Math.round(n);
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2).replace(/\.?0+$/, '') + 'Cr';
  if (n >= 100000) return '₹' + (n / 100000).toFixed(2).replace(/\.?0+$/, '') + 'L';
  if (n >= 1000) return '₹' + (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return '₹' + n;
}

/** API paise → display rupees (display edge only; money travels as integer paise). */
export function paiseToRupees(paise: number): number {
  return Math.round(paise) / 100;
}

/** "2 min ago" / "3 hr ago" / "Yesterday" / "5 days ago" from an ISO timestamp. */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
}

/** "11 Jun" style short date for ledger rows. */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate().toString().padStart(2, '0')} ${d.toLocaleString('en-IN', { month: 'short' })}`;
}
