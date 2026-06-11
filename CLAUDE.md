# CLAUDE.md — Project Claro

> Read this fully before doing anything. It is the operating manual for every agent (Claude Code now, Antigravity later). Product spec: `docs/PRD.md`. Visual spec: `docs/design/design-handoff.md`. Backend contract: `docs/billing_rules.md`. Running log: `docs/DECISIONS.md` — read it first, append to it after every change.

## What Claro is
A premium mobile app for Indian MSMEs (kirana stores, boutiques, pharmacies). Five areas: **Billing/Invoicing, Khata (credit ledger), Inventory, Staff, Analytics**. Users are shopkeepers aged 30–50, low digital literacy. It must feel like a calm, high-trust fintech flagship (Navi-style). The design in `docs/design/` is final and high-fidelity — reproduce it exactly; never invent UI.

## Current phase
**FRONTEND ONLY (mock data).** Do NOT build the backend until explicitly told. `apps/mobile/src/lib/api.ts` returns mock data for now and is the single seam the backend will later replace.

## Architecture (non-negotiable contract)
```
apps/mobile (Expo + React Native + TypeScript + Expo Router)
        │  calls ONLY
        ▼
apps/mobile/src/lib/api.ts   (single API seam)
        │  (later) HTTP to
        ▼
services/api (FastAPI)        ← owns ALL business logic
        │  ONLY layer that touches
        ▼
database (Supabase / Postgres)
```
Never skip a layer. Screens never call the network directly; only `lib/api.ts` does; only FastAPI touches the DB.

## Tech stack
- **Mobile:** Expo (latest) + React Native + TypeScript, Expo Router (file-based). Fonts via `@expo-google-fonts/plus-jakarta-sans`. Icons via `@expo/vector-icons` (map Material Symbols names). WhatsApp logo via `react-native-svg`. Sheets/animation via `react-native-reanimated` + `@gorhom/bottom-sheet`. State via Zustand (or Context). No browser storage APIs.
- **Backend (later):** FastAPI, SQLAlchemy/Supabase, Pydantic v2. Thin routers, fat services. Builds against `docs/billing_rules.md`.
- **DB (later):** Supabase Postgres; migrations in `database/`.

## Repo layout
- `apps/mobile/app/` — routes: `onboarding/`, `(tabs)/`, `modals/`.
- `apps/mobile/src/` — `components/{atoms,molecules,organisms}`, `theme/`, `lib/`, `data/`, `state/`.
- `services/api/` — FastAPI (empty until backend phase).
- `database/` — Supabase migrations + schema (empty until backend phase).
- `docs/` — PRD, billing_rules, design/, DECISIONS, build/ (prompts).

## Design system (from docs/design/design-handoff.md — authoritative)
- Brand `#2D1150` (plum), brandPress `#1C0A35`, brandTint `#ECE6F4`.
- **Per-page pastel themes** (bg/accent/tile/navIdle): Billing lavender, Khata rose, Stock cream/amber, Staff mint, Analytics pale blue. Use a `usePageTheme(tab)` hook.
- Font **Plus Jakarta Sans**; money is always the largest element with tabular numerals.
- Indian lakh number formatting: `formatINR` (₹1,42,300) + `formatINRShort` (₹1.42L / ₹24.9k / ₹2.86Cr).
- Keep mock data in `src/data/mockData.ts`, ported 1:1 from `docs/design/claro-data.js`.

## Core domain rules (matter in the backend phase — see billing_rules.md)
1. Confirming a bill atomically decrements inventory (never below 0).
2. Credit-mode bill creates a Khata credit entry + raises customer outstanding balance.
3. Settle Up creates a payment entry + lowers balance.
4. Staff-attributed bills append a staff-ledger sale entry (feeds PNL).
5. Business `gstRegistered` flag drives the invoice template (CGST/SGST split vs simple) everywhere.

## Conventions
- TypeScript everywhere; reuse `src/theme` tokens and `src/lib/format.ts` — never duplicate.
- Each screen ships a populated state AND its empty/no-match state.
- Money stored/handled as integers; format only at the display edge.
- Commit after each completed prompt with a clear message; keep diffs scoped.

## Commands
```bash
cd apps/mobile && npm install
npx expo start            # Expo Go (phone) or 'a' for Android emulator
npx expo-doctor           # sanity-check the project
```

## Token / workflow discipline
- Work inside the narrowest folder the task needs.
- Don't re-explain context to the user — record it in `docs/DECISIONS.md`.
- Keep responses terse: show file tree + diffs, not essays.

## Do NOT
- Do not let screens call the network directly.
- Do not redesign the UI or deviate from `docs/design/`.
- Do not build the backend during the frontend phase.
- Do not change the data model/architecture without logging it in `docs/DECISIONS.md`.
- Do not commit secrets; use `.env` (templates in `.env.example`).
