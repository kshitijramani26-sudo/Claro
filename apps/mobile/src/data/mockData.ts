/* Claro — isolated mock data, ported 1:1 from docs/design/claro-data.js. */
import type {
  Activity,
  AnalyticsPeriod,
  BestSelling,
  CatalogItem,
  InventoryItem,
  InventoryStats,
  KhataCustomer,
  KhataTransaction,
  PeriodKey,
  Shop,
  StaffDetail,
  StaffMember,
  Summary,
} from './types';

export const shop: Shop = {
  name: 'Sharma General Store',
  owner: 'Rajesh Sharma',
  industry: 'Kirana / Grocery',
  gstRegistered: true,
  gstin: '27ABCDE1234F1Z5',
  phone: '98765 43210',
};

// Tab 1 — Billing home headline figures
export const summary: Summary = {
  todaysSales: 24850,
  todaysBills: 38,
  pendingKhata: 142300,
  lowStock: 7,
  monthSales: 684200,
  topStaff: 'Amit Kumar',
  monthLabel: 'June 2026',
  yesterdaySales: 21200,
};

// Recent activity feed
export const activity: Activity[] = [
  { id: 'a1', title: 'Bill #1042', sub: 'Cash · Amit Kumar', amount: 1240, kind: 'sale', time: '2 min ago' },
  { id: 'a2', title: 'Mohan Lal', sub: 'Credit added · Khata', amount: 3500, kind: 'credit', time: '18 min ago' },
  { id: 'a3', title: 'Bill #1041', sub: 'UPI · Sunita Devi', amount: 860, kind: 'sale', time: '41 min ago' },
  { id: 'a4', title: 'Priya Verma', sub: 'Settled up', amount: 1200, kind: 'settle', time: '1 hr ago' },
  { id: 'a5', title: 'Bill #1040', sub: 'Cash · Amit Kumar', amount: 430, kind: 'sale', time: '2 hr ago' },
  { id: 'a6', title: 'Bill #1039', sub: 'UPI · Deepak Sharma', amount: 2150, kind: 'sale', time: '3 hr ago' },
  { id: 'a7', title: 'Vijay Singh', sub: 'Credit added · Khata', amount: 4200, kind: 'credit', time: '4 hr ago' },
  { id: 'a8', title: 'Bill #1038', sub: 'Cash · Amit Kumar', amount: 680, kind: 'sale', time: '5 hr ago' },
  { id: 'a9', title: 'Suresh Kumar', sub: 'Settled up', amount: 3000, kind: 'settle', time: 'Yesterday' },
  { id: 'a10', title: 'Bill #1037', sub: 'UPI · Sunita Devi', amount: 1540, kind: 'sale', time: 'Yesterday' },
];

// Tab 2 — Khata (credit ledger)
export const khata: KhataCustomer[] = [
  { id: 'k1', name: 'Mohan Lal', phone: '98201 11223', amount: 48500, updated: 'Today', initials: 'ML' },
  { id: 'k2', name: 'Vijay Singh', phone: '99300 44556', amount: 32000, updated: '3 days ago', initials: 'VS' },
  { id: 'k3', name: 'Suresh Kumar', phone: '98990 77881', amount: 24800, updated: 'Yesterday', initials: 'SK' },
  { id: 'k4', name: 'Priya Verma', phone: '98112 33445', amount: 16500, updated: '2 days ago', initials: 'PV' },
  { id: 'k5', name: 'Fatima Sheikh', phone: '97011 22556', amount: 12000, updated: '1 week ago', initials: 'FS' },
  { id: 'k6', name: 'Anita Desai', phone: '96500 99001', amount: 8500, updated: '5 days ago', initials: 'AD' },
];

// Customer detail timeline (running balance computed in UI)
export const khataTimeline: Record<string, KhataTransaction[]> = {
  k1: [
    { id: 't1', label: 'Groceries on credit', date: '11 Jun', debit: 3500, credit: 0 },
    { id: 't2', label: 'Part payment', date: '08 Jun', debit: 0, credit: 2000 },
    { id: 't3', label: 'Monthly supplies', date: '02 Jun', debit: 6000, credit: 0 },
    { id: 't4', label: 'Cash received', date: '28 May', debit: 0, credit: 1500 },
    { id: 't5', label: 'Opening balance', date: '20 May', debit: 42500, credit: 0 },
  ],
};

// Tab 3 — Inventory
export const inventoryStats: InventoryStats = { totalValue: 286400, skus: 142, lowCount: 3 };

export const inventory: InventoryItem[] = [
  { id: 'i1', name: 'Aashirvaad Atta 5kg', qty: 6, price: 250, threshold: 10, low: true, tracked: true },
  { id: 'i2', name: 'Maggi Noodles 70g', qty: 4, price: 14, threshold: 24, low: true, tracked: true },
  { id: 'i3', name: 'Surf Excel 1kg', qty: 3, price: 120, threshold: 12, low: true, tracked: true },
  { id: 'i4', name: 'Tata Salt 1kg', qty: 48, price: 28, threshold: 20, low: false, tracked: true },
  { id: 'i5', name: 'Amul Butter 100g', qty: 24, price: 56, threshold: 12, low: false, tracked: true },
  { id: 'i6', name: 'Parle-G Biscuit', qty: 120, price: 10, threshold: 40, low: false, tracked: true },
  { id: 'i7', name: 'Fortune Oil 1L', qty: 18, price: 140, threshold: 10, low: false, tracked: true },
  { id: 'i8', name: 'Colgate 100g', qty: 30, price: 55, threshold: 15, low: false, tracked: true },
];

// Tab 4 — Staff
export const staff: StaffMember[] = [
  { id: 's1', name: 'Amit Kumar', role: 'Cashier', phone: '98765 10001', salary: 18000, present: true, advance: 2000, initials: 'AK' },
  { id: 's2', name: 'Sunita Devi', role: 'Helper', phone: '98765 10002', salary: 12000, present: true, advance: 0, initials: 'SD' },
  { id: 's3', name: 'Ravi Patel', role: 'Stock Boy', phone: '98765 10003', salary: 14000, present: false, advance: 5000, initials: 'RP' },
  { id: 's4', name: 'Deepak Sharma', role: 'Delivery', phone: '98765 10004', salary: 15000, present: true, advance: 1500, initials: 'DS' },
];

export const staffDetail: Record<string, StaffDetail> = {
  s1: {
    pnl: { sales: 184500, bills: 312, avg: 591 },
    remainingSalary: 16000,
    paidThisMonth: false,
    attendance: [true, true, true, false, true, true, true, true, true, true, false, true, true, true],
    advances: [
      { id: 'ad1', label: 'Festival advance', date: '01 Jun', amount: 2000, repaid: false },
      { id: 'ad2', label: 'Salary advance', date: '12 May', amount: 3000, repaid: true },
    ],
  },
};

// Tab 5 — Analytics (only the headline KPIs + spark; mockApi derives the rest)
export const analytics: Record<PeriodKey, Pick<AnalyticsPeriod, 'netPnl' | 'sales' | 'credit' | 'inventory' | 'topStaff' | 'spark' | 'prevNetPnl' | 'prevSales'>> = {
  today: { netPnl: 9400, sales: 24850, credit: 142300, inventory: 286400, topStaff: 'Amit Kumar', spark: [12, 18, 9, 22, 16, 25, 24], prevNetPnl: 8480, prevSales: 21200 },
  week: { netPnl: 58200, sales: 168400, credit: 142300, inventory: 286400, topStaff: 'Amit Kumar', spark: [120, 98, 140, 110, 165, 180, 168], prevNetPnl: 53900, prevSales: 148400 },
  month: { netPnl: 184200, sales: 684200, credit: 142300, inventory: 286400, topStaff: 'Amit Kumar', spark: [420, 510, 480, 560, 600, 540, 620, 580, 650, 700, 660, 684], prevNetPnl: 162800, prevSales: 618500 },
};

export const bestSelling: BestSelling[] = [
  { id: 'b1', name: 'Tata Salt 1kg', units: 412, revenue: 11536 },
  { id: 'b2', name: 'Parle-G Biscuit', units: 388, revenue: 3880 },
  { id: 'b3', name: 'Amul Butter 100g', units: 256, revenue: 14336 },
  { id: 'b4', name: 'Fortune Oil 1L', units: 142, revenue: 19880 },
];

// Searchable inventory for Create Bill (dev reference only — the app reads the API)
export const billCatalog: CatalogItem[] = inventory.map((i) => ({
  id: i.id,
  name: i.name,
  price: i.price,
  taxRateBps: 0,
  inclusive: true,
  qty: i.qty,
  tracked: i.tracked,
}));
