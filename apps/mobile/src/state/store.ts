import { create } from 'zustand';
import type { BrandName } from '@/theme/tokens';
import type { TabName } from '@/theme/pageThemes';
import type { Business, CatalogItem } from '@/data/types';

/** RFC-ish v4 uuid for idempotency keys (no crypto dependency needed). */
export function makeUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export type OverlayName =
  | null
  | 'createBill'
  | 'activity'
  | 'customer'
  | 'staffDetail'
  | 'addCredit'
  | 'addInventory'
  | 'addStaff'
  | 'invoice'
  | 'search'
  | 'customerActivity'
  | 'settle';

export type PayMode = 'Cash' | 'UPI' | 'Credit';

export interface BillItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  /** Inventory link — null for ad-hoc/custom lines (no stock effect). */
  inventoryItemId: string | null;
  taxRateBps: number;
  inclusive: boolean;
}

/** AppState — implemented verbatim from the design handoff's "State Management" section. */
export interface AppState {
  phase: 'onboarding' | 'app';
  obStep: 0 | 1 | 2 | 3 | 4 | 5;
  mobile: string;
  otp: [string, string, string, string, string, string];
  resend: number;
  form: { owner: string; shop: string; industry: string; gst: boolean | null; gstin: string };
  tab: TabName;
  brandColor: BrandName;
  emptyMode: boolean; // demo only
  overlay: OverlayName;
  selCustomer: string | null;
  selStaff: string | null;
  /** Bill id for the read-only invoice overlay. */
  selBill: string | null;
  /** Customer whose full activity page is open. */
  selCustomerActivity: { id: string; name: string } | null;
  /** Customer being settled (partial settlement sheet). */
  selSettle: { id: string; name: string; outstanding: number } | null;
  presence: Record<string, boolean>;
  cb: {
    items: BillItem[];
    search: string;
    payMode: PayMode;
    staff: string;
    custName: string;
    custPhone: string;
    step: 'build' | 'review';
    nName: string;
    nQty: string;
    nPrice: string;
    /** Idempotency key — one per bill being built; confirm replays are safe. */
    requestId: string;
    /** Per-bill GST toggle (GST-registered shops only); null = business default. */
    gstMode: 'gst' | 'non_gst' | null;
    /** Customer's state code (place of supply); '' = same as business. */
    custState: string;
    /** Chosen "Receive payment in" method; null = business default. */
    payMethodId: string | null;
    /** Bill-level discount: a flat ₹ amount or a % of subtotal. */
    discountKind: 'amount' | 'percent';
    /** Raw discount input (rupees when 'amount', percent when 'percent'). */
    discountInput: string;
  };
  period: 'today' | 'week' | 'month';
  khataSearch: string;
  toast: string | null;
  /** Bumps after every mutation; useApi re-fetches on change. */
  refreshKey: number;
  /** Cached business profile (header, invoice, profile screen). */
  business: Business | null;
}

function initialCb(): AppState['cb'] {
  return {
    items: [],
    search: '',
    payMode: 'Cash',
    staff: '',
    custName: '',
    custPhone: '',
    step: 'build',
    nName: '',
    nQty: '',
    nPrice: '',
    requestId: makeUuid(),
    gstMode: null,
    custState: '',
    payMethodId: null,
    discountKind: 'amount',
    discountInput: '',
  };
}

/** Effective discount in rupees from the build-step input, clamped to subtotal. */
export function cbDiscountRupees(cb: AppState['cb'], subtotal: number): number {
  const raw = parseFloat(cb.discountInput);
  if (!(raw > 0)) return 0;
  const value = cb.discountKind === 'percent' ? (subtotal * raw) / 100 : raw;
  return Math.min(subtotal, Math.max(0, value));
}

interface AppActions {
  setPhase: (phase: AppState['phase']) => void;
  setObStep: (obStep: AppState['obStep']) => void;
  setMobile: (mobile: string) => void;
  setOtp: (otp: AppState['otp']) => void;
  setResend: (resend: number) => void;
  setForm: (patch: Partial<AppState['form']>) => void;
  setTab: (tab: TabName) => void;
  setBrandColor: (brandColor: BrandName) => void;
  toggleEmpty: () => void;
  openOverlay: (overlay: Exclude<OverlayName, null>) => void;
  closeOverlay: () => void;
  openCustomer: (id: string) => void;
  openStaff: (id: string) => void;
  openInvoice: (billId: string) => void;
  openSearch: () => void;
  openCustomerActivity: (id: string, name: string) => void;
  openSettle: (id: string, name: string, outstanding: number) => void;
  togglePresent: (staffId: string, base: boolean) => void;
  setPeriod: (period: AppState['period']) => void;
  setKhataSearch: (khataSearch: string) => void;
  flashToast: (msg: string) => void;
  // Create Bill
  cbSet: (patch: Partial<AppState['cb']>) => void;
  cbAddCatalogItem: (item: CatalogItem) => void;
  cbAddCustomItem: () => void;
  cbInc: (id: string) => void;
  cbDec: (id: string) => void;
  cbReset: () => void;
  refresh: () => void;
  setBusiness: (business: Business | null) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;
let customSeq = 0;

export const useAppStore = create<AppState & AppActions>((set, get) => ({
  phase: 'onboarding',
  obStep: 0,
  mobile: '',
  otp: ['', '', '', '', '', ''],
  resend: 30,
  form: { owner: '', shop: '', industry: '', gst: null, gstin: '' },
  tab: 'billing',
  brandColor: 'Plum',
  emptyMode: false,
  overlay: null,
  selCustomer: null,
  selStaff: null,
  selBill: null,
  selCustomerActivity: null,
  selSettle: null,
  presence: {},
  cb: initialCb(),
  period: 'today',
  khataSearch: '',
  toast: null,
  refreshKey: 0,
  business: null,

  setPhase: (phase) => set({ phase }),
  setObStep: (obStep) => set({ obStep }),
  setMobile: (mobile) => set({ mobile }),
  setOtp: (otp) => set({ otp }),
  setResend: (resend) => set({ resend }),
  setForm: (patch) => set((s) => ({ form: { ...s.form, ...patch } })),
  setTab: (tab) => set({ tab, overlay: null }),
  setBrandColor: (brandColor) => set({ brandColor }),
  toggleEmpty: () => set((s) => ({ emptyMode: !s.emptyMode })),
  openOverlay: (overlay) => set({ overlay }),
  closeOverlay: () => set({ overlay: null }),
  openCustomer: (id) => set({ selCustomer: id, overlay: 'customer' }),
  openStaff: (id) => set({ selStaff: id, overlay: 'staffDetail' }),
  openInvoice: (billId) => set({ selBill: billId, overlay: 'invoice' }),
  openSearch: () => set({ overlay: 'search' }),
  openCustomerActivity: (id, name) => set({ selCustomerActivity: { id, name }, overlay: 'customerActivity' }),
  openSettle: (id, name, outstanding) => set({ selSettle: { id, name, outstanding }, overlay: 'settle' }),
  togglePresent: (staffId, base) =>
    set((s) => {
      const current = s.presence[staffId] ?? base;
      return { presence: { ...s.presence, [staffId]: !current } };
    }),
  setPeriod: (period) => set({ period }),
  setKhataSearch: (khataSearch) => set({ khataSearch }),
  flashToast: (msg) => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: msg });
    toastTimer = setTimeout(() => {
      toastTimer = null;
      set({ toast: null });
    }, 2200);
  },

  cbSet: (patch) => set((s) => ({ cb: { ...s.cb, ...patch } })),
  cbAddCatalogItem: (item) =>
    set((s) => {
      const existing = s.cb.items.find((it) => it.id === item.id);
      const items = existing
        ? s.cb.items.map((it) => (it.id === item.id ? { ...it, qty: it.qty + 1 } : it))
        : [
            ...s.cb.items,
            {
              id: item.id, name: item.name, price: item.price, qty: 1,
              inventoryItemId: item.id, taxRateBps: item.taxRateBps, inclusive: item.inclusive,
            },
          ];
      return { cb: { ...s.cb, items } };
    }),
  cbAddCustomItem: () => {
    const { cb } = get();
    const name = cb.nName.trim();
    const qty = Math.max(1, parseInt(cb.nQty, 10) || 1);
    const price = Math.max(0, Math.round(parseFloat(cb.nPrice) || 0));
    if (!name || price <= 0) return;
    set((s) => ({
      cb: {
        ...s.cb,
        items: [
          ...s.cb.items,
          { id: `custom-${++customSeq}`, name, price, qty, inventoryItemId: null, taxRateBps: 0, inclusive: true },
        ],
        nName: '',
        nQty: '',
        nPrice: '',
      },
    }));
  },
  cbInc: (id) =>
    set((s) => ({
      cb: { ...s.cb, items: s.cb.items.map((it) => (it.id === id ? { ...it, qty: it.qty + 1 } : it)) },
    })),
  cbDec: (id) =>
    set((s) => ({
      cb: {
        ...s.cb,
        items: s.cb.items
          .map((it) => (it.id === id ? { ...it, qty: it.qty - 1 } : it))
          .filter((it) => it.qty > 0),
      },
    })),
  cbReset: () => set({ cb: initialCb() }),
  refresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
  setBusiness: (business) => set({ business }),
}));

/** Live bill total for the Create Bill footer. */
export function cbTotal(items: BillItem[]): number {
  return items.reduce((sum, it) => sum + it.price * it.qty, 0);
}

/** Active brand palette hook. */
import { BrandPalettes } from '@/theme/tokens';
export function useBrand() {
  const brandColor = useAppStore((s) => s.brandColor);
  return BrandPalettes[brandColor];
}
