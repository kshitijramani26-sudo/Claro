/**
 * Single API seam — now a typed HTTP client against the Claro FastAPI service.
 * Screens read/write data ONLY through this module.
 *
 * Money: the backend speaks integer paise; this layer converts to display
 * rupees so every existing screen keeps working unchanged.
 */
import { request } from './http';
import { paiseToRupees as r, timeAgo } from './format';
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
  items: { name: string; qty: number; unit_price_paise: number; line_total_paise: number }[];
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
    items: w.items.map((i) => ({ name: i.name, qty: i.qty, price: r(i.unit_price_paise), lineTotal: r(i.line_total_paise) })),
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
}

export const api = {
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
  async addPaymentMethod(input: { upiId: string; label: string; isDefault?: boolean }): Promise<PaymentMethod> {
    const m = await request<{ id: string; upi_id: string; qr_image_url: string | null; label: string; is_default: boolean }>('/payment-methods', {
      method: 'POST', json: { upi_id: input.upiId, label: input.label, is_default: input.isDefault ?? false },
    });
    return { id: m.id, upiId: m.upi_id, qrImageUrl: m.qr_image_url, label: m.label, isDefault: m.is_default };
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
    }>('/summary/today');
    return {
      todaysSales: r(s.todays_sales_paise), todaysBills: s.todays_bills,
      pendingKhata: r(s.pending_khata_paise), lowStock: s.low_stock,
      monthSales: r(s.month_sales_paise), topStaff: s.top_staff, monthLabel: s.month_label,
    };
  },
  async getActivity(limit = 20): Promise<Activity[]> {
    const rows = await request<{ id: string; title: string; sub: string; amount_paise: number; kind: Activity['kind']; at: string }[]>(`/activity?limit=${limit}`);
    return rows.map((a) => ({ id: a.id, title: a.title, sub: a.sub, amount: r(a.amount_paise), kind: a.kind, time: timeAgo(a.at) }));
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
  async settleUp(customerId: string): Promise<void> {
    await request(`/khata/${customerId}/settle`, { method: 'POST', json: {} });
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
  async getStaffDetail(staffId: string | null): Promise<StaffDetail | undefined> {
    if (!staffId) return undefined;
    const d = await request<{
      sales_paise: number; bills: number; avg_bill_paise: number; attendance14: boolean[];
      advances: { id: number; label: string; amount_paise: number; repaid: boolean; at: string }[];
    }>(`/staff/${staffId}`);
    return {
      pnl: { sales: r(d.sales_paise), bills: d.bills, avg: r(d.avg_bill_paise) },
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
      },
    });
    return mapBill(w);
  },
  async getBillUpi(billId: string): Promise<UpiInfo> {
    const u = await request<{ upi_id: string; label: string; deeplink: string; qr_png_base64: string }>(`/bills/${billId}/upi`);
    return { upiId: u.upi_id, label: u.label, deeplink: u.deeplink, qrPngBase64: u.qr_png_base64 };
  },

  // ── analytics ──
  async getAnalytics(period: PeriodKey): Promise<AnalyticsPeriod> {
    const a = await request<{
      net_pnl_paise: number; sales_paise: number; credit_outstanding_paise: number;
      inventory_value_paise: number; top_staff: string; spark: number[];
    }>(`/analytics?period=${period}`);
    return {
      netPnl: r(a.net_pnl_paise), sales: r(a.sales_paise), credit: r(a.credit_outstanding_paise),
      inventory: r(a.inventory_value_paise), topStaff: a.top_staff,
      spark: a.spark.length >= 2 ? a.spark : [0, ...a.spark, 0],
    };
  },
  async getBestSelling(period: PeriodKey = 'month'): Promise<BestSelling[]> {
    const rows = await request<{ id: string; name: string; units: number; revenue_paise: number }[]>(`/analytics/best-selling?period=${period}`);
    return rows.map((b) => ({ id: b.id, name: b.name, units: b.units, revenue: r(b.revenue_paise) }));
  },

  // ── customers ──
  async searchCustomers(q: string): Promise<CustomerHit[]> {
    const rows = await request<{ id: string; name: string; phone: string; outstanding_paise: number }[]>(`/customers/search?q=${encodeURIComponent(q)}`);
    return rows.map((c) => ({ id: c.id, name: c.name, phone: c.phone, outstanding: r(c.outstanding_paise) }));
  },
};
