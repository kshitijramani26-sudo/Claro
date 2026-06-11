export interface Shop {
  name: string;
  owner: string;
  industry: string;
  gstRegistered: boolean;
  gstin: string;
  phone: string;
}

export interface Summary {
  todaysSales: number;
  todaysBills: number;
  pendingKhata: number;
  lowStock: number;
  monthSales: number;
  topStaff: string;
  monthLabel: string;
}

export type ActivityKind = 'sale' | 'credit' | 'settle';

export interface Activity {
  id: string;
  title: string;
  sub: string;
  amount: number;
  kind: ActivityKind;
  time: string;
}

export interface KhataCustomer {
  id: string;
  name: string;
  phone: string;
  amount: number;
  updated: string;
  initials: string;
}

export interface KhataTransaction {
  id: string;
  label: string;
  date: string;
  debit: number;
  credit: number;
}

export interface InventoryStats {
  totalValue: number;
  skus: number;
  lowCount: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  qty: number;
  price: number;
  threshold: number;
  low: boolean;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  phone: string;
  salary: number;
  present: boolean;
  advance: number;
  initials: string;
}

export interface StaffAdvance {
  id: string;
  label: string;
  date: string;
  amount: number;
  repaid: boolean;
}

export interface StaffDetail {
  pnl: { sales: number; bills: number; avg: number };
  attendance: boolean[];
  advances: StaffAdvance[];
}

export interface AnalyticsPeriod {
  netPnl: number;
  sales: number;
  credit: number;
  inventory: number;
  topStaff: string;
  spark: number[];
}

export type PeriodKey = 'today' | 'week' | 'month';

export interface BestSelling {
  id: string;
  name: string;
  units: number;
  revenue: number;
}

export interface CatalogItem {
  id: string;
  name: string;
  price: number;
  /** GST slab in basis points (0/500/1200/1800/2800) — used for the invoice preview. */
  taxRateBps: number;
  /** Whether `price` already includes GST (MRP). */
  inclusive: boolean;
}

// ── Backend-era types (rupees at this layer; api.ts converts from paise) ──

export interface Business {
  id: string;
  name: string;
  owner: string;
  industry: string;
  stateCode: string;
  address: string;
  gstRegistered: boolean;
  gstin: string;
  gstDefaultMode: 'gst' | 'non_gst';
  priceIncludesTax: boolean;
  invoicePrefix: string;
  lowStockDefault: number;
  email: string;
  phone: string;
}

export interface PaymentMethod {
  id: string;
  upiId: string;
  qrImageUrl: string | null;
  label: string;
  isDefault: boolean;
}

export interface BillResult {
  id: string;
  invoiceNo: string;
  gstMode: 'gst' | 'non_gst';
  taxKind: 'intra' | 'inter' | 'none';
  subtotal: number;
  discount: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxTotal: number;
  grandTotal: number;
  paymentMode: 'CASH' | 'UPI' | 'CREDIT';
  customerName: string;
  date: string;
  items: { name: string; qty: number; price: number; lineTotal: number }[];
}

export interface UpiInfo {
  upiId: string;
  label: string;
  deeplink: string;
  qrPngBase64: string;
}

export interface CustomerHit {
  id: string;
  name: string;
  phone: string;
  outstanding: number;
}
