/**
 * Single API seam — now a typed HTTP client against the Claro FastAPI service.
 * Screens read/write data ONLY through this module.
 *
 * Money: the backend speaks integer paise; this layer converts to display
 * rupees so every existing screen keeps working unchanged.
 */
import { request } from './http';
import { paiseToRupees as r, timeAgo } from './format';
import * as mock from '@/data/mockData';
import type {
  Activity,
  AnalyticsPeriod,
  BestSelling,
  BillResult,
  Business,
  CatalogItem,
  CustomerHit,
  InventoryItem,
  InventoryStats,
  KhataCustomer,
  KhataTransaction,
  PaymentMethod,
  PeriodKey,
  Shop,
  StaffDetail,
  StaffMember,
  Summary,
  UpiInfo,
} from '@/data/types';

// ── raw wire shapes (paise / ISO dates) ──
interface WireBusiness {
  id: string; name: string; owner_name: string; industry: string; state_code: string;
  address: string; gst_registered: boolean; gstin: string; gst_default_mode: 'gst' | 'non_gst';
  price_includes_tax: boolean; invoice_prefix: string; low_stock_default: number;
  email: string; phone: string;
}
interface WireBill {
  id: string; invoice_no: string; gst_mode: 'gst' | 'non_gst'; tax_kind: 'intra' | 'inter' | 'none';
  subtotal_paise: number; discount_paise: number; taxable_paise: number; cgst_paise: number;
  sgst_paise: number; igst_paise: number; tax_total_paise: number; grand_total_paise: number;
  payment_mode: 'CASH' | 'UPI' | 'CREDIT'; customer_name: string; created_at: string;
  items: {
    name: string; qty: number; unit_price_paise: number; line_total_paise: number;
    hsn_code?: string; tax_rate_bps?: number; taxable_paise?: number; tax_paise?: number;
  }[];
}

function mapBusiness(w: WireBusiness): Business {
  return {
    id: w.id, name: w.name, owner: w.owner_name, industry: w.industry, stateCode: w.state_code,
    address: w.address, gstRegistered: w.gst_registered, gstin: w.gstin,
    gstDefaultMode: w.gst_default_mode, priceIncludesTax: w.price_includes_tax,
    invoicePrefix: w.invoice_prefix, lowStockDefault: w.low_stock_default,
    email: w.email, phone: w.phone,
  };
}

function mapBill(w: WireBill): BillResult {
  return {
    id: w.id, invoiceNo: w.invoice_no, gstMode: w.gst_mode, taxKind: w.tax_kind,
    subtotal: r(w.subtotal_paise), discount: r(w.discount_paise), taxable: r(w.taxable_paise),
    cgst: r(w.cgst_paise), sgst: r(w.sgst_paise), igst: r(w.igst_paise),
    taxTotal: r(w.tax_total_paise), grandTotal: r(w.grand_total_paise),
    paymentMode: w.payment_mode, customerName: w.customer_name,
    date: new Date(w.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    items: w.items.map((i) => ({
      name: i.name, qty: i.qty, price: r(i.unit_price_paise), lineTotal: r(i.line_total_paise),
      hsnCode: i.hsn_code, taxRateBps: i.tax_rate_bps,
      taxable: i.taxable_paise != null ? r(i.taxable_paise) : undefined,
      taxPaise: i.tax_paise != null ? r(i.tax_paise) : undefined,
    })),
  };
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('') || '?';
}

export interface ConfirmBillInput {
  requestId: string;
  items: { inventoryItemId: string | null; name: string; qty: number; priceRupees: number }[];
  paymentMode: 'CASH' | 'UPI' | 'CREDIT';
  customerName?: string;
  customerPhone?: string;
  customerStateCode?: string | null;
  staffId?: string | null;
  gstMode?: 'gst' | 'non_gst' | null;
  paymentMethodId?: string | null;
  discountPaise?: number;
}

const realApi = {
  // ── business / profile ──
  async getBusiness(): Promise<Business> {
    return mapBusiness(await request<WireBusiness>('/business'));
  },
  async createBusiness(input: {
    name: string; owner: string; industry: string; stateCode?: string;
    gstRegistered: boolean; gstin: string;
  }): Promise<Business> {
    return mapBusiness(await request<WireBusiness>('/business', {
      method: 'POST',
      json: {
        name: input.name, owner_name: input.owner, industry: input.industry,
        state_code: input.stateCode ?? '27', gst_registered: input.gstRegistered, gstin: input.gstin,
      },
    }));
  },
  async patchBusiness(patch: Partial<{
    name: string; owner: string; industry: string; stateCode: string; address: string;
    gstRegistered: boolean; gstin: string; gstDefaultMode: 'gst' | 'non_gst';
    priceIncludesTax: boolean; invoicePrefix: string; lowStockDefault: number; email: string;
  }>): Promise<Business> {
    return mapBusiness(await request<WireBusiness>('/business', {
      method: 'PATCH',
      json: {
        name: patch.name, owner_name: patch.owner, industry: patch.industry,
        state_code: patch.stateCode, address: patch.address, gst_registered: patch.gstRegistered,
        gstin: patch.gstin, gst_default_mode: patch.gstDefaultMode,
        price_includes_tax: patch.priceIncludesTax, invoice_prefix: patch.invoicePrefix,
        low_stock_default: patch.lowStockDefault, email: patch.email,
      },
    }));
  },
  /** Legacy shape used by headers/invoice — derived from the business profile. */
  async getShop(): Promise<Shop> {
    const b = await this.getBusiness();
    return { name: b.name, owner: b.owner, industry: b.industry, gstRegistered: b.gstRegistered, gstin: b.gstin, phone: b.phone };
  },

  // ── payment methods ──
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const rows = await request<{ id: string; upi_id: string; qr_image_url: string | null; label: string; is_default: boolean }[]>('/payment-methods');
    return rows.map((m) => ({ id: m.id, upiId: m.upi_id, qrImageUrl: m.qr_image_url, label: m.label, isDefault: m.is_default }));
  },
  async addPaymentMethod(input: { upiId: string; label: string; isDefault?: boolean; qrImageUrl?: string | null }): Promise<PaymentMethod> {
    const m = await request<{ id: string; upi_id: string; qr_image_url: string | null; label: string; is_default: boolean }>('/payment-methods', {
      method: 'POST', json: { upi_id: input.upiId, label: input.label, is_default: input.isDefault ?? false, qr_image_url: input.qrImageUrl ?? null },
    });
    return { id: m.id, upiId: m.upi_id, qrImageUrl: m.qr_image_url, label: m.label, isDefault: m.is_default };
  },
  async setPaymentMethodQr(id: string, qrImageUrl: string | null): Promise<void> {
    await request(`/payment-methods/${id}`, { method: 'PATCH', json: { qr_image_url: qrImageUrl } });
  },
  async setDefaultPaymentMethod(id: string): Promise<void> {
    await request(`/payment-methods/${id}/set-default`, { method: 'PATCH' });
  },
  async deletePaymentMethod(id: string): Promise<void> {
    await request(`/payment-methods/${id}`, { method: 'DELETE' });
  },

  // ── billing home ──
  async getSummary(): Promise<Summary> {
    const s = await request<{
      todays_sales_paise: number; todays_bills: number; pending_khata_paise: number;
      low_stock: number; month_sales_paise: number; month_label: string; top_staff: string;
      yesterday_sales_paise: number;
    }>('/summary/today');
    return {
      todaysSales: r(s.todays_sales_paise), todaysBills: s.todays_bills,
      pendingKhata: r(s.pending_khata_paise), lowStock: s.low_stock,
      monthSales: r(s.month_sales_paise), topStaff: s.top_staff, monthLabel: s.month_label,
      yesterdaySales: r(s.yesterday_sales_paise),
    };
  },
  async getActivity(limit = 20): Promise<Activity[]> {
    const rows = await request<{ id: string; title: string; sub: string; amount_paise: number; kind: Activity['kind']; at: string; bill_id: string | null }[]>(`/activity?limit=${limit}`);
    return rows.map((a) => ({ id: a.id, title: a.title, sub: a.sub, amount: r(a.amount_paise), kind: a.kind, time: timeAgo(a.at), billId: a.bill_id }));
  },

  // ── khata ──
  async getKhata(): Promise<KhataCustomer[]> {
    const data = await request<{ customers: { id: string; name: string; phone: string; outstanding_paise: number; updated_at: string }[] }>('/khata');
    return data.customers.map((c) => ({
      id: c.id, name: c.name, phone: c.phone.replace(/^\+91/, ''), amount: r(c.outstanding_paise),
      updated: timeAgo(c.updated_at), initials: initials(c.name),
    }));
  },
  async getKhataTimeline(customerId: string | null): Promise<KhataTransaction[]> {
    if (!customerId) return [];
    const data = await request<{ entries: { id: number; label: string; debit_paise: number; credit_paise: number; at: string }[] }>(`/khata/${customerId}`);
    return data.entries.map((e) => ({
      id: String(e.id), label: e.label,
      date: new Date(e.at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      debit: r(e.debit_paise), credit: r(e.credit_paise),
    }));
  },
  async addCredit(input: { name: string; phone: string; amountRupees: number; note: string }): Promise<void> {
    await request('/khata', {
      method: 'POST',
      json: { name: input.name, phone: input.phone, amount_paise: Math.round(input.amountRupees * 100), note: input.note },
    });
  },
  async settleUp(customerId: string, amountRupees?: number): Promise<void> {
    const json = amountRupees != null ? { amount_paise: Math.round(amountRupees * 100) } : {};
    await request(`/khata/${customerId}/settle`, { method: 'POST', json });
  },
  async getReminder(customerId: string): Promise<{ text: string; waUrl: string }> {
    const data = await request<{ text: string; wa_url: string }>(`/khata/${customerId}/reminder`);
    return { text: data.text, waUrl: data.wa_url };
  },

  // ── inventory ──
  async getInventoryStats(): Promise<InventoryStats> {
    const s = await request<{ total_value_paise: number; skus: number; low_count: number }>('/inventory/stats');
    return { totalValue: r(s.total_value_paise), skus: s.skus, lowCount: s.low_count };
  },
  async getInventory(): Promise<InventoryItem[]> {
    const rows = await this.getInventoryRaw();
    return rows.map((i) => ({ id: i.id, name: i.name, qty: i.qty_on_hand, price: r(i.price_paise), threshold: i.low_stock_threshold, low: i.low }));
  },
  async getInventoryRaw(): Promise<{
    id: string; name: string; qty_on_hand: number; price_paise: number;
    tax_rate_bps: number; price_is_tax_inclusive: boolean; low_stock_threshold: number; low: boolean;
  }[]> {
    return request('/inventory');
  },
  async addInventory(input: { name: string; qty: number; threshold: number; costRupees: number; priceRupees: number }): Promise<void> {
    await request('/inventory', {
      method: 'POST',
      json: {
        name: input.name, qty_on_hand: input.qty, low_stock_threshold: input.threshold,
        cost_paise: Math.round(input.costRupees * 100), price_paise: Math.round(input.priceRupees * 100),
      },
    });
  },
  async getBillCatalog(): Promise<CatalogItem[]> {
    const rows = await this.getInventoryRaw();
    return rows.map((i) => ({
      id: i.id, name: i.name, price: r(i.price_paise),
      taxRateBps: i.tax_rate_bps, inclusive: i.price_is_tax_inclusive,
    }));
  },

  // ── staff ──
  async getStaff(): Promise<StaffMember[]> {
    const rows = await request<{ id: string; name: string; role: string; phone: string; salary_paise: number; advance_outstanding_paise: number; present_today: boolean }[]>('/staff');
    return rows.map((s) => ({
      id: s.id, name: s.name, role: s.role, phone: s.phone.replace(/^\+91/, ''),
      salary: r(s.salary_paise), present: s.present_today, advance: r(s.advance_outstanding_paise),
      initials: initials(s.name),
    }));
  },
  async addStaff(input: { name: string; role: string; phone: string; salaryRupees: number }): Promise<void> {
    await request('/staff', {
      method: 'POST',
      json: { name: input.name, role: input.role, phone: input.phone, salary_paise: Math.round(input.salaryRupees * 100) },
    });
  },
  async markAttendance(staffId: string, present: boolean): Promise<void> {
    await request(`/staff/${staffId}/attendance`, { method: 'POST', json: { status: present ? 'present' : 'absent' } });
  },
  async addAdvance(staffId: string, amountRupees: number, note: string): Promise<void> {
    await request(`/staff/${staffId}/advance`, { method: 'POST', json: { amount_paise: Math.round(amountRupees * 100), note } });
  },
  async addRepayment(staffId: string, amountRupees: number, note: string): Promise<void> {
    await request(`/staff/${staffId}/repayment`, { method: 'POST', json: { amount_paise: Math.round(amountRupees * 100), note } });
  },
  async payStaffSalary(staffId: string, amountRupees?: number, note = 'Salary paid'): Promise<void> {
    const json = amountRupees != null ? { amount_paise: Math.round(amountRupees * 100), note } : { note };
    await request(`/staff/${staffId}/pay-salary`, { method: 'POST', json });
  },
  async getStaffDetail(staffId: string | null, days = 14): Promise<StaffDetail | undefined> {
    if (!staffId) return undefined;
    const d = await request<{
      sales_paise: number; bills: number; avg_bill_paise: number; attendance14: boolean[];
      remaining_salary_paise: number; salary_paid_this_month: boolean;
      advances: { id: number; label: string; amount_paise: number; repaid: boolean; at: string }[];
    }>(`/staff/${staffId}?days=${days}`);
    return {
      pnl: { sales: r(d.sales_paise), bills: d.bills, avg: r(d.avg_bill_paise) },
      remainingSalary: r(d.remaining_salary_paise),
      paidThisMonth: d.salary_paid_this_month,
      attendance: d.attendance14,
      advances: d.advances.map((a) => ({
        id: String(a.id), label: a.label,
        date: new Date(a.at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        amount: r(a.amount_paise), repaid: a.repaid,
      })),
    };
  },

  // ── bills ──
  async confirmBill(input: ConfirmBillInput): Promise<BillResult> {
    const w = await request<WireBill>('/bills', {
      method: 'POST',
      json: {
        request_id: input.requestId,
        items: input.items.map((i) => ({
          inventory_item_id: i.inventoryItemId, name: i.name, qty: i.qty,
          unit_price_paise: Math.round(i.priceRupees * 100),
        })),
        payment_mode: input.paymentMode,
        customer_name: input.customerName ?? '',
        customer_phone: input.customerPhone ?? '',
        customer_state_code: input.customerStateCode ?? null,
        staff_id: input.staffId ?? null,
        gst_mode: input.gstMode ?? null,
        payment_method_id: input.paymentMethodId ?? null,
        discount_paise: Math.max(0, Math.round(input.discountPaise ?? 0)),
      },
    });
    return mapBill(w);
  },
  async getBillUpi(billId: string): Promise<UpiInfo> {
    const u = await request<{ upi_id: string; label: string; deeplink: string; qr_png_base64: string }>(`/bills/${billId}/upi`);
    return { upiId: u.upi_id, label: u.label, deeplink: u.deeplink, qrPngBase64: u.qr_png_base64 };
  },
  /** Render the PDF, upload it to storage, and return a public link (null if storage unconfigured). */
  async getBillShareLink(billId: string): Promise<string | null> {
    const r = await request<{ url: string | null }>(`/bills/${billId}/share-link`, { method: 'POST' });
    return r.url;
  },
  async getBill(billId: string): Promise<BillResult> {
    return mapBill(await request<WireBill>(`/bills/${billId.replace(/^bill-/, '')}`));
  },
  async getAnalytics(period: PeriodKey): Promise<AnalyticsPeriod> {
    const a = await request<{
      net_pnl_paise: number; sales_paise: number; credit_outstanding_paise: number;
      inventory_value_paise: number; top_staff: string; spark: number[];
      prev_net_pnl_paise: number; prev_sales_paise: number;
      bill_count: number; avg_bill_paise: number; prev_avg_bill_paise: number;
      bills_per_day: number; prev_bills_per_day: number;
      top_customers: { name: string; total_paise: number; bills: number }[];
      new_customers: number; repeat_customers: number;
      busiest_weekday: string; peak_hour_label: string; weekday_totals: number[];
      pay_cash_paise: number; pay_upi_paise: number; pay_credit_paise: number;
    }>(`/analytics?period=${period}`);
    return {
      netPnl: r(a.net_pnl_paise), sales: r(a.sales_paise), credit: r(a.credit_outstanding_paise),
      inventory: r(a.inventory_value_paise), topStaff: a.top_staff,
      spark: a.spark.length >= 2 ? a.spark : [0, ...a.spark, 0],
      prevNetPnl: r(a.prev_net_pnl_paise), prevSales: r(a.prev_sales_paise),
      billCount: a.bill_count, avgBill: r(a.avg_bill_paise), prevAvgBill: r(a.prev_avg_bill_paise),
      billsPerDay: a.bills_per_day, prevBillsPerDay: a.prev_bills_per_day,
      topCustomers: a.top_customers.map((c) => ({ name: c.name, total: r(c.total_paise), bills: c.bills })),
      newCustomers: a.new_customers, repeatCustomers: a.repeat_customers,
      busiestWeekday: a.busiest_weekday, peakHourLabel: a.peak_hour_label, weekdayTotals: a.weekday_totals.map(r),
      payCash: r(a.pay_cash_paise), payUpi: r(a.pay_upi_paise), payCredit: r(a.pay_credit_paise),
    };
  },
  async getBestSelling(period: PeriodKey = 'month'): Promise<BestSelling[]> {
    const rows = await request<{ id: string; name: string; units: number; revenue_paise: number }[]>(`/analytics/best-selling?period=${period}`);
    return rows.map((b) => ({ id: b.id, name: b.name, units: b.units, revenue: r(b.revenue_paise) }));
  },
  async searchCustomers(q: string): Promise<CustomerHit[]> {
    const rows = await request<{ id: string; name: string; phone: string; outstanding_paise: number }[]>(`/customers/search?q=${encodeURIComponent(q)}`);
    return rows.map((c) => ({ id: c.id, name: c.name, phone: c.phone, outstanding: r(c.outstanding_paise) }));
  },
  async getCustomerActivity(customerId: string): Promise<Activity[]> {
    const rows = await request<{ id: string; title: string; sub: string; amount_paise: number; kind: Activity['kind']; at: string; bill_id: string | null }[]>(`/customers/${customerId}/activity`);
    return rows.map((a) => ({ id: a.id, title: a.title, sub: a.sub, amount: r(a.amount_paise), kind: a.kind, time: timeAgo(a.at), billId: a.bill_id }));
  },
};

// ── In-memory Mock state and implementation ──

let mBusiness: WireBusiness = {
  id: 'biz-default',
  name: mock.shop.name,
  owner_name: mock.shop.owner,
  industry: mock.shop.industry,
  state_code: '27',
  address: '123 Main St, Mumbai',
  gst_registered: mock.shop.gstRegistered,
  gstin: mock.shop.gstin,
  gst_default_mode: 'gst',
  price_includes_tax: true,
  invoice_prefix: 'INV-',
  low_stock_default: 10,
  email: 'sharma@claro.com',
  phone: mock.shop.phone,
};

let mSummary = { ...mock.summary };
let mActivities = [...mock.activity];
let mKhata = [...mock.khata];
let mKhataTimeline = { ...mock.khataTimeline };
let mInventory = [...mock.inventory];
let mStaff = [...mock.staff];
let mStaffDetail = { ...mock.staffDetail };
let mAnalytics = { ...mock.analytics };
let mBestSelling = [...mock.bestSelling];
interface MockMethod { id: string; upi_id: string; qr_image_url: string | null; label: string; is_default: boolean }
let mPaymentMethods: MockMethod[] = [
  { id: 'pm-1', upi_id: 'sharma@oksbi', qr_image_url: null, label: 'SBI Shop Account', is_default: true },
  { id: 'pm-2', upi_id: 'sharma.personal@okaxis', qr_image_url: null, label: 'Axis Personal', is_default: false },
];
let invoiceCounter = 1043;
let mBills: Record<string, BillResult> = {};
const mSalaryPaid: Record<string, boolean> = {};

const mockApi = {
  async getBusiness(): Promise<Business> {
    return mapBusiness(mBusiness);
  },
  async createBusiness(input: {
    name: string; owner: string; industry: string; stateCode?: string;
    gstRegistered: boolean; gstin: string;
  }): Promise<Business> {
    mBusiness = {
      ...mBusiness,
      name: input.name,
      owner_name: input.owner,
      industry: input.industry,
      state_code: input.stateCode ?? '27',
      gst_registered: input.gstRegistered,
      gstin: input.gstin,
    };
    return mapBusiness(mBusiness);
  },
  async patchBusiness(patch: Partial<{
    name: string; owner: string; industry: string; stateCode: string; address: string;
    gstRegistered: boolean; gstin: string; gstDefaultMode: 'gst' | 'non_gst';
    priceIncludesTax: boolean; invoicePrefix: string; lowStockDefault: number; email: string;
  }>): Promise<Business> {
    mBusiness = {
      ...mBusiness,
      ...Object.fromEntries(Object.entries(patch).map(([k, v]) => {
        if (k === 'owner') return ['owner_name', v];
        if (k === 'stateCode') return ['state_code', v];
        if (k === 'gstRegistered') return ['gst_registered', v];
        if (k === 'gstDefaultMode') return ['gst_default_mode', v];
        if (k === 'priceIncludesTax') return ['price_includes_tax', v];
        if (k === 'invoicePrefix') return ['invoice_prefix', v];
        if (k === 'lowStockDefault') return ['low_stock_default', v];
        return [k, v];
      })),
    } as any;
    return mapBusiness(mBusiness);
  },
  async getShop(): Promise<Shop> {
    return {
      name: mBusiness.name,
      owner: mBusiness.owner_name,
      industry: mBusiness.industry,
      gstRegistered: mBusiness.gst_registered,
      gstin: mBusiness.gstin,
      phone: mBusiness.phone,
    };
  },
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return mPaymentMethods.map((m) => ({ id: m.id, upiId: m.upi_id, qrImageUrl: m.qr_image_url, label: m.label, isDefault: m.is_default }));
  },
  async addPaymentMethod(input: { upiId: string; label: string; isDefault?: boolean; qrImageUrl?: string | null }): Promise<PaymentMethod> {
    const m = { id: `pm-${mPaymentMethods.length + 1}`, upi_id: input.upiId, qr_image_url: input.qrImageUrl ?? null, label: input.label, is_default: input.isDefault ?? false };
    if (m.is_default) {
      mPaymentMethods.forEach((x) => x.is_default = false);
    }
    mPaymentMethods.push(m);
    return { id: m.id, upiId: m.upi_id, qrImageUrl: m.qr_image_url, label: m.label, isDefault: m.is_default };
  },
  async setPaymentMethodQr(id: string, qrImageUrl: string | null): Promise<void> {
    const m = mPaymentMethods.find((x) => x.id === id);
    if (m) m.qr_image_url = qrImageUrl;
  },
  async setDefaultPaymentMethod(id: string): Promise<void> {
    mPaymentMethods.forEach((m) => {
      m.is_default = m.id === id;
    });
  },
  async deletePaymentMethod(id: string): Promise<void> {
    mPaymentMethods = mPaymentMethods.filter((m) => m.id !== id);
  },
  async getSummary(): Promise<Summary> {
    const lowStock = mInventory.filter((i) => i.qty <= i.threshold).length;
    return {
      ...mSummary,
      lowStock,
    };
  },
  async getActivity(limit = 20): Promise<Activity[]> {
    return mActivities.slice(0, limit);
  },
  async getKhata(): Promise<KhataCustomer[]> {
    return mKhata;
  },
  async getKhataTimeline(customerId: string | null): Promise<KhataTransaction[]> {
    if (!customerId) return [];
    return mKhataTimeline[customerId] || [];
  },
  async addCredit(input: { name: string; phone: string; amountRupees: number; note: string }): Promise<void> {
    let customer = mKhata.find((c) => c.phone.replace(/\s+/g, '') === input.phone.replace(/\s+/g, '') || c.name.toLowerCase() === input.name.toLowerCase());
    if (!customer) {
      customer = {
        id: `k-${mKhata.length + 1}`,
        name: input.name,
        phone: input.phone,
        amount: 0,
        updated: 'Just now',
        initials: initials(input.name),
      };
      mKhata.push(customer);
    }
    customer.amount += input.amountRupees;
    customer.updated = 'Just now';

    if (!mKhataTimeline[customer.id]) {
      mKhataTimeline[customer.id] = [];
    }
    mKhataTimeline[customer.id].unshift({
      id: `t-${Date.now()}`,
      label: input.note || 'Credit added',
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      debit: input.amountRupees,
      credit: 0,
    });

    mActivities.unshift({
      id: `act-${Date.now()}`,
      title: customer.name,
      sub: 'Credit added · Khata',
      amount: input.amountRupees,
      kind: 'credit',
      time: 'Just now',
    });

    mSummary.pendingKhata += input.amountRupees;
  },
  async settleUp(customerId: string, amountRupees?: number): Promise<void> {
    const customer = mKhata.find((c) => c.id === customerId);
    if (!customer) return;
    const settledAmount = amountRupees != null ? Math.min(customer.amount, Math.max(0, amountRupees)) : customer.amount;
    if (settledAmount <= 0) return;
    customer.amount -= settledAmount;
    customer.updated = 'Just now';

    if (!mKhataTimeline[customer.id]) {
      mKhataTimeline[customer.id] = [];
    }
    mKhataTimeline[customer.id].unshift({
      id: `t-${Date.now()}`,
      label: 'Settle up',
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      debit: 0,
      credit: settledAmount,
    });

    mActivities.unshift({
      id: `act-${Date.now()}`,
      title: customer.name,
      sub: 'Settled up',
      amount: settledAmount,
      kind: 'settle',
      time: 'Just now',
    });

    mSummary.pendingKhata -= settledAmount;
  },
  async getReminder(customerId: string): Promise<{ text: string; waUrl: string }> {
    const customer = mKhata.find((c) => c.id === customerId);
    const amount = customer?.amount ?? 0;
    const text = `Hi ${customer?.name}, this is a friendly reminder that you have a pending balance of ₹${amount} at ${mBusiness.name}. Please pay at your convenience.`;
    const cleanPhone = (customer?.phone ?? '').replace(/\s+/g, '');
    const target = cleanPhone.length >= 10 ? `91${cleanPhone.slice(-10)}` : '';
    return {
      text,
      waUrl: `https://wa.me/${target}?text=${encodeURIComponent(text)}`,
    };
  },
  async getInventoryStats(): Promise<InventoryStats> {
    const skus = mInventory.length;
    const lowCount = mInventory.filter((i) => i.qty <= i.threshold).length;
    const totalValue = mInventory.reduce((sum, item) => sum + item.qty * item.price, 0);
    return { totalValue, skus, lowCount };
  },
  async getInventory(): Promise<InventoryItem[]> {
    return mInventory;
  },
  async getInventoryRaw(): Promise<any[]> {
    return mInventory.map((i) => ({
      id: i.id,
      name: i.name,
      qty_on_hand: i.qty,
      price_paise: i.price * 100,
      tax_rate_bps: 0,
      price_is_tax_inclusive: true,
      low_stock_threshold: i.threshold,
      low: i.low,
    }));
  },
  async addInventory(input: { name: string; qty: number; threshold: number; costRupees: number; priceRupees: number }): Promise<void> {
    mInventory.unshift({
      id: `i-${mInventory.length + 1}`,
      name: input.name,
      qty: input.qty,
      price: input.priceRupees,
      threshold: input.threshold,
      low: input.qty <= input.threshold,
    });
  },
  async getBillCatalog(): Promise<CatalogItem[]> {
    return mInventory.map((i) => ({
      id: i.id,
      name: i.name,
      price: i.price,
      taxRateBps: 0,
      inclusive: true,
    }));
  },
  async getStaff(): Promise<StaffMember[]> {
    return mStaff;
  },
  async addStaff(input: { name: string; role: string; phone: string; salaryRupees: number }): Promise<void> {
    const newMember: StaffMember = {
      id: `s-${mStaff.length + 1}`,
      name: input.name,
      role: input.role,
      phone: input.phone,
      salary: input.salaryRupees,
      present: true,
      advance: 0,
      initials: initials(input.name),
    };
    mStaff.push(newMember);
  },
  async markAttendance(staffId: string, present: boolean): Promise<void> {
    const s = mStaff.find((x) => x.id === staffId);
    if (s) {
      s.present = present;
    }
  },
  async addAdvance(staffId: string, amountRupees: number, note: string): Promise<void> {
    const s = mStaff.find((x) => x.id === staffId);
    if (s) {
      s.advance += amountRupees;
      if (!mStaffDetail[staffId]) {
        mStaffDetail[staffId] = { pnl: { sales: 0, bills: 0, avg: 0 }, remainingSalary: 0, paidThisMonth: false, attendance: Array(14).fill(true), advances: [] };
      }
      mStaffDetail[staffId].advances.unshift({
        id: `ad-${Date.now()}`,
        label: note || 'Advance taken',
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        amount: amountRupees,
        repaid: false,
      });
      mActivities.unshift({
        id: `act-${Date.now()}`, title: s.name, sub: 'Advance given · Staff',
        amount: amountRupees, kind: 'advance', time: 'Just now',
      });
    }
  },
  async addRepayment(staffId: string, amountRupees: number, note: string): Promise<void> {
    const s = mStaff.find((x) => x.id === staffId);
    if (s) {
      s.advance = Math.max(0, s.advance - amountRupees);
      if (!mStaffDetail[staffId]) {
        mStaffDetail[staffId] = { pnl: { sales: 0, bills: 0, avg: 0 }, remainingSalary: 0, paidThisMonth: false, attendance: Array(14).fill(true), advances: [] };
      }
      let remaining = amountRupees;
      mStaffDetail[staffId].advances.forEach((a) => {
        if (!a.repaid && remaining > 0) {
          if (remaining >= a.amount) {
            remaining -= a.amount;
            a.repaid = true;
          } else {
            a.amount -= remaining;
            remaining = 0;
          }
        }
      });
    }
  },
  async getStaffDetail(staffId: string | null, days = 14): Promise<StaffDetail | undefined> {
    if (!staffId) return undefined;
    const base = mStaffDetail[staffId] || { pnl: { sales: 0, bills: 0, avg: 0 }, remainingSalary: 0, paidThisMonth: false, attendance: Array(14).fill(true), advances: [] };
    const member = mStaff.find((m) => m.id === staffId);
    const remaining = member ? Math.max(0, member.salary - member.advance) : base.remainingSalary;
    // Synthesize an attendance window of the requested length (mostly present).
    const attendance = Array.from({ length: days }, (_, i) => base.attendance[i % Math.max(1, base.attendance.length)] ?? true);
    return { ...base, remainingSalary: remaining, paidThisMonth: mSalaryPaid[staffId] ?? base.paidThisMonth, attendance };
  },
  async payStaffSalary(staffId: string, _amountRupees?: number, _note = 'Salary paid'): Promise<void> {
    const s = mStaff.find((x) => x.id === staffId);
    if (!s) return;
    mSalaryPaid[staffId] = true;
    s.advance = 0; // advance adjusted against salary; next month starts fresh
    mActivities.unshift({
      id: `act-${Date.now()}`, title: s.name, sub: 'Salary paid · Staff',
      amount: s.salary, kind: 'salary', time: 'Just now',
    });
  },
  async confirmBill(input: ConfirmBillInput): Promise<BillResult> {
    const invoiceNo = `${mBusiness.invoice_prefix}${invoiceCounter++}`;
    const items = input.items.map((it) => {
      const lineTotal = it.priceRupees * it.qty;
      if (it.inventoryItemId) {
        const item = mInventory.find((x) => x.id === it.inventoryItemId);
        if (item) {
          item.qty = Math.max(0, item.qty - it.qty);
          item.low = item.qty <= item.threshold;
        }
      }
      return {
        name: it.name,
        qty: it.qty,
        price: it.priceRupees,
        lineTotal,
      };
    });

    const subtotal = items.reduce((sum, it) => sum + it.lineTotal, 0);
    const discount = Math.min(subtotal, Math.max(0, (input.discountPaise ?? 0) / 100));
    const taxable = subtotal - discount;
    const taxKind = input.customerStateCode ? (input.customerStateCode === mBusiness.state_code ? 'intra' : 'inter') : 'intra';

    let taxTotal = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (mBusiness.gst_registered && input.gstMode === 'gst') {
      taxTotal = Math.round(taxable * 0.18);
      if (taxKind === 'intra') {
        cgst = Math.floor(taxTotal / 2);
        sgst = taxTotal - cgst;
      } else {
        igst = taxTotal;
      }
    }

    const grandTotal = taxable + taxTotal;

    const billResult: BillResult = {
      id: `bill-${Date.now()}`,
      invoiceNo,
      gstMode: input.gstMode === 'gst' ? 'gst' : 'non_gst',
      taxKind,
      subtotal,
      discount,
      taxable,
      cgst,
      sgst,
      igst,
      taxTotal,
      grandTotal,
      paymentMode: input.paymentMode,
      customerName: input.customerName || 'Walk-in Customer',
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      items,
    };

    if (input.staffId) {
      const staffMember = mStaff.find((x) => x.id === input.staffId);
      if (staffMember) {
        if (!mStaffDetail[input.staffId]) {
          mStaffDetail[input.staffId] = { pnl: { sales: 0, bills: 0, avg: 0 }, remainingSalary: 0, paidThisMonth: false, attendance: Array(14).fill(true), advances: [] };
        }
        mStaffDetail[input.staffId].pnl.sales += grandTotal;
        mStaffDetail[input.staffId].pnl.bills += 1;
        mStaffDetail[input.staffId].pnl.avg = Math.round(mStaffDetail[input.staffId].pnl.sales / mStaffDetail[input.staffId].pnl.bills);
      }
    }

    if (input.paymentMode === 'CREDIT' && input.customerName) {
      let customer = mKhata.find((c) => c.name.toLowerCase() === input.customerName!.toLowerCase());
      if (!customer) {
        customer = {
          id: `k-${mKhata.length + 1}`,
          name: input.customerName,
          phone: input.customerPhone || '98765 00000',
          amount: 0,
          updated: 'Just now',
          initials: initials(input.customerName),
        };
        mKhata.push(customer);
      }
      customer.amount += grandTotal;
      customer.updated = 'Just now';

      if (!mKhataTimeline[customer.id]) {
        mKhataTimeline[customer.id] = [];
      }
      mKhataTimeline[customer.id].unshift({
        id: `t-${Date.now()}`,
        label: `Bill ${invoiceNo}`,
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        debit: grandTotal,
        credit: 0,
      });

      mSummary.pendingKhata += grandTotal;
    }

    mActivities.unshift({
      id: billResult.id,
      title: `Bill ${invoiceNo}`,
      sub: `${input.paymentMode} · ${input.customerName || 'Walk-in'}`,
      amount: grandTotal,
      kind: 'sale',
      time: 'Just now',
      billId: billResult.id,
    });

    mSummary.todaysSales += grandTotal;
    mSummary.todaysBills += 1;

    mBills[billResult.id] = billResult;
    return billResult;
  },
  async getBill(billId: string): Promise<BillResult> {
    const stored = mBills[billId];
    if (stored) return stored;
    // Synthesize a minimal invoice from a seeded activity row so the demo flows.
    const act = mActivities.find((a) => a.id === billId);
    if (!act) throw new Error('Bill not found');
    return {
      id: act.id, invoiceNo: act.title.replace('Bill ', ''), gstMode: 'non_gst', taxKind: 'none',
      subtotal: act.amount, discount: 0, taxable: act.amount, cgst: 0, sgst: 0, igst: 0,
      taxTotal: 0, grandTotal: act.amount,
      paymentMode: act.sub.includes('Credit') ? 'CREDIT' : act.sub.includes('UPI') ? 'UPI' : 'CASH',
      customerName: act.sub.split('·').pop()?.trim() ?? 'Walk-in', date: 'Today',
      items: [{ name: act.title, qty: 1, price: act.amount, lineTotal: act.amount }],
    };
  },
  async getBillShareLink(_billId: string): Promise<string | null> {
    return null; // no hosted storage in mock mode
  },
  async getBillUpi(billId: string): Promise<UpiInfo> {
    const defaultMethod = mPaymentMethods.find((m) => m.is_default) ?? mPaymentMethods[0];
    const upiId = defaultMethod?.upi_id ?? 'sharma@oksbi';
    const label = defaultMethod?.label ?? 'SBI Shop Account';
    return {
      upiId,
      label,
      deeplink: `upi://pay?pa=${upiId}`,
      qrPngBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    };
  },
  async getAnalytics(period: PeriodKey): Promise<AnalyticsPeriod> {
    const lowCount = mInventory.filter((i) => i.qty <= i.threshold).length;
    const totalValue = mInventory.reduce((sum, item) => sum + item.qty * item.price, 0);

    let topStaffName = 'Amit Kumar';
    let maxSales = 0;
    mStaff.forEach((s) => {
      const detail = mStaffDetail[s.id];
      if (detail && detail.pnl.sales > maxSales) {
        maxSales = detail.pnl.sales;
        topStaffName = s.name;
      }
    });

    const sales = period === 'today' ? mSummary.todaysSales : period === 'week' ? mSummary.todaysSales * 7 : mSummary.todaysSales * 30;
    const netPnl = period === 'today' ? mSummary.todaysSales * 0.4 : period === 'week' ? mSummary.todaysSales * 2.8 : mSummary.todaysSales * 12;
    const prevSales = period === 'today' ? mSummary.yesterdaySales : period === 'week' ? mSummary.yesterdaySales * 7 : mSummary.yesterdaySales * 30;
    const prevNetPnl = prevSales * 0.4;

    const billCount = period === 'today' ? mSummary.todaysBills : period === 'week' ? mSummary.todaysBills * 7 : mSummary.todaysBills * 30;
    const prevBillCount = Math.round(billCount * 0.9);
    const days = period === 'today' ? 1 : period === 'week' ? 7 : 30;
    const avgBill = billCount ? Math.round(sales / billCount) : 0;
    const prevAvgBill = prevBillCount ? Math.round(prevSales / prevBillCount) : 0;
    const payCash = Math.round(sales * 0.5);
    const payUpi = Math.round(sales * 0.32);
    const payCredit = Math.max(0, sales - payCash - payUpi);
    const weekdayTotals = [0.12, 0.13, 0.11, 0.15, 0.16, 0.21, 0.12].map((f) => Math.round(sales * f));
    const topCustomers = mKhata.slice(0, 5).map((c, i) => ({ name: c.name, total: Math.round(c.amount * 1.5), bills: 8 - i }));
    return {
      netPnl, sales, credit: mSummary.pendingKhata, inventory: totalValue,
      topStaff: topStaffName, spark: mAnalytics[period]?.spark ?? [0, 0],
      prevNetPnl, prevSales,
      billCount, avgBill, prevAvgBill,
      billsPerDay: Math.round((billCount / days) * 100) / 100,
      prevBillsPerDay: Math.round((prevBillCount / days) * 100) / 100,
      topCustomers, newCustomers: 2, repeatCustomers: Math.max(0, topCustomers.length - 2),
      busiestWeekday: sales > 0 ? 'Saturday' : '', peakHourLabel: sales > 0 ? '6–7 PM' : '',
      weekdayTotals,
      payCash, payUpi, payCredit,
    };
  },
  async getBestSelling(period: PeriodKey = 'month'): Promise<BestSelling[]> {
    return mBestSelling;
  },
  async searchCustomers(q: string): Promise<CustomerHit[]> {
    const filterText = q.toLowerCase();
    return mKhata
      .filter((c) => c.name.toLowerCase().includes(filterText) || c.phone.includes(filterText))
      .map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        outstanding: c.amount,
      }));
  },
  async getCustomerActivity(customerId: string): Promise<Activity[]> {
    const tl = mKhataTimeline[customerId] || [];
    return tl.map((t) => ({
      id: t.id,
      title: t.label,
      sub: t.debit > 0 ? 'Credit · Khata' : 'Payment received',
      amount: t.debit > 0 ? t.debit : t.credit,
      kind: t.debit > 0 ? ('credit' as const) : ('settle' as const),
      time: t.date,
      billId: null,
    }));
  },
};

export const api = process.env.EXPO_PUBLIC_USE_MOCK_DATA === 'true' ? mockApi : realApi;
