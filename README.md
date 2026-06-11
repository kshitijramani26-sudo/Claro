# Project Claro

A premium mobile-first operating system for Indian MSMEs — billing, Khata (credit ledger), inventory, staff, and analytics.

- **Mobile app:** `apps/mobile/` — Expo + React Native + TypeScript (Expo Router).
- **Backend:** `services/api/` — FastAPI (built in a later phase).
- **Database:** `database/` — Supabase / Postgres migrations & schema.
- **Docs:** `docs/` — the source of truth: `PRD.md` (product), `billing_rules.md` (backend contract), `design/` (visual spec + handoff), `DECISIONS.md` (cross-agent build log), `build/` (the prompts to run).

## Build order
1. **Frontend first** — open this folder in Claude Code, read `CLAUDE.md`, then run `docs/build/Prompt_A_Frontend.md` (mock data only).
2. **Backend** — specified after the frontend is verified. Do NOT build it yet.

## Run the app (after Prompt A builds it)
```bash
cd apps/mobile
npm install
npx expo start    # scan QR with Expo Go, or press 'a' for the Android emulator
```

## Golden rule
Frontend talks ONLY to `apps/mobile/src/lib/api.ts` → which talks ONLY to the FastAPI backend → which is the ONLY layer that touches the database. Never skip a layer.
