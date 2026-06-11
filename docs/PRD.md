# Claro — Product Requirements Document (MVP)

**Product:** Claro — a billing, ledger (Khata), inventory & staff OS for Indian MSMEs
**Audience:** Indian shopkeepers, 30–50, low-to-mid digital literacy, mobile-first
**Positioning:** A premium, high-trust fintech flagship — the anti-clutter alternative to cheap utility apps
**Target form factor:** React Native / Expo app (Android-first, tested via Expo Go), Supabase + FastAPI backend.
**Version:** 0.1 (MVP)

---

## 1. Product Principles
1. **One primary action per screen** — a single large CTA; no decision paralysis.
2. **Money is the hero** — financial figures are the largest type on screen.
3. **Trust through calm** — white cards, whitespace, soft shadows, per-page pastel themes.
4. **Thumb-first** — primary actions in the lower screen; bottom nav always reachable.
5. **Forgiving** — confirmations on destructive actions, plain-language errors.
6. **Offline-tolerant** (architect for it; harden post-MVP).

## 2. Personas
**Ramesh, 44 — kirana owner, Tier-2 city.** Daily WhatsApp user, types slowly, distrusts "cheap" apps. Wants fast billing and to stop losing track of udhaar.
**Sunita, 38 — boutique owner, 3 staff.** Tracks attendance and advances on paper. Wants professional GST invoices.

## 3. Information Architecture
```
Onboarding (Splash → Mobile+OTP → Profile → GST toggle → Success)
└── App Shell (5-tab bottom nav)
    ├── Tab 1: Billing & Invoicing (home)
    ├── Tab 2: Khata (Credit Ledger)
    ├── Tab 3: Stock & Inventory
    ├── Tab 4: Staff Management
    └── Tab 5: Analytics
```

## 4. Feature Requirements

### 0. Auth & Onboarding
Mobile + OTP login (`+91` locked, 6-digit OTP, 30s resend). Business profile (owner, shop, industry). **Critical GST toggle** — "GST Registered? Yes/No"; Yes reveals GSTIN. This flag controls the invoice template app-wide.

### 1. Billing & Invoicing (Tab 1 — home)
Header (shop + greeting + avatar). Today's Sales hero + mini stats (Bills, Pending Khata, Low Stock). Recent activity feed. Massive **+ Create Bill** CTA. Create Bill flow: add items (search inventory or custom line), live running total, attribute-to-staff, customer, payment mode (Cash/UPI/Credit) → review invoice (GST CGST/SGST split if registered, else simple) → PDF + UPI QR + WhatsApp share. **Confirming a bill auto-decrements inventory.**

### 2. Khata (Tab 2)
Outstanding-credit list per customer (bold red amounts). Quick actions: **Settle Up** + **WhatsApp Reminder**. **+ Add Credit Record** CTA. Customer detail = running-balance transaction timeline.

### 3. Stock & Inventory (Tab 3)
Total stock value hero + SKU/low-stock stats. Item rows with low-stock badges. **+ Add Inventory** (name, qty, cost, selling price, low-stock threshold). Auto-reduces when billed.

### 4. Staff Management (Tab 4)
Staff rows with Present/Absent toggle + outstanding advance. Profile: performance (sales attributed), 14-day attendance grid, advance/loan tracker. **+ Add Staff** (name, role, phone, salary).

### 5. Analytics (Tab 5)
Period selector (Today/Week/Month). Net P&L hero + sparkline. KPI tiles (Total Sales, Credit Outstanding, Inventory Value, Top Staff). Best-selling items. **Export for CA** (CSV).

## 5. Data Model (entities & key fields)
```
User            id, phone, owner_name, created_at
Business        id, user_id, name, industry, is_gst_registered, gstin, default_tax_rate
InventoryItem   id, business_id, name, qty, cost_price, target_price, low_stock_threshold
Customer        id, business_id, name, phone, outstanding_balance
Staff           id, business_id, name, role, phone, salary, advance_outstanding
Bill            id, business_id, customer_id?, staff_id?, subtotal, tax_total, grand_total,
                payment_mode, is_gst, upi_vpa, pdf_url, created_at
BillItem        id, bill_id, inventory_item_id?, name, qty, unit_price, line_total
KhataEntry      id, business_id, customer_id, type(credit|payment), amount, note, created_at
Attendance      id, staff_id, date, status(present|absent)
StaffLedger     id, staff_id, type(advance|repayment|sale_attrib), amount, note, created_at
```
**Invariants:** confirming a bill decrements stock atomically; credit bill creates KhataEntry(credit) + raises customer balance; settle-up creates KhataEntry(payment); staff-attributed bills append StaffLedger(sale_attrib). Full transaction spec in `billing_rules.md`.

## 6. Design tokens
See `docs/design/design-handoff.md` for the authoritative, high-fidelity spec (brand `#2D1150`, per-page pastel themes, Plus Jakarta Sans, Material Symbols, Indian lakh number formatting, shadows, radii, motion). Reproduce exactly.

## 7. MVP scope
**In:** onboarding + 5 tabs, PDF + UPI QR + WhatsApp, auto inventory decrement, staff PNL/advance, CSV export.
**Out (post-MVP):** multi-language UI, true offline sync, multi-user roles, payment-gateway settlement, barcode scan, push notifications.

## 8. Definition of done
All onboarding + 5 tabs navigable; Create Bill → PDF + valid UPI QR + WhatsApp share; billing decrements inventory; credit appears in Khata; Settle Up + reminder work; staff attendance + advances persist; analytics computes from real data; CSV export downloads.
