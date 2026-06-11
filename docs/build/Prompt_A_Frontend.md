# Prompt A — Full Frontend (Expo / React Native)

**Run in:** Claude Code, inside `Project Claro/`. **Model:** your choice (frontend translation is mechanical — a fast model is fine; save the heavy model for the backend phase).

**Before you paste:** confirm `docs/design/design-handoff.md`, `docs/design/Claro.dc.html`, and `docs/design/claro-data.js` exist.

---

## ▼▼▼ COPY EVERYTHING BELOW INTO CLAUDE CODE ▼▼▼

You are the frontend engineer for **Claro**, an Indian MSME mobile app. Build the **complete frontend only** — no backend, no network calls, mock data only. Work inside `apps/mobile/`.

**STEP 0 — Read the spec first (do not skip).**
Read fully before writing code: `docs/design/design-handoff.md` (authoritative design spec — reproduce EXACTLY), `docs/design/claro-data.js` (port 1:1 to TS), `docs/design/Claro.dc.html` (pixel reference), `docs/PRD.md` (features), `CLAUDE.md` (rules). Then append "Frontend scaffolding started" to `docs/DECISIONS.md`.

**STACK (exact):** Expo (latest) + React Native + TypeScript + Expo Router. Fonts `@expo-google-fonts/plus-jakarta-sans` (400/500/600/700/800), tabular numerals on money. Icons `@expo/vector-icons` — map Material Symbols names in `src/lib/icons.ts` (`point_of_sale`,`account_balance_wallet`,`inventory_2`,`groups`,`monitoring`,`receipt_long`,`qr_code_2`,`trending_up`,`check_circle`,`verified`,`storefront`,`search`,`add`,`add_circle`,`edit_note`,`paid`,`category`,`warning`,`north_east`,`south_west`,`ios_share`,`chevron_right`,`arrow_forward`). WhatsApp = green `#25D366` SVG via `react-native-svg`. Sheets/animation: `react-native-reanimated` + `react-native-gesture-handler` + `@gorhom/bottom-sheet`; honor handoff timings. State: **Zustand** implementing the handoff `AppState` interface verbatim. NO browser storage APIs. QR = placeholder (`qr_code_2` glyph in a framed box), not a real UPI string yet.

**BUILD ORDER (foundations first):**
1. **Tokens** — `src/theme/tokens.ts` (brand `#2D1150`, brandPress `#1C0A35`, brandTint `#ECE6F4`, semantic, border/divider/canvas, radii, shadows), `typography.ts` (full text-style table), `spacing.ts`, `pageThemes.ts` with per-tab `{bg,accent,tile,navIdle}`: billing `#F3F1FC/#6D28D9/#ECE7FE/#B0A0DC`, khata `#FDF1F2/#E11D48/#FFE2E7/#E79BAB`, stock `#FBF6EA/#C2700A/#FBEBC8/#D6B074`, staff `#EBF8F1/#059669/#CFF6E2/#84C7AC`, analytics `#EDF2FD/#2563EB/#D9E7FE/#96B7EF`. Add `usePageTheme(tab)`; background animates 300ms on tab switch.
2. **Utils** — `src/lib/format.ts`: `formatINR` (₹1,42,300) + `formatINRShort` (₹1.42L/₹24.9k/₹2.86Cr) exactly from the handoff.
3. **Data** — `src/data/types.ts` + `src/data/mockData.ts` ported 1:1 from `claro-data.js`. Screens read via `src/lib/api.ts`, which returns mock data for now (the seam the backend later replaces).
4. **Atoms → molecules → organisms** per the folder skeleton.
5. **App shell** — root `_layout.tsx` (fonts, providers, gesture root, overlay/modal host, onboarding-vs-tabs gate); `(tabs)/_layout.tsx` = persistent bottom nav (78px, 5 items, active accent FILL, inactive `navIdle`, hidden when a modal is open) + pinned-CTA region.

**SCREENS (match the handoff section-by-section):** Onboarding (splash w/ theme swatches → mobile → otp → profile → gst → success); Tab 1 Billing (hero + 3 mini stats + recent activity + Create Bill build/review w/ GST split + UPI QR placeholder + PDF/WhatsApp + Confirm→toast) + empty state; Activity overlay; Tab 2 Khata (outstanding card + search + rows w/ Settle Up + WhatsApp + empty/no-match) + customer detail; Tab 3 Stock (hero + stats + rows w/ low-stock badge + Add Inventory); Tab 4 Staff (cards w/ Present/Absent optimistic toggle + Add Staff) + staff detail (perf, 14-day grid, advances); Tab 5 Analytics (period selector + Net P&L hero + SVG sparkline + 4 KPI tiles + best-selling + Export toast); 3 Add bottom sheets; global toast (2200ms).

**QUALITY BAR:** reproduce tokens exactly; money is the largest element; tabular numerals everywhere; every list ships populated AND empty/no-match states; keep the `emptyMode` demo toggle where specified. Must run in **Expo Go (physical Android)** and the **Android Studio emulator**. Run `npx expo-doctor` and fix issues; `npx expo start` must boot with no red-screen errors. Do NOT implement real billing math, GST calc, PDF, UPI, or persistence — `src/lib/api.ts` returns mock data only.

When done: append to `docs/DECISIONS.md` every route/component created + any icon substitutions, and print the run commands. Keep chat output terse — file tree + key diffs, not essays. **Then STOP — do not start the backend.**

## ▲▲▲ END OF PROMPT A ▲▲▲

> After it completes: run on your phone via Expo Go, `git add -A && git commit -m "feat: full frontend scaffolding"`, then return to spec the backend.
