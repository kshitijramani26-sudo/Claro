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
  /** Yesterday's sales for the ▲/▼ % delta chip on billing home. */
  yesterdaySales: number;
}

export type ActivityKind = 'sale' | 'credit' | 'settle' | 'advance' | 'salary';

export interface Activity {
  id: string;
  title: string;
  sub: string;
  amount: number;
  kind: ActivityKind;
  time: string;
  /** Underlying bill id when this row has an invoice (tap → invoice summary). */
  billId?: string | null;
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
  /** salary − advance outstanding (≥ 0). */
  remainingSalary: number;
  paidThisMonth: boolean;
  attendance: boolean[];
  advances: StaffAdvance[];
}

export interface TopCustomer {
  name: string;
  total: number;
  bills: number;
}

export interface AnalyticsPeriod {
  netPnl: number;
  sales: number;
  credit: number;
  inventory: number;
  topStaff: string;
  spark: number[];
  /** Prior same-length period values — for period-over-period % change chips. */
  prevNetPnl: number;
  prevSales: number;
  // ── extended sections ──
  billCount: number;
  avgBill: number;
  prevAvgBill: number;
  billsPerDay: number;
  prevBillsPerDay: number;
  topCustomers: TopCustomer[];
  newCustomers: number;
  repeatCustomers: number;
  busiestWeekday: string;
  peakHourLabel: string;
  weekdayTotals: number[];
  payCash: number;
  payUpi: number;
  payCredit: number;
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
  items: {
    name: string;
    qty: number;
    price: number;
    lineTotal: number;
    /** HSN code (from backend; present for inventory-linked items). */
    hsnCode?: string;
    /** Tax slab in basis points (0/500/1200/1800/2800). */
    taxRateBps?: number;
    /** Taxable amount for this line (rupees). */
    taxable?: number;
    /** Tax amount for this line (rupees). */
    taxPaise?: number;
  }[];
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
