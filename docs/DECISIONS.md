# DECISIONS.md — Project Claro build log

> Append-only. Every agent reads this before working and adds an entry after working. Newest at top. This is the shared memory that survives across model/agent handoffs (Claude Code → Antigravity).

Format:
```
## [DATE] — [agent/model] — [short title]
- What changed:
- Why:
- Open items / next:
```

## [2026-06-14] — Antigravity — Optical Industry Billing & Prescription Bug Fixes
- What changed:
  - **Advance Payment QR**: Fixed ScanPayOverlay QR code to show the received advance amount (e.g. ₹1000) rather than the total bill (e.g. ₹1800) during advance payment UPI method.
  - **QR Block in InvoiceCard**: Updated the QR code block in `InvoiceCard.tsx` to display the `amountReceived` (e.g. ₹1000) instead of `totals.grand` when a partial payment is being made.
  - **Customer Search Hits**: Added a helper `phoneMatch` to compare the last 10 digits of phone numbers, and name prefix matching to ensure the "Use last Rx" button auto-shows reliably in Create Bill.
  - **Customer Activity page**: Replaced the old Rx card with a customer details header card (showing avatar, name, phone, outstanding, and a "See Power" button) and rendered the latest prescription parameters directly on the page.
  - **Tapping Timeline Invoice rows**: Added `billId` mapping to timeline entries in both mock and real API `getKhataTimeline` so that tapping search timeline items correctly opens the invoice summary overlay.
  - **WhatsApp Message**: Formatted and appended detailed eye prescription (Rx) parameters to the WhatsApp message text if the industry is `Optical`.
  - **PDF Status Badge**: Modified the Python backend PDF generator `pdfgen.py` to draw a colored status badge (`PAID`, `PARTIALLY PAID`, or `UNPAID`) next to the document header, matching the theme tokens.
  - **Prescription Date 500 error**: Fixed a backend type error (`TypeError: fromisoformat: argument must be str`) in `confirm_bill` by safely handling both `datetime.date` objects and string inputs for `rx.date`.
- Why:
  - Addressed client-side user experience bugs and database representation bugs to ensure correct billing and prescription recall for Optical stores.
- Open items / next:
  - Run physical-device validation on Expo Go.
  - Deploy latest changes to the hosted branch.

## [2026-06-14] — Antigravity — Full features implementation (Advance Payments, Eye Prescriptions, Order Status)
- What changed:
  - **Type & Compile Fixes**: Resolved TypeScript compile errors in `CreateBillOverlay.tsx`, `InvoiceCard.tsx`, and `CustomerDetailOverlay.tsx` by correcting non-existent `Colors.successBg` to `Colors.successTile`, and importing the `Tap` component from `@/components/atoms/Tap`.
  - **Verification**: Ran `npx tsc --noEmit` and `npx expo-doctor` successfully (18/18 checks passed). Started the local Postgres instance on port 5544 and executed backend test suite (`pytest`) successfully with 37/37 tests passing green.
- Why:
  - Finalize and compile the frontend features for Advance/Partial Payments (Part B), Optical Prescription Cards/Recall (Part C), and Order Status Tracking (Part D).
- Open items / next:
  - Run physical-device validation via Expo Go.
  - Deploy to Render/Supabase and update OTA update branch.

## [2026-06-12] — Claude Code (Opus 4.8) — Device-test bug fixes (500s, deletes, edits, cost-basis stock)
- Reported from on-device (Android APK → live Render/Supabase) testing:
  - **#1/#2/#4 — 500 on bill-confirm / PDF / WhatsApp / add-credit (CRITICAL).** Root cause found via Supabase MCP postgres logs + reproduction: `ON CONFLICT (business_id, phone)` cannot infer the **partial** unique index `customers_biz_phone_idx (... WHERE phone IS NOT NULL)` → `42P10`. Any customer upsert *with a phone* 500'd. Local tests had only upserted customers without a phone, so it slipped through. Fix: add `WHERE phone IS NOT NULL` to the conflict target in `services/bills.py` and `routers/khata.py`. PDF/WhatsApp 500'd because they auto-confirm the bill first.
  - **#7 — delete an invoice.** New `DELETE /bills/{id}` → `void_bill()`: one txn restores stock, undoes the customer credit balance (clamped ≥ 0), removes stock/khata/payment/staff ledger rows, deletes the bill (items cascade). Frontend: "Delete invoice" button on `InvoiceSummaryOverlay` with confirm dialog.
  - **#3 — edit/remove staff.** Backend `PATCH`/`DELETE /staff/{id}` already existed; wired `api.patchStaff`/`deleteStaff` + an "Edit" button on `StaffDetailOverlay` opening a sheet (name/role/phone/salary) and "Remove staff member". Profile subtitle now shows role + phone.
  - **#5 — delete inventory item.** `DELETE /inventory/{id}` hardened to NULL historical `bill_items.inventory_item_id` first (avoids FK 500 on a sold item). Frontend: trash icon per inventory row + confirm.
  - **#6 — stock value = cost basis.** `inventory/stats` total now `sum(qty × cost_paise)` (capital invested), not selling price.
  - **#8 — theme:** all new affordances use the page-themed tokens (staff mint, stock amber, billing lavender) + danger tokens for destructive actions.
- Verified: `tsc` clean; **pytest 34** (added phone-upsert regression, confirm-with-phone, cost basis, void cash, void-credit-reverses-balance). Reproduced + fixed the `42P10` against the hosted DB directly (rolled back).
- Deploy: backend → `git push origin main` (Render auto-redeploy); frontend → `eas update --branch preview` (OTA to the installed APK, no reinstall). DB schema unchanged (the index was fine; the query was wrong).
- Open items / next: owner re-tests the four 500 flows + the new delete/edit actions on-device after Render redeploys + the OTA lands.

## [2026-06-12] — Claude Code (Opus 4.8) — Preview-build verify + OTA confirm + first APK build
- What changed:
  - **Verify (TASK 1)**: confirmed `src/data/industries.ts` (14 industries) is imported by both `app/onboarding/profile.tsx` and `app/profile.tsx`. `tsc --noEmit` clean; `expo-doctor` 18/18. Deduped `app.json` android.permissions (READ/WRITE_CONTACTS were each listed twice → once each). Confirmed `eas.json` preview env targets the live backend (`EXPO_PUBLIC_API_BASE_URL=https://claro-backend-3zh8.onrender.com`, `USE_MOCK_DATA`/`USE_MOCKS=false`, `DEV_AUTH=false`, `BETA_AUTH=true`).
  - **OTA (TASK 2)** — already wired by prior commits, verified intact: `expo-updates ~29.0.18` installed; `app.json` has `runtimeVersion: {policy: appVersion}` + `updates.url = https://u.expo.dev/<projectId>`; `eas.json` preview profile `channel: "preview"`. Added `cli.appVersionSource: "local"` to eas.json (silences the future-required warning; pairs with the appVersion runtime policy).
  - **Live backend check**: Render `/openapi.json` confirms the deployed API is current — has `top_customers`, `pay_credit_paise`, `/auth/login`, `/staff/{id}/pay-salary`. Local `main` is in sync with `origin/main` (0 unpushed), so the APK's backend matches the codebase.
  - **Build**: kicked off `eas build -p android --profile preview` (cloud) to produce the installable APK + shareable link.
- Why: ship a fully-working, installable Android preview that talks to the live backend, with OTA so future JS fixes don't need a reinstall.
- Owner runs:
  - Rebuild (only when native config/deps change): `eas build -p android --profile preview`
  - Push JS/asset fixes to the same installed APK: `eas update --branch preview -m "msg"`
- Open items / next: install the finished APK on the emulator + a device for a full manual pass before wider rollout.

## [2026-06-12] — Antigravity (Gemini 3.5 Flash) — EAS Android Build Configuration
- What changed:
  - **EAS Profile Configuration**: Modified `eas.json` preview profile environment variables to configure production API Base URL (`https://claro-backend-3zh8.onrender.com`), disable mock data, disable dev bypass, and enable Beta Auth.
  - **App Verification**: Verified `app.json` contains correct package configuration (`com.kshitijr26.claro`), icons, splash, and contacts permission settings.
- Why:
  - Prepare configuration to compile installable Android APKs targeting the live Render/Supabase backend.
- Open items / next:
  - Run EAS login and EAS cloud build.

## [2026-06-12] — Antigravity (Gemini 3.5 Flash) — Mobile Session Persistence
- What changed:
  - **Storage Persistence**: Added filesystem-based token persistence in `supabase.ts` using Expo File System v19 (`Paths.document` and `File`).
  - **Session Restoration**: Updated root `_layout.tsx` to read the stored token at startup, set it in the HTTP client headers, and check for an existing business profile.
  - **Flicker-free Startup**: Holds splash screen hide sequence until the session check resolves, routing logged-in users directly to `/(tabs)`.
- Why:
  - Already logged in users should bypass the onboarding/OTP screens on cold restart.
- Open items / next:
  - Test end-to-end mobile flow.

## [2026-06-12] — Antigravity (Gemini 3.5 Flash) — Temporary BETA Auth without SMS
- What changed:
  - **Backend Settings**: Added `beta_auth` (bool) and `beta_login_code` (str) to `config.py`.
  - **Backend Router**: Created `app/routers/auth.py` exposing `/auth/login` and `/auth/verify`. Uses in-memory rate limiting by IP and Phone, checks code against `BETA_LOGIN_CODE`, and returns an HS256-signed Supabase-compatible JWT access token.
  - **Backend Integration**: Registered `/auth` router in `main.py` and added test cases to `tests/test_new_features.py`. Passed 29/29 pytest tests.
  - **Mobile Client**: Modified `src/lib/supabase.ts` to redirect authentication calls to our backend API when `EXPO_PUBLIC_BETA_AUTH=true`.
  - **Onboarding UI**: Added a hint message on the OTP screen showing `Beta: enter code 123456` when `BETA_AUTH` is enabled.
  - **App Environment**: Updated mobile `.env` with the production API Base URL, disabling mocks, and enabling Beta Auth.
- Why:
  - Allow zero-SMS-cost instant beta testing for testers by entering any phone number with the shared beta login code.
- Open items / next:
  - Commit changes, push to GitHub to trigger Render build, and test end-to-end mobile flow.

## [2026-06-12] — Antigravity (Gemini 3.5 Flash) — Backend live on Render & Supabase online
- What changed:
  - **Database Migration**: Applied the table schema from `database/schema.sql` to the live remote Supabase PostgreSQL database instance.
  - **API Configuration**: Configured `DATABASE_URL` with the URL-encoded Supabase connection pooling URI (using the `aws-1-ap-south-1` pooler on port 6543 to resolve IPv6/IPv4 compatibility issues on Render).
  - **Dockerfile**: Modified `services/api/Dockerfile` CMD command to bind uvicorn to `$PORT` and added a root-level `Dockerfile` to enable Render auto-detection.
  - **Render Deployment**: Configured and deployed the Dockerized FastAPI service to Render (now live at `https://claro-backend-3zh8.onrender.com`).
  - **Verification**: Verified database connectivity and API health endpoint (`https://claro-backend-3zh8.onrender.com/health` successfully returns `{"ok":true}`).
- Why:
  - Establishes a persistent, cloud-hosted API and database backend for the mobile application.
- Open items / next:
  - Step 3: Configure the mobile app (`apps/mobile`) to connect to the new live Render backend.

## [2026-06-12] — Claude Code (Opus 4.8) — Analytics: 4 new sections (top customers, busiest times, averages, payment mix)
- What changed:
  - **Backend (`routers/analytics.py` + `schemas.py`)**: extended `GET /analytics?period=` (same transaction). Added to the single KPI row: `bill_count`, `prev_bill_count`, `pay_cash/upi/credit` (sum by `payment_mode`). Added aggregations: top-5 customers by spend (bills JOIN customers, GROUP BY), new-vs-repeat (per-customer `min(created_at)` over all their bills — first-bill-in-period ⇒ new, earlier bill ⇒ repeat), weekday histogram (`isodow … AT TIME ZONE 'Asia/Kolkata'`) and peak hour (`extract(hour … IST)`). `AnalyticsRead` gains `bill_count, avg_bill_paise, prev_avg_bill_paise, bills_per_day, prev_bills_per_day, top_customers[], new_customers, repeat_customers, busiest_weekday, peak_hour_label, weekday_totals[7], pay_{cash,upi,credit}_paise`. avg_bill = sales // bill_count; bills_per_day = bill_count / days-in-period (today 1 / week 7 / month elapsed); prev uses the existing `_prev_window`. `_hour_label()` formats `6–7 PM`.
  - **Frontend (`analytics.tsx`, `api.ts`, `types.ts`)**: 4 cards below Best-selling, each its own Card, all driven by the existing period selector (re-fetch on change). §1 Top customers (New/Repeat summary row + ranked rows reusing the best-selling style). §2 Busiest times (headline "Peak: Saturdays, 6–7 PM" + 7 weekday bars, peak bar in accent, others in tile). §3 two `DeltaTile`s (Avg bill value, Bills/day) with green/red `periodDelta` chips ("New" when prev=0). §4 Payment mix (3-segment stacked bar cash=green/UPI=accent/credit=danger + legend with amount & %, "₹X tied up in udhaar" callout). Graceful empty states (— / "No customer sales yet") when the period has no data. `api.ts` maps all new fields (paise→rupees at the edge); `mockApi.getAnalytics` derives plausible values so mock mode shows the cards.
- Verified: `tsc --noEmit` clean; **pytest 28 passed** (added `test_analytics_sections`: avg_bill == sales//count, payment mix sums to sales, top customer + new/repeat counts, weekday histogram length 7 & sums to sales). Live HTTP hand-check against seed: avg_bill == sales/bill_count across today/week/month, payment-mix % summed to 100, bills_per_day month = 7/12 = 0.58, a ₹1,200 credit bill to a customer surfaced in top_customers with new=1.
- Notes: `top_customers` only counts bills with a `customer_id` (CREDIT bills / chosen customer) — walk-in CASH/UPI bills aren't attributed, by design. Device screenshots: Android emulator running in mock mode; iOS is the owner's physical device (no access here).
- Open items / next: on-device visual pass of the 4 cards on iPhone + Android.

## [2026-06-12] — Claude Code (Sonnet 4.6) — Fix 1/2/3: CTA gradient dark line, professional invoice PDF, correct % change chips

- What changed:
  - **Fix 1 — CTA gradient dark line (ALL screens):** Root cause was `colors={['transparent', pageBg]}` in `PinnedCTA.tsx`. `'transparent'` resolves to `rgba(0,0,0,0)` in React Native, causing the LinearGradient to interpolate through near-black tones before landing on the pastel page background. The previous "fix" (elevation: 0 on ctaShadow) targeted the wrong component — this is a gradient compositing issue, not an elevation shadow. Fix: added `hexToTransparent(pageBg)` helper in `PinnedCTA.tsx` to derive `rgba(r,g,b,0)` from the page hex, so the gradient interpolates in the same color space. Single-file change; covers all 5 tabs + onboarding screens.
  - **Fix 3 — Correct % change chips:**
    - Backend: `analytics.py` adds `_prev_window()` to compute the immediately-prior same-length window (yesterday / prev-7-days / prev-calendar-month); single-query extension adds `prev_sales` and `prev_net_pnl` sub-selects with `$3/$4` bound params. `home.py` adds `yesterday_sales` sub-select. Both `AnalyticsRead` and `SummaryRead` schemas gain the new fields.
    - Frontend: `types.ts` gains `prevNetPnl`/`prevSales` on `AnalyticsPeriod` and `yesterdaySales` on `Summary`. `api.ts` maps them. `format.ts` gains `periodDelta(current, prev)` → `{label, up}|null` (handles prev=0 → "New", rounds to nearest integer %). `analytics.tsx` replaces hardcoded `▲ 8.4%` badge with live `periodDelta(data.netPnl, data.prevNetPnl)`. `index.tsx` replaces hardcoded `▲ 12%` with `periodDelta(sum.todaysSales, sum.yesterdaySales)`. `SummaryCard` gains `deltaDown` prop so the chip goes red for declines. Mock data updated with plausible prev-period values.
  - **Fix 2 — Professional invoice PDF:**
    - `invoiceShare.ts` completely rewritten. HTML is now A4/print-ready with Plus Jakarta Sans (Google Fonts `@import`), plum `#2D1150` accents, structured layout: header (shop + GSTIN + mobile | doc title + ORIGINAL tag + PAID/UNPAID badge), meta band (Invoice No / Date / Due Date), Bill To block, items table (ITEMS/QTY/RATE/AMOUNT; for GST: +HSN/GST slab/Tax columns), totals block (Subtotal → Discount → tax rows → boxed area with Total/Received/Balance Due), amount in words (Indian lakh system, pure TS), tax summary table by rate (GST only), Terms & Conditions, footer. QR completely removed from the bill document — only the PAID/UNPAID badge remains. `ShareOpts` simplified (removes `upiUri`/`qrPngBase64`/`upiId`; the scan-to-pay QR stays in the post-confirm UPI overlay only). `BillResult.items` type extended with optional `hsnCode`/`taxRateBps`/`taxable`/`taxPaise` for per-item HSN and tax display. `CreateBillOverlay` and `InvoiceSummaryOverlay` callers updated to drop removed `ShareOpts` fields.
- Verified: `tsc --noEmit` clean (0 errors). Device verification (4 sample PDFs, screenshots on 3+ tabs) is owner's to confirm via Expo Go — environment has no physical device access.
- Open items / next: physical-device Expo Go pass to visually confirm: (a) no dark line above any CTA button, (b) PDF opens with correct GST/non-GST layout and PAID/UNPAID badge, (c) delta chips show correct computed % not hardcoded values.

## [2026-06-12] — Claude Code (Opus 4.8) — Device-test fixes: billing/QR/PDF/WhatsApp, khata, staff salary, analytics export, new-user states
- What changed (grouped by the device-test list A–F):
  - **F1 — black CTA shadow**: `ctaShadow` now uses `elevation: 0`. Android renders elevation shadows in opaque black (it ignores `shadowColor`), which was the dark halo under the pinned button on every screen; iOS keeps the brand-tinted glow via `shadowColor`. Design tokens otherwise reused everywhere (F2).
  - **A1/A2 — scan-to-pay**: review-step QR shows **only for UPI** bills and is tappable → full-screen `ScanPayOverlay` with a large QR that reflects the selected payment method and updates live as the method changes. QR is rendered client-side (`react-native-qrcode-svg`) from a dynamic exact-amount `upi://pay?pa&pn&am&cu=INR` link (`lib/upi.ts`, with VPA validation), so it works in mock mode too; an uploaded `qr_image_url` is shown as-is. Profile → Payments can attach a QR image per method (`expo-image-picker` → data URI; `PATCH /payment-methods/{id}`).
  - **A3 — PDF + green-press bug**: invoice PDF is generated **on-device** via `expo-print` (`lib/invoiceShare.ts`), so it works in both mock and real mode and matches the on-screen invoice (GST split vs simple, GSTIN, line items, discount, totals, UPI QR). The QR/buttons use scale-only press feedback — nothing changes colour on tap.
  - **A4 — WhatsApp**: professional message (shop, invoice no, item lines, grand total, PAID/UNPAID from `payment_mode`, optional hosted PDF link). PDF button opens the native share sheet (attaches the real file). New `POST /bills/{id}/share-link` renders + uploads the PDF to Supabase Storage (service-role, **optional**) and persists `bills.pdf_url`; returns `{url:null}` when storage isn't configured, and the app falls back to the share-sheet attachment. New `SUPABASE_SERVICE_ROLE_KEY` / `INVOICE_BUCKET` settings (documented in `.env.example`, never committed).
  - **A5 — tap transaction → invoice**: activity rows now carry `bill_id` (bills + khata entries whose `bill_id` is set); tapping a row in the home feed, full activity list, or a customer's activity page opens a read-only `InvoiceSummaryOverlay` reusing `InvoiceCard`. `GET /bills/{id}` already served.
  - **A6 — home search**: a search icon next to the profile avatar opens `SearchOverlay` (debounced `GET /customers/search`); tapping a result opens `CustomerActivityOverlay` (full per-customer history) via new `GET /customers/{id}/activity`.
  - **A7 — discount**: bill-level discount (flat ₹ or % of subtotal) in Create Bill, wired to `discount_paise`. Running total, taxable, GST and grand total recalc per `billing_rules.md` §3 (pre-tax, largest-remainder allocation). `lib/gstPreview.ts` mirrors the server engine; discount shows on invoice + PDF. (`confirm_bill` already supported `discount_paise`.)
  - **E1 — partial settlement**: Settle Up opens a sheet pre-filled with the full outstanding (25/50/Full quick-fills); records any amount ≤ outstanding. (`/khata/{id}/settle` already accepted `amount_paise` and enforces the bound — frontend now passes it.)
  - **B1 — salary + pay cycle**: staff detail shows Monthly salary, Advance outstanding, and **Remaining to pay** (= salary − advance). New `POST /staff/{id}/pay-salary` records a dated `salary_payment` ledger entry of the remaining amount and clears the advance (adjusted against salary), so the next month starts fresh; detail returns `remaining_salary_paise` + `salary_paid_this_month`. **Migration `002_staff_salary.sql`** adds the `salary_payment` `staff_ledger` type (schema.sql snapshot updated; test harness now applies all migrations in order).
  - **B2 — staff in activity**: the home `/activity` feed UNIONs `staff_ledger` advance + salary_payment rows (new `advance`/`salary` activity kinds with their own tiles/icons).
  - **B3 — advance sheet**: the Record-advance footer is restyled to the standard sheet layout — full-width amount field above a secondary Cancel + primary Save advance row.
  - **B4 — attendance ranges**: a Last 2 weeks / Last month segmented toggle; `GET /staff/{id}?days=` returns that window with a present count.
  - **C1 — analytics export**: "Export for CA" → "Export" with a PDF/PNG chooser. PDF via `expo-print`; PNG drawn to a `<canvas>` in an off-screen `react-native-webview` and read back as a real image (works in Expo Go — no native view-shot). Both open the share sheet; no fake toast.
  - **D1 — new-user states**: Billing, Khata, Stock always render their structural cards (hero + mini stats / total-outstanding) with zeroed values, and show the friendly empty state only for the list section. Analytics already renders KPIs at zero; Staff keeps its header + list empty state.
- Verified: `tsc --noEmit` clean; `expo-doctor` 18/18; backend `pytest` **27 passed** (23 existing + 4 new: discount pre-tax, discount-exceeds rejected, partial settle incl. over-settle 422, salary pay-cycle) against real Postgres; HTTP smoke on the seeded local DB confirmed discount math (10000−2000 → taxable/grand 8000), per-customer activity, get-bill, share-link null-degrade, partial settle (exact, over-settle 422), pay-salary (16,000 → advance cleared → fresh 18,000, paid_this_month true), 31/14-day attendance windows, and advance/salary rows in the feed.
- New deps (pinned to SDK 54 bundled versions): `react-native-qrcode-svg@6.3.21`, `expo-print@~15.0.8`, `expo-image-picker@~17.0.11`, `react-native-webview@13.15.0`.
- Deviations / notes:
  - **Could not run on a physical device** in this environment — Expo Go verification of camera-scannable QR, PDF open, WhatsApp send, contacts/share sheets is the owner's to confirm (checklist provided). Everything else is verified via tsc/pytest/HTTP smoke.
  - Hosted WhatsApp PDF link needs a **public Supabase Storage bucket** (`invoices`) + `SUPABASE_SERVICE_ROLE_KEY`; until then the message carries no link and the PDF attaches via the native share sheet.
  - Uploaded payment-method QR images are stored as data URIs (simple, works without storage); fine for beta, can move to Storage later.
  - Single overlay slot is unchanged: opening Settle/ScanPay from a detail overlay replaces it (no stacking) — acceptable for MVP.
- Open items / next: physical-device Expo Go pass; configure Supabase Storage for hosted invoice links; (later) move QR-image uploads to Storage.

## [2026-06-11] — Antigravity (Gemini 3.5 Flash) — Mobile UX Polish, SafeArea & Mock Toggle
- What changed:
  - **Mock Switch**: Added `EXPO_PUBLIC_USE_MOCK_DATA=true` in `.env` and conditional `mockApi` branch in `src/lib/api.ts` with in-memory state mutations (add credit, settle, add inventory, add staff, confirm bills) for standalone frontend runs.
  - **Keyboard Avoidance**: Wrapped onboarding frames (`ObFrame`), drawers (`BottomSheet`), overlays (`OverlayShell`), and settings (`profile.tsx`) in conditionally tuned `KeyboardAvoidingView` widgets (padding on iOS, height on Android) and set form ScrollViews to persist taps (`keyboardShouldPersistTaps="handled"`).
  - **Performance Optimization**: Replaced array loops with native non-scrolling `FlatList` components on the Billing home (`index.tsx`) and Analytics (`analytics.tsx`) screens. Wrapped transitions/fetches in `InteractionManager.runAfterInteractions` (`useApi.ts`).
  - **Layout Safe Areas**: Replaced root wrappers with `SafeAreaView` from `react-native-safe-area-context` on all main screens (index, analytics, khata, stock, staff, profile).
  - **Touch Ripples**: Passed `android_ripple` configs to primary buttons and navigation tabs.
- Why: UX Hardening to eliminate layout flickering, stutters, cutoff content, and ensure quick response.
- Open items / next: physical device testing (Expo Go) and host backend deployment.


## [2026-06-11] — Claude Code (Fable 5) — Backend + full wiring complete
- What shipped:
  - **database/**: `migrations/001_init.sql` (12 tables per spec §5 — users, businesses, payment_methods, customers, inventory_items, staff, bills, bill_items, khata_entries, payments, stock_ledger, staff_ledger, attendance; BIGINT paise, business_id denormalized onto child tables, indexes on business_id + (business_id, created_at), RLS policies FORCE'd via `app.business_id` GUC with `app.rls_bypass` for maintenance), `schema.sql` snapshot, `seed.sql` (claro-data.js mirror; ledger sums == cached balances by construction).
  - **Supabase**: project `claro` (`dmcuwrtjtnigktqxccln`, ap-south-1, free tier) created via MCP; migration + seed applied and audit-verified (0 balance/advance mismatches). URL + anon key wired into the app env.
  - **services/api/** (FastAPI + Pydantic v2 + asyncpg, no ORM — hand-tuned SQL, one round trip per action): config/db (pool + `biz_txn` setting the RLS GUC per transaction), auth (Supabase JWT via JWKS or HS256 + `dev:<phone>` bypass behind AUTH_DEV_BYPASS), errors (typed 4xx per billing_rules §8), GST engine (`services/gst.py`: per-item slabs, inclusive back-calc `round_half_even(gross*10000/(10000+bps))`, exclusive add-on, intra CGST/SGST split w/ odd paise → CGST, inter IGST, largest-remainder discount allocation pre-tax), `confirm_bill` (idempotent on (business_id, request_id), FOR UPDATE preconditions, guarded stock UPDATE, khata XOR payment, staff attribution — billing_rules §4 verbatim), reportlab PDF (GST template: GSTIN/HSN/tax-summary-by-rate; simple otherwise), UPI deeplink + QR (qrcode→base64 PNG).
  - **Endpoints**: /business (GET/POST/PATCH), /payment-methods CRUD + set-default, /summary/today (single aggregate query), /activity (bills ∪ khata UNION), /inventory CRUD + /stats, /bills (POST confirm, GET, /pdf, /upi), /khata (list/detail/credit/settle/reminder w/ wa.me), /staff CRUD + attendance/advance/repayment + detail (FIFO repaid status), /analytics (+ /best-selling, /export CSV), /customers/search. IST day/month windows for all period math.
  - **Tests**: 23/23 green (pytest) — billing_rules §9 matrix incl. oversell rollback, idempotent replay, concurrent last-unit race, ledger==balance audit; GST intra/inter, inclusive/exclusive, per-bill non_gst on a GST shop, discount allocation. Runs against a real Postgres (portable zonky PG16 on :5544; `scripts/dev_db.py` seeds local dev DB).
  - **apps/mobile wiring** (design untouched): `lib/api.ts` → typed HTTP client (paise→rupees at the edge, so screens kept their shapes); `lib/http.ts` (base URL auto-derived from Metro host), `lib/supabase.ts` (phone OTP; dev mode = any 6-digit code → `dev:` token), `lib/useApi.ts` (loading/error/reload + store refreshKey re-fetch after mutations), `lib/gstPreview.ts` (client mirror of the engine so the review screen previews exact totals pre-confirm), `lib/states.ts` (GST state codes), `lib/contacts.ts` + ContactSuggest molecule (expo-contacts autocomplete in Create Bill / Add Credit / Add Staff). All five tabs + overlays live: settle/remind (wa.me via reminder endpoint), attendance toggle (optimistic + revert), advances/repayments, add sheets POST, analytics + CSV export via expo-sharing.
  - **New UI per spec §9**: `/profile` screen (business incl. 14-industry list + state picker + GST toggles + invoice prefix, payment methods w/ default star + delete, account, preferences, logout); Create Bill GST/Non-GST segmented toggle + place-of-supply select (GST shops), "Receive payment in" selector at review (default preselected, saved on bill), real QR + PDF + WhatsApp share post-confirm (PDF/WA auto-confirm first — idempotent request_id makes it safe).
- Verified end-to-end (API on :8000, dev auth): GST intra bill ₹500 MRP → CGST 1191/SGST 1190 (odd paise→CGST), stock 6→4, valid `%PDF-1.4`, upi:// deeplink + QR; CREDIT bill raised outstanding by exactly the grand total; settle lowered it; reminder returns wa.me/9198… URL; non-GST bill on the GST shop → tax 0; analytics + CSV export OK. `tsc --noEmit` clean; `expo-doctor` 18/18; Android Hermes bundle exports clean.
- Deviations / notes:
  - Supabase phone OTP needs an SMS provider configured in the dashboard before real OTP works; until then `EXPO_PUBLIC_DEV_AUTH=true` + API `AUTH_DEV_BYPASS=true` lets any 6-digit code log in as the seeded dev user. Flip both to go live.
  - The API needs `DATABASE_URL` pointing at the Supabase Postgres (Dashboard → Settings → Database; password not retrievable via MCP) — local dev runs against the portable PG cluster.
  - Sessions are in-memory (project rule: no storage APIs) — cold start re-runs login; acceptable for beta.
  - "Pay Salary" maps to ledger reality: clears outstanding advance as a repayment ("adjusted against salary"); salary payments themselves aren't a §5 entity.
  - P&L = revenue − known COGS (inventory lines); ad-hoc lines count at full value (no recorded cost).
- Open items / next: physical-device run (Expo Go) of contacts + wa.me + share sheets; configure Supabase SMS provider; reset Supabase DB password into services/api/.env for hosted runs; post-MVP void/return flow (billing_rules §7).

## [2026-06-11] — Claude Code (Fable 5) — Backend phase started
- What changed: Began Prompt_B_Backend. Building database/ (SQL migrations, schema, seed), services/api (FastAPI + asyncpg, GST engine, confirm_bill per billing_rules.md), then rewiring apps/mobile/src/lib/api.ts to HTTP + Supabase OTP auth + new Profile/payment-methods/contacts/WhatsApp UI.
- Why: Frontend (mock) is complete; backend phase explicitly requested.
- Key stack decisions: asyncpg + hand-tuned SQL (no ORM) for one-round-trip hot paths; money = INTEGER PAISE end-to-end (api.ts converts to rupees at display edge so screens stay unchanged); RLS as defense-in-depth via `app.business_id` GUC; PDFs/QRs generated on demand (no object storage).
- Open items / next: schema → auth → bills+GST → domain endpoints → tests → app wiring.

## [2026-06-11] — Claude Code (Sonnet 4.6) — UI fixes: nav shadow, splash theme lock, SDK 54
- What changed:
  - Upgraded Expo SDK 52 → **54** (RN 0.81.5, React 19.1, Reanimated 4.1.1) to match the installed Expo Go on the test device. tsc clean, expo-doctor 18/18.
  - Removed the black drop shadow under the pinned CTA on every page: it was `Shadows.nav` (#0F1222) on `BottomNav` projecting upward toward the button — not the button's own shadow. Dropped `Shadows.nav`; the top border (navBorder) keeps nav separation. The button keeps its brand-tinted `ctaShadow` (the "pastel" glow).
  - Splash (`app/onboarding/index.tsx`): removed the "Choose your theme" swatch picker. Theme is locked to the default first palette (Plum) via `store.brandColor: 'Plum'`.
  - Staff detail overlay: added a footer with Record Advance (outline) + Pay Salary (primary) — mock toasts, no persistence.
- Why: design feedback (flat dark aesthetic, single brand), device compatibility.
- Open items / next: same as below (backend phase unstarted).

## [2026-06-11] — Claude Code (Fable 5) — Frontend complete (mock data)
- What changed: Full Expo frontend built in `apps/mobile` (Expo SDK 56, TypeScript strict, Expo Router, Zustand, Reanimated 4, react-native-svg, Plus Jakarta Sans). `npx tsc --noEmit` clean, `expo-doctor` 21/21, Metro bundles clean for web (1501 modules) and Android (2027 modules).
- Routes created:
  - `app/_layout.tsx` (fonts, gesture root, OverlayHost + Toast hosts, status bar)
  - `app/index.tsx` (phase gate → onboarding | tabs)
  - `app/onboarding/`: `_layout`, `index` (splash + theme swatches), `mobile`, `otp`, `profile`, `gst`, `success`
  - `app/(tabs)/`: `_layout` (animated 300ms page bg + custom 78px BottomNav), `index` (Billing), `khata`, `stock`, `staff`, `analytics`
- Foundations: `src/theme/{tokens,typography,spacing,pageThemes}.ts` (+`usePageTheme`), `src/lib/{format,icons,api}.ts`, `src/data/{types,mockData}.ts` (1:1 port of claro-data.js), `src/state/store.ts` (AppState verbatim from handoff + actions, `useBrand`).
- Components:
  - atoms: Icon(Sym), WhatsAppIcon (svg, #25D366), Tap (scale .97/150ms), Card, Money, IconTile, Avatar, Badge, Button (Primary/Outline/HeaderIcon), Input, Select (sheet-based <select> replacement), Stepper, SegmentedControl, ProgressBar
  - molecules: SummaryCard, StatTile, ActivityRow, KhataRow, InventoryRow, StaffRow, KpiTile, EmptyState
  - organisms: PhoneStatusBar, BottomNav, PinnedCTA, Toast (2200ms), BottomSheet (280–300ms cubic-bezier(.32,.72,0,1)), OverlayShell, OverlayHost, Sparkline, InvoiceCard (GST split vs simple + QR placeholder), CreateBillOverlay (build/review), ActivityOverlay, CustomerDetailOverlay (running balance), StaffDetailOverlay (perf/attendance/advances), AddSheets (credit/inventory/staff), DemoToggle, ObFrame
- Key decisions:
  - Overlays are store-driven (single `overlay` slot per the handoff AppState), not router modals; `app/modals/` left empty.
  - Sheets use a Reanimated slide-up modal (handoff timings) instead of @gorhom/bottom-sheet — fewer deps, same spec.
  - Invoice CGST/SGST (9%+9%) is display-only, mirroring the prototype; real billing math stays backend (billing_rules.md).
  - emptyMode toggle on Khata/Stock/Staff headers (prototype parity: 'Filled'/'Empty' + dataset/inbox icons); flag is global and also empties the Billing feed.
  - Real OS status bar used instead of the prototype's fake "9:41" bar (PhoneStatusBar just sets style).
- Material-Symbol → @expo/vector-icons (MaterialIcons) substitutions: `monitoring` → `bar-chart` (no equivalent); Symbols FILL axis not reproducible in static MaterialIcons — active nav state signalled by color (accent vs navIdle). All other glyphs mapped 1:1 (snake_case → kebab-case) in `src/lib/icons.ts`. WhatsApp = inline simple-icons SVG path.
- Open items / next: verify on a physical Android phone via Expo Go, commit frontend, then backend phase (FastAPI against billing_rules.md, swap `src/lib/api.ts`).

## [2026-06-11] — Claude Code (Fable 5) — Frontend scaffolding started
- What changed: Began Prompt_A_Frontend build. Creating `apps/mobile` (Expo + TS + Expo Router), tokens/utils/data layers first, then components and screens per docs/design/design-handoff.md.
- Why: Frontend-only phase; mock data via src/lib/api.ts seam.
- Open items / next: full screen build, expo-doctor pass, final DECISIONS entry with route/component inventory.

## [SEED] — orchestration — project scaffolded
- What changed: Created Project Claro repo. Architecture fixed: Expo/RN frontend → src/lib/api.ts → FastAPI → Supabase. Folder skeleton, docs (PRD, billing_rules, design handoff), and build prompts in place.
- Why: Multi-agent, token-limited build; a fixed contract lets any agent/model continue blindly.
- Phase: FRONTEND ONLY (mock data). Backend NOT started by design.
- Open items / next:
  - [ ] Run docs/build/Prompt_A_Frontend.md in Claude Code → build full Expo frontend (mock data).
  - [ ] Verify `npx expo start` runs clean in Expo Go + Android emulator.
  - [ ] Commit frontend.
  - [ ] (Later) Specify + build backend against docs/billing_rules.md.
  - [ ] Handoff to Antigravity via docs/build/Antigravity_Resume.md if Claude limits hit.
