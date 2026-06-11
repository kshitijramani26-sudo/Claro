# DECISIONS.md — Project Claro build log

> Append-only. Every agent reads this before working and adds an entry after working. Newest at top. This is the shared memory that survives across model/agent handoffs (Claude Code → Antigravity).

Format:
```
## [DATE] — [agent/model] — [short title]
- What changed:
- Why:
- Open items / next:
```

---

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
