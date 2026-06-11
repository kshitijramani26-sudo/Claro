# Antigravity — Resume Protocol

Use if you hit your Claude usage limit mid-build and switch to Google Antigravity IDE.

## Step 1 — Open the folder
Antigravity: **Open Folder → select `Project Claro/`** (the repo root, not a subfolder).

## Step 2 — Paste this into the Antigravity agent
```
You are resuming an in-progress build of "Claro", an Indian MSME mobile app. A previous agent did part of the work. Do NOT start over and do NOT redesign anything.

READ FIRST, in this order:
1. docs/DECISIONS.md — the running log; the last entries tell you where the previous agent stopped. This is your handoff state.
2. docs/design/design-handoff.md — authoritative design spec; reproduce exactly, never invent UI.
3. docs/PRD.md — product requirements.
4. docs/billing_rules.md — non-negotiable backend transaction contract (only for the backend phase).
5. Skim apps/mobile/ to see what already exists.

ARCHITECTURE CONTRACT (do not violate):
- Frontend (apps/mobile, Expo + React Native + TypeScript + Expo Router) calls ONLY src/lib/api.ts. That file is the single seam to the backend. The backend (services/api, FastAPI) owns all logic and is the ONLY layer that touches the database (Supabase). Never let a screen call the network directly.
- Reuse existing src/theme tokens and src/lib utilities; do not duplicate.

YOUR TASK:
Continue from the last unchecked item in docs/DECISIONS.md. We are in the FRONTEND phase (mock data only) — do NOT build the backend until explicitly told. Make `npx expo start` run cleanly in Expo Go and the Android emulator with no red-screen errors. Keep mock data in src/data/mockData.ts; src/lib/api.ts returns mock data for now.

RULES:
- After each meaningful change, append to docs/DECISIONS.md: what changed, why, what's next.
- Do not change the data model, architecture, or design without recording it in docs/DECISIONS.md.
- Keep responses terse: file tree + diffs, not essays.

Confirm you've read docs/DECISIONS.md and tell me the last completed step and the next step BEFORE writing code.
```

## Step 3 — Verify the handoff took
The agent's first reply should quote the last `DECISIONS.md` entry. If not, make it re-read `docs/DECISIONS.md` before proceeding.

> Before you risk the limit, make sure Claude Code committed (`git add -A && git commit`). Antigravity resumes far more reliably from a clean commit.
