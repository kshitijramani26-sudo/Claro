# Claro — Full Design Handoff

## Overview
Claro is a premium mobile-first app for Indian small-business owners (kirana stores, boutiques, pharmacies). It handles **Billing**, **Khata (credit ledger)**, **Inventory/Stock**, **Staff**, and **Analytics**. The target user is a shopkeeper aged 30–50 with low-to-moderate digital literacy. The design is intentionally calm, minimal, and high-trust — inspired by fintech flagships like Navi.

## About the Design Files
The files in this bundle (`Claro.dc.html`, `claro-data.js`) are **HTML design prototypes** — high-fidelity interactive mocks showing exact visual design and interactions. They are NOT production code. Your task is to **recreate these designs in your target codebase** (React Native) using its established patterns and libraries. Do not ship the HTML directly. Use it as a pixel-perfect visual reference.

## Fidelity
**High-fidelity.** Every color, size, radius, shadow, font weight, spacing value, and animation timing in this document is final and should be reproduced exactly. The mock data (in `claro-data.js`) is a reference for the data shape and content — replace with your real API.

---

## Design Tokens

### Colors

#### Brand (Global, consistent across all pages)
| Token | Value | Usage |
|-------|-------|-------|
| `brand` | `#2D1150` | Primary CTA buttons, brand avatar, splash gradient |
| `brandPress` | `#1C0A35` | Active/pressed state of brand buttons |
| `brandTint` | `#ECE6F4` | Brand-tinted backgrounds in onboarding |
| `brandGrad` | `linear-gradient(165deg, #4C2185 0%, #2D1150 55%, #190830 100%)` | Splash screen background |

#### Per-Page Pastel Themes (Navi-style)
Each tab has its own background + accent + tile + navIdle:

| Tab | `bg` | `accent` | `tile` | `navIdle` |
|-----|------|----------|--------|-----------|
| Billing | `#F3F1FC` | `#6D28D9` | `#ECE7FE` | `#B0A0DC` |
| Khata | `#FDF1F2` | `#E11D48` | `#FFE2E7` | `#E79BAB` |
| Stock | `#FBF6EA` | `#C2700A` | `#FBEBC8` | `#D6B074` |
| Staff | `#EBF8F1` | `#059669` | `#CFF6E2` | `#84C7AC` |
| Analytics | `#EDF2FD` | `#2563EB` | `#D9E7FE` | `#96B7EF` |

- `bg`: the screen's background color (replaces a flat gray)
- `accent`: used for active nav icon/label, page hero accents, focus rings, "View all" links, active segmented controls, icon tile icon color
- `tile`: pastel tinted bg for icon containers
- `navIdle`: color for *inactive* nav items on that page (so entire nav bar glows with the current page's hue)

#### Semantic Colors
| Token | Value | Usage |
|-------|-------|-------|
| `success` | `#16A34A` | Present badge, positive deltas, settled transactions |
| `danger` | `#E5484D` | Outstanding credit amounts, absent badge |
| `warning` | `#F59E0B` | Low-stock badge |
| `textPrimary` | `#0F1222` | All primary text, headings |
| `textSecondary` | `#6B7280` | Labels, subtitles, metadata |
| `textMuted` | `#9AA0AC` | Tertiary labels, icons in placeholder states |
| `border` | `#E7E9F2` | Input borders, dividers, card separators |
| `divider` | `#F2F3F7` | Light row separators inside cards |
| `navBorder` | `#EEF0F4` | Bottom nav top border |
| `canvas` | `#FFFFFF` | Card backgrounds, overlay headers, nav bar |

#### Metric-Specific Icon Tile Colors (semantic, not themed)
| Metric | Tile bg | Fg color |
|--------|---------|----------|
| Sales / payments | `#E8F7F0` | `#16A34A` |
| Bills / Billing | `#ECE7FE` | `#6D28D9` |
| Pending Khata | `#FDECF2` | `#E5484D` |
| Low Stock | `#FFF1E8` | `#F59E0B` |
| Month / Trending | `#E8F2FF` | `#2563EB` |
| Top Staff | `#ECE7FE` | `#6D28D9` |
| Total Sales (analytics) | `#D9E7FE` | `#2563EB` |
| Inventory Value | `#FFF1E8` | `#F59E0B` |
| Net P&L | `#E8F7F0` | `#16A34A` |

#### Activity / Transaction Row Tiles
| Kind | Tile bg | Fg |
|------|---------|-----|
| sale | `#E8F7F0` | `#16A34A` |
| credit | `#FDECF2` | `#E5484D` |
| settle | `#ECE7FE` | `#6D28D9` |

---

### Typography
**Font family:** `Plus Jakarta Sans` (Google Fonts), weights 400/500/600/700/800. Fallback: `Manrope, Inter, system-ui, sans-serif`.

**Financial / numeric figures:** Always use `font-variant-numeric: tabular-nums` + `font-feature-settings: 'tnum'` — this ensures columns of numbers align.

| Style | Size | Weight | Letter-spacing | Usage |
|-------|------|--------|----------------|-------|
| `hero-money` | 40–46px | 800 | -1.5px | Primary financial figures (Today's Sales, Net P&L, etc.) |
| `card-money` | 23–28px | 800 | -0.6px | Card-level amounts (Khata outstanding, invoice total) |
| `list-money` | 15–19px | 800 | -0.3px | Row amounts (Khata outstanding, activity amounts) |
| `screen-title` | 26px | 800 | -0.6px | Tab screen headings ("Khata", "Staff", etc.) |
| `section-title` | 16px | 800 | 0 | Section headings ("Recent activity", "Best-selling items") |
| `card-label` | 12–13.5px | 500–600 | 0 | Metric labels, secondary card labels |
| `body` | 14–15px | 500–600 | 0 | General body text, list items |
| `caption` | 11–12.5px | 500 | 0 | Row subtitles, timestamps, metadata |
| `badge` | 11–12px | 700 | 0 | Status badges (Low stock, Present, Absent) |

**Number formatting (Indian lakh system):**
- Full format: `₹1,42,300` (last 3 digits, then groups of 2)
- Compact: `₹1.42L` (lakhs), `₹2.86Cr` (crores), `₹24.9k` (thousands)
- Use full format for hero numbers; compact for mini stat tiles

---

### Spacing
| Value | Usage |
|-------|-------|
| 20px | Horizontal screen padding |
| 18–22px | Card internal padding |
| 12–14px | Gap between cards in a list |
| 11–13px | Gap in grid layouts |
| 8–10px | Icon → label gap in buttons/rows |
| 6–9px | Gap between grouped small elements |

---

### Border Radius
| Value | Usage |
|-------|-------|
| 16px | Hero cards (Today's Sales, Net P&L, Stock value) |
| 14px | Standard cards, list containers, modals/overlays |
| 11px | Buttons (primary, secondary), text inputs |
| 10px | Small buttons, custom-item form fields |
| 9px | Icon tiles, small chip buttons, QR container |
| 8px | Tiny chips (status, badges), stepper buttons |
| 99px | Pill shapes (resend timer, percentages) |
| 50% | Avatar circles |
| 20px top corners only | Bottom sheets |

---

### Shadows
| Token | Value | Usage |
|-------|-------|-------|
| `card` | `0 4px 16px rgba(15,18,34,0.06)` | All white cards |
| `cta-button` | `0 12px 26px -8px rgba(45,17,80,0.45)` (brand tinted) | Primary pinned CTA |
| `phone-frame` | `0 40px 90px -20px rgba(15,18,34,0.45)` | Outer device frame |
| `bottom-nav` | `0 -4px 20px rgba(15,18,34,0.04)` | Bottom nav lift |
| `avatar` | `0 6px 18px -4px rgba(45,17,80,0.5)` | Header avatar |

---

### Icons
**Library:** Google Material Symbols Rounded — variable font. (In React Native, map each glyph to the nearest `@expo/vector-icons` MaterialIcons/MaterialCommunityIcons name.)
**Load URL (web ref):** `https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200`
**Variation axes:** Unfilled `FILL 0, wght 400`; Filled `FILL 1, wght 500`.

**Navigation icons:**
| Tab | Inactive glyph | Active glyph (filled) |
|-----|---------------|----------------------|
| Billing | `point_of_sale` | `point_of_sale` (FILL 1) |
| Khata | `account_balance_wallet` | filled |
| Stock | `inventory_2` | filled |
| Staff | `groups` | filled |
| Analytics | `monitoring` | filled |

**WhatsApp integration buttons:** Use the official WhatsApp SVG path (not a Material icon). Green `#25D366`. See `Claro.dc.html` for the inline SVG path (simple-icons/whatsapp glyph).

---

### Motion / Animation
| Animation | Property | Duration | Easing |
|-----------|----------|----------|--------|
| Sheet open (overlays, bottom sheets) | `translateY(100% → 0)` | 280ms | `cubic-bezier(0.32, 0.72, 0, 1)` |
| Fade in (scrim, toast, GSTIN reveal) | `opacity 0 → 1` | 150–200ms | `ease` |
| Pop (success checkmark, splash wordmark) | `opacity 0, scale 0.9 → 1` | 500–600ms | `ease` |
| Progress bar fill | `width` | 250ms | `ease` |
| Page background switch | `background` | 300ms | `ease` |
| Tap feedback | `scale(0.97)` on press | 150ms | `ease` |

---

## Screens & Views

### 1. Splash Screen
Full-screen gradient (`brandGrad`). Centered column: wordmark + icon, "Choose your theme" swatch row, "Tap anywhere to begin" footer.
- **App icon:** 84×84px, radius 26px, `rgba(255,255,255,0.14)` bg, `1px solid rgba(255,255,255,0.22)` border, shadow `0 20px 50px -12px rgba(0,0,0,0.4)`. Material `storefront` at 46px white inside.
- **Wordmark:** "Claro", 46px / 800 / -1.5px / white. **Tagline:** "Your shop, beautifully in order", 15px / 500 / `rgba(255,255,255,0.72)`.
- **Swatch row:** label "CHOOSE YOUR THEME" 11px/700/uppercase/1.5px/`rgba(255,255,255,0.55)`. Four 30×30px circles. Active swatch: `box-shadow 0 0 0 2.5px rgba(255,255,255,0.95)`.
- **Brand options:** Plum `#2D1150` (default), Violet `#4C1D95`, Teal `#0B3D3A`, Wine `#4A1942`.
- **Tap:** tapping screen (not a swatch) advances to Mobile; tapping a swatch changes brand only.
- **Entry anim:** wordmark `claroPop` (600ms); footer `claroFade` (1s, 400ms delay); swatches `claroFade` (1s, 500ms delay).

### 2. Mobile Number Entry
`padding 30px 24px`. Top progress bar (Step 1 of 4).
- Heading "Enter your mobile number" 27px/800/-0.6px. Subtitle 15px/`#6B7280`/lh 1.5.
- Input row: `+91` prefix (56px, bold, white, `1.5px solid #E7E9F2`, radius 11px) + 10-digit numeric input (same height/radius, 18px, ls 1px). Border → `brand` at 10 digits.
- Pinned CTA "Continue" 54px/800/white/brand. Disabled: `#C7C9D9` bg.
- Progress bar: full-width 6px, `#E7E9F2`, radius 99px; fill = brand. Back button 38×38px white radius 9px card shadow. Label "Step N of 4" 13px/600.

### 3. OTP Verification
Same padding/progress. Heading "Verify your number". Subtitle "Enter the code sent to +91 XXXXX" (phone bold).
- 6 OTP boxes, each 48×58px, centered, 24px/700, radius 9px. Filled: border `brand`. Empty: `1.5px solid #E7E9F2`. Auto-advance focus.
- Resend "Resend code in 0:ss" (tabular, 13px); at 0 → "Resend code" link in brand/700. Timer 30s on entry.
- Pinned CTA "Continue" always enabled (visual only).

### 4. Business Profile
Same padding/progress. 3 labelled fields (label 13px/600/`#6B7280`, input 16px/600/`#0F1222`):
- Owner name (placeholder "e.g. Rajesh Sharma"), Shop name ("e.g. Sharma General Store"), Industry `<select>` (Kirana/Grocery, Apparel, Electronics, Pharmacy, Restaurant, Services, Other). All 54px, radius 11px, `1.5px solid #E7E9F2`, focus = brand. Vertical gap 18px.

### 5. GST Setup
Same padding/progress. Heading "Are you GST registered?".
- Yes/No tiles: two equal, height 120px, radius 11px, centered (icon 34px + label 17px/700). Selected: `2px solid brand` + `brandTint` bg + brand text. Unselected: `2px solid #E7E9F2` + white + `#6B7280`. Yes icon `verified`, No icon `storefront`.
- GSTIN field (conditional, `claroFade` reveal): placeholder "22AAAAA0000A1Z5", uppercase, ls 0.5px, 700.
- Pinned CTA "Finish setup" — disabled until an option selected.
- GST choice drives invoice format (CGST/SGST split when `gstRegistered = true`).

### 6. Success Screen
Full-screen white, centered, no progress. `check_circle` in `#16A34A` at 54px inside 96×96 circle `#E8F7F0` (`claroPop`). Heading "You're all set, {firstName}" 28px/800/-0.6px. Subtitle "{shopName} is ready. Let's make your first sale." 15px/`#6B7280`. Pinned CTA "Enter Claro" brand.

### 7. Phone Shell (Persistent Frame)
**Status bar:** 50px, fixed top. Left "9:41" 15px/700/tabular. Right `network_cell`,`wifi`,`battery_full` 17–18px FILL 1. White on splash, `#0F1222` elsewhere.
**Bottom nav:** 78px, white, `border-top 1px #EEF0F4`, shadow `0 -4px 20px rgba(15,18,34,0.04)`. 5 equal items, icon 25px + label 10.5px. Active: icon full accent FILL 1, label accent/700. Inactive: icon+label `navIdle`/500. Hidden during any overlay/sheet.
**Pinned CTA region:** absolute, `bottom 78px`, full width, z 20. Bg `linear-gradient(180deg, transparent 0%, pageBg 38%)`. Padding 16px 20px 14px. Button full width 54px radius 11px brand white 16px/700, brand-tinted shadow. Active = `brandPress`. Icon left of text.

### 8. Tab 1 — Billing (Feed Layout) — bg `#F3F1FC`
**Header** `padding 6px 20px 18px`: "Good morning, {name}" (14px/500/`#6B7280`), "{Shop name}" (21px/800/-0.5px, ellipsis). Right: 46×46 avatar circle brand bg, white initials 16px/700, shadow.
**Today's Sales hero:** white card radius 16px, card shadow, padding 22px. Top: 40×40 icon tile (`#ECE7FE`, radius 11px) `payments` `#6D28D9` 22px FILL1; label "Today's Sales" 13.5px/600; right green delta chip "▲ 12%" (12px/700/`#16A34A`, `#E8F7F0` bg, padding 4px 9px, radius 8px). Big number ₹24,850 42px/800/tabular/-1.5px. Sub "{N} bills today · up vs yesterday" 13px/`#6B7280`.
**3 mini stat cards** (3-col grid, gap 11px): white card radius 14px, padding 15px 13px. 32×32 icon tile (radius 9px) 18px FILL1. Number 20px/800/-0.4px. Label 11px/500/`#6B7280`.
| Stat | Icon | Tile | Fg | Value |
|------|------|------|----|-------|
| Bills | `receipt_long` | `#ECE7FE` | `#6D28D9` | todaysBills |
| Pending Khata | `account_balance_wallet` | `#FDECF2` | `#E5484D` | short(pendingKhata) |
| Low Stock | `inventory_2` | `#FFF1E8` | `#F59E0B` | lowStockCount |
**"Recent activity"** header `margin 24px 2px 12px`: "Recent activity" 16px/800; right "View all" (accent 13px/700) + `chevron_right` → Activity overlay.
**Activity list card:** white radius 14px padding 6px 18px, top 5 rows. Row: 14px 0 padding, `border-bottom 1px #F2F3F7`. Left 40×40 tile radius 9px kind icon FILL1. Middle title 14.5px/700, subtitle 12.5px/`#6B7280` "{sub} · {time}". Right amount 15px/800/tabular; credit amounts `#E5484D` (+ prefix), others `#0F1222`.
**Empty state:** centered white card 40px padding, 72×72 tile radius 14px (var tile/accent), "No sales yet today" 19px/800, subtitle 14px/`#6B7280`.
**Pinned CTA:** "+ Create Bill" → Create Bill overlay.

### 9. Create Bill — Build Step
Sheet slides up (`claroSheet` 280ms). Header white, `border-bottom 1px #EEF0F4`, close × (38px `#F2F3F7` radius 9px), "Create Bill" 18px/800.
**Search bar:** full width 50px, `search` 21px left, radius 11px, focus = accent.
**Catalog list** (max-h 184px scroll): white radius 14px. Row: name 14.5px/600, price 12.5px/`#6B7280`, right 32×32 add tile (var tile, `add` accent 20px). Tap → add item.
**Bill items:** white radius 14px. Row: name + unit price 12px/`#6B7280`, right stepper (−/qty/+) in `#F2F3F7` pill, step buttons 28×28 white. Line total 15px/800 tabular right. Dec to 0 removes item.
**Empty items:** "No items yet" nudge card with cart icon.
**Add custom item:** white radius 14px padding 18px. Header `edit_note` (accent) + "Add a custom item" 13.5px/700. Full-width name input (46px radius 10px `#F7F8FA`). 2-col Quantity + Unit price (₹). Full-width "Add to bill" (var tile bg, accent text, 46px/700 radius 10px, `add_circle` 21px).
**Attribution/customer/payment:** white padding 18px gap 16px. Attribute-to-staff `<select>` 48px radius 9px amber chevron. Customer name/phone two inputs 48px radius 9px. Payment mode 3 tiles (Cash/UPI/Credit) 50px radius 9px; active = accent border + tile bg + accent text; icons `payments`/`qr_code_2`/`account_balance_wallet`.
**Footer:** white `border-top 1px #EEF0F4`. "Running total" 13.5px/600 + live total 30px/800/tabular. "Review bill →" primary 54px brand.

### 10. Create Bill — Review / Invoice
Header "Review & Share" + back.
**Invoice card:** white radius 14px. Header: shop name 18px/800 + GSTIN if registered 11.5px/`#6B7280`; right invoice number 12px/700/accent + date 11.5px/`#9AA0AC`; "Billed to {customer}" 12.5px/`#6B7280`. Dashed separator `1px dashed #E3E5EC`. Line items: name × qty 14px/600 + line total 14px/700, `border-bottom 1px #F4F5F8`. Totals: Subtotal 13.5px; **if GST:** CGST(9%)+SGST(9%); Grand total "Total" 15px/700 + amount 26px/800/accent, `border-top 1.5px #EEF0F4`. **UPI QR:** `#F7F8FA` bg padding 20px 22px; left 92×92 QR placeholder (white, radius 14px, `1px #E7E9F2`, `qr_code_2` 64px FILL1); right "Scan to pay via UPI", amount accent 20px/800, shop name 11.5px/`#9AA0AC`.
**Action row:** PDF download + WhatsApp share, equal outline buttons 50px radius 10px `1.5px #E7E9F2`. WhatsApp uses green SVG logo.
**Footer CTA:** "✓ Confirm & Save Bill" brand.

### 11. Activity — Full List
Full-screen overlay. Header "All activity" + back. Scrollable white card radius 14px, all 10 activity rows (same format as billing feed).

### 12. Tab 2 — Khata — bg `#FDF1F2`
Header "Khata" 26px/800 + Filled/Empty demo toggle (12px/600/`#6B7280`).
**Total outstanding card:** white radius 14px padding 22px mb 18px. `account_balance_wallet` 18px `#E5484D` + "Total outstanding credit" 13.5px/600. Amount 40px/800/`#E5484D`/tabular/-1.2px. Sub "Across N customers" 13px/`#6B7280`.
**Search bar:** 48px radius 11px white, `search` left, focus accent (only when customers exist).
**Customer list:** each white card radius 14px padding 18px, tap → detail. Avatar 46×46 circle (var tile rose, accent text, 15px/700 initials). Name 16px/700. Updated 12.5px/`#6B7280`. Outstanding 19px/800/`#E5484D` tabular + "outstanding" 11px/600/`#9AA0AC`. **Settle Up:** white, `1.5px #E7E9F2`, text `#0F1222`, `paid` accent — no tint. **Remind (WhatsApp):** white, `1.5px #E7E9F2`, WhatsApp SVG.
**No-match:** "No customers found" + `search_off`. **Empty:** "No pending credit" + `verified_user` `#16A34A`/`#E8F7F0`.
**Pinned CTA:** "+ Add Credit Record".

### 13. Customer Detail
Full-screen overlay. Header card: avatar 58×58, name, phone 12.5px/tabular, outstanding 28px/800/`#E5484D`. Timeline: white card, rows with `north_east` (debit = rose tile) / `south_west` (credit = green tile). Row: label 14.5px/700, date + "Balance ₹X" 12px/`#9AA0AC`, amount 15px/800 (red debit / green credit). Footer: "Remind" WhatsApp outline (flex 1) + "Settle Up" brand (flex 1.4, 52px).

### 14. Tab 3 — Stock — bg `#FBF6EA`
**Stock value hero:** white radius 16px padding 22px. 40×40 amber tile + "Total stock value". ₹2,86,400 42px/800/tabular. Sub "Across N active SKUs".
**2 mini stats** (2-col gap 11px): Total SKUs (`category` amber tile); Low on stock (`warning` `#FEF3E2`/`#F59E0B`).
**Inventory list:** white card rows. 42×42 tile (`#EEF1F4` `inventory_2` 21px `#6B7280`). Name 15px/700. Qty `#F59E0B` if low else `#0F1222`. "Low stock" badge `#F59E0B`/`#FEF3E2` 11px/700 radius 7px. Price 16px/800/tabular.
**Pinned CTA:** "+ Add Inventory".

### 15. Tab 4 — Staff — bg `#EBF8F1`
Header "Staff" + "N of M present today" (green N). Staff cards white radius 14px padding 18px flex. Avatar 48×48 (var tile mint, accent text). Name 16px/700, role 12.5px/`#6B7280`, advance if >0 12px/tabular (`#E5484D`). **Present/Absent toggle** (tap, stopPropagation): Present `#E8F7F0`/`#16A34A` `check_circle` FILL1; Absent `#FDECF2`/`#E5484D` `cancel` FILL1. Padding 8px 13px radius 9px 12.5px/700.
**Pinned CTA:** "+ Add Staff".

### 16. Staff Detail
Full-screen overlay. Profile card: avatar, name, role, advance. Performance: 3-col divider Sales driven | Bills | Avg bill, 21px/800 tabular. Attendance grid: last 14 days, each 18×26px radius 5px (green `#16A34A` present / light rose `#FBD5DA` absent). Advances & loans: rows label, date, amount, status badge (Repaid green / Outstanding red).

### 17. Tab 5 — Analytics — bg `#EDF2FD`
**Period selector:** 3-tab segmented (Today/Week/Month). `#EDEEF3` bg radius 9px; active white + accent + card shadow.
**Net P&L hero:** white radius 16px padding 24px. Top `trending_up` `#16A34A` + "Net Profit & Loss"; right "▲ N%" green chip. Amount 40px/800/tabular/-1.2px. **Sparkline SVG** (100×34 viewBox, height 64px): area fill gradient (accent opacity 0.16→0), polyline stroke accent width 2, rounded caps.
**KPI grid** (2-col, 4 tiles): Total Sales, Credit Outstanding, Inventory Value, Top Staff. White card, 38×38 tile radius 11px, number 22px/800, label 12px/`#6B7280`.
**Best-selling:** white card rows, 30×30 rank tile radius 9px (var tile, accent text), name + units, revenue tabular right.
**Pinned CTA:** "Export for CA" (`ios_share`) → toast "Report exported for CA".

### 18. Bottom Sheets (Add flows)
Scrim `rgba(15,18,34,0.42)` tap closes. Sheet white radius 20px 20px 0 0 padding 10px 24px 26px. Drag handle 40×5px radius 99px `#E3E5EC` top. Inputs 52px radius 9px `#F7F8FA` border `#E7E9F2` focus accent. Save button full width 54px brand radius 11px. Anim `claroSheet` 300ms `cubic-bezier(0.32,0.72,0,1)`.
- **Add Credit Record:** Customer name, Phone (numeric), Credit amount (₹), Note (optional).
- **Add Inventory:** Item name; Quantity + Low-stock threshold (2-col); Cost price + Selling price (2-col).
- **Add Staff:** Full name, Role, Phone, Monthly salary (₹).

---

## Interactions & Behavior

### Onboarding Flow
`Splash(0) → Mobile(1) → OTP(2) → Profile(3) → GST(4) → Success(5) → App`. Each Continue advances; back decrements (min 0). Mobile→OTP starts 30s resend timer. Success→App switches phase to `app`, starts on Billing. GST stored in `form.gst` (boolean|null), drives invoice format.

### App Navigation
Bottom nav switches `tab` and clears `overlay`. Any overlay/sheet hides nav + pinned CTA.

### Create Bill Flow
1. Search catalog → tap to add (existing item → increment qty). 2. Custom items: name+qty+price → Add to bill. 3. Stepper inc/dec (dec to 0 removes). 4. "Review bill" enabled only if items.length>0. 5. Review → Confirm & Save → toast + close. PDF / WhatsApp → individual toasts.

### Khata Search
Live filter `name.toLowerCase().includes(query)`; "no match" state at 0 results.

### Staff Attendance Toggle
`togglePresent(staffId)` flips a local `presence` override; base from `staff.present`, override stored in `presence{}`.

### Analytics Period
Switching period re-reads `analytics[period]` and redraws sparkline.

### Toast
Flash 2200ms; only one at a time (newer replaces older).

---

## State Management
```typescript
interface AppState {
  phase: 'onboarding' | 'app';
  obStep: 0|1|2|3|4|5;
  mobile: string; otp: [string,string,string,string,string,string]; resend: number;
  form: { owner: string; shop: string; industry: string; gst: boolean|null; gstin: string };
  tab: 'billing'|'khata'|'stock'|'staff'|'analytics';
  brandColor: 'Plum'|'Violet'|'Teal'|'Wine';
  emptyMode: boolean; // demo only
  overlay: null|'createBill'|'activity'|'customer'|'staffDetail'|'addCredit'|'addInventory'|'addStaff';
  selCustomer: string|null; selStaff: string|null;
  presence: Record<string, boolean>;
  cb: { items: { id:string; name:string; price:number; qty:number }[]; search:string;
        payMode:'Cash'|'UPI'|'Credit'; staff:string; custName:string; custPhone:string;
        step:'build'|'review'; nName:string; nQty:string; nPrice:string };
  period: 'today'|'week'|'month';
  khataSearch: string;
  toast: string|null;
}
```

---

## Number Formatting
```typescript
function formatINR(n: number): string {
  const s = String(Math.abs(Math.round(n)));
  if (s.length <= 3) return '₹' + s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return (n < 0 ? '-' : '') + '₹' + rest + ',' + last3;
}
function formatINRShort(n: number): string {
  n = Math.round(n);
  if (n >= 10000000) return '₹' + (n/10000000).toFixed(2).replace(/\.?0+$/, '') + 'Cr';
  if (n >= 100000)  return '₹' + (n/100000).toFixed(2).replace(/\.?0+$/, '') + 'L';
  if (n >= 1000)    return '₹' + (n/1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return '₹' + n;
}
```

---

## Mock Data Shape
See `claro-data.js`. Key shapes:
```typescript
interface Shop { name, owner, industry, gstRegistered, gstin, phone }
interface Summary { todaysSales, todaysBills, pendingKhata, lowStock, monthSales, topStaff }
interface Activity { id, title, sub, amount, kind: 'sale'|'credit'|'settle', time }
interface KhataCustomer { id, name, phone, amount, updated, initials }
interface KhataTransaction { id, label, date, debit, credit }
interface InventoryItem { id, name, qty, price, threshold, low }
interface StaffMember { id, name, role, phone, salary, present, advance, initials }
interface AnalyticsPeriod { netPnl, sales, credit, inventory, topStaff, spark: number[] }
interface BestSelling { id, name, units, revenue }
```

---

## Implementation Notes for Claude Code
1. **Start with design tokens** — `colors.ts`, `typography.ts`, `spacing.ts` matching this doc before any screen.
2. **Per-page theming** — `usePageTheme(tab)` returns `{bg, accent, tile, navIdle}`; apply bg as screen bg, accent for interactive elements, navIdle for inactive nav.
3. **Financial numbers** — implement `formatINR`/`formatINRShort` early; tabular numerals on all money text.
4. **Mock data isolation** — single `mockData.ts` mirroring `claro-data.js`; screens read via a data-layer interface (`src/lib/api.ts`) so swapping to real API touches only that layer.
5. **GST flag** — high-level (profile/context); drives invoice template + settings.
6. **Bottom nav** — persistent layout shell; hide when `overlay !== null`.
7. **Overlay system** — single overlay slot in root layout; slide up via `claroSheet`.
8. **Presence overrides** — staff present/absent is an optimistic local override (`Map<staffId, boolean>`) over server state.

> The original interactive prototype is `Claro.dc.html` (drop your copy alongside this file). Use it as the pixel-perfect visual reference where this document is ambiguous.
