# apps/mobile — Claro (Expo / React Native)

This app is **scaffolded by Prompt A** (`docs/build/Prompt_A_Frontend.md`). When you run Prompt A in Claude Code, it initializes the Expo project here and fills these folders:

```
app/
  _layout.tsx              # root: fonts, providers, overlay host, onboarding-vs-tabs gate
  index.tsx                # entry redirect
  onboarding/              # splash, mobile, otp, profile, gst, success
  (tabs)/                  # _layout (bottom nav) + billing, khata, stock, staff, analytics
  modals/                  # create-bill, review-bill, activity, customer-detail, staff-detail,
                           #   add-credit, add-inventory, add-staff
src/
  components/{atoms,molecules,organisms}
  theme/                   # tokens, typography, spacing, pageThemes, usePageTheme
  lib/                     # format.ts, icons.ts, api.ts (mock-data seam)
  data/                    # types.ts, mockData.ts (ported from docs/design/claro-data.js)
  state/                   # store.ts (Zustand, mirrors handoff AppState)
assets/
```

## Run
```bash
npm install
npx expo start    # Expo Go (scan QR) or press 'a' for Android emulator
```

Design source of truth: `../../docs/design/design-handoff.md`. Do not deviate from it.
