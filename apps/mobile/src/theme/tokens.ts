/** Claro design tokens — ported from docs/design/design-handoff.md. Values are final; do not invent. */

/** Four selectable brand palettes (splash swatches). Plum is default. */
export const BrandPalettes = {
  Plum: { brand: '#2D1150', press: '#1C0A35', tint: '#ECE6F4', grad: ['#4C2185', '#2D1150', '#190830'] },
  Violet: { brand: '#4C1D95', press: '#37156D', tint: '#EDE9FB', grad: ['#6D28D9', '#4C1D95', '#2E1065'] },
  Teal: { brand: '#0B3D3A', press: '#062725', tint: '#E3F0EF', grad: ['#14635E', '#0B3D3A', '#04211F'] },
  Wine: { brand: '#4A1942', press: '#320F2C', tint: '#F0E6EE', grad: ['#7A2A6D', '#4A1942', '#2A0D25'] },
} as const;
export type BrandName = keyof typeof BrandPalettes;
export type BrandPalette = (typeof BrandPalettes)[BrandName];

export const Colors = {
  success: '#16A34A',
  successSoft: '#34D399',
  danger: '#E5484D',
  warning: '#F59E0B',
  textPrimary: '#0F1222',
  textSecondary: '#6B7280',
  textMuted: '#9AA0AC',
  border: '#E7E9F2',
  divider: '#F2F3F7',
  rowDivider: '#F4F5F8',
  navBorder: '#EEF0F4',
  canvas: '#FFFFFF',
  inputBg: '#F7F8FA',
  chipBg: '#F2F3F7',
  segmentBg: '#EDEEF3',
  dashed: '#E3E5EC',
  disabled: '#C7C9D9',
  scrim: 'rgba(15,18,34,0.42)',
  successTile: '#E8F7F0',
  dangerTile: '#FDECF2',
  warningTile: '#FFF1E8',
  warningTile2: '#FEF3E2',
  attendanceAbsent: '#FBD5DA',
  neutralTile: '#EEF1F4',
} as const;

/** Metric-specific icon tile colors (semantic, not page-themed). */
export const MetricTiles = {
  sale: { bg: '#E8F7F0', fg: '#16A34A' },
  bills: { bg: '#ECE7FE', fg: '#6D28D9' },
  pendingKhata: { bg: '#FDECF2', fg: '#E5484D' },
  lowStock: { bg: '#FFF1E8', fg: '#F59E0B' },
  month: { bg: '#E8F2FF', fg: '#2563EB' },
  topStaff: { bg: '#ECE7FE', fg: '#6D28D9' },
  totalSales: { bg: '#D9E7FE', fg: '#2563EB' },
  inventoryValue: { bg: '#FFF1E8', fg: '#F59E0B' },
  netPnl: { bg: '#E8F7F0', fg: '#16A34A' },
} as const;

/** Activity / transaction row tiles by kind. */
export const KindTiles = {
  sale: { bg: '#E8F7F0', fg: '#16A34A' },
  credit: { bg: '#FDECF2', fg: '#E5484D' },
  settle: { bg: '#ECE7FE', fg: '#6D28D9' },
} as const;

export const Radius = {
  hero: 16,
  card: 14,
  btn: 11,
  btnSm: 10,
  tile: 9,
  chip: 8,
  badge: 7,
  pill: 99,
  sheet: 20,
} as const;

export const Shadows = {
  card: {
    shadowColor: '#0F1222',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  nav: {
    shadowColor: '#0F1222',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 12,
  },
  toast: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 10,
  },
} as const;

/** Brand-tinted CTA shadow (`0 12px 26px -8px rgba(brand,0.45)`). */
export function ctaShadow(brand: string) {
  return {
    shadowColor: brand,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 13,
    elevation: 8,
  } as const;
}

/** Avatar shadow (`0 6px 18px -4px rgba(brand,0.5)`). */
export function avatarShadow(brand: string) {
  return {
    shadowColor: brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 9,
    elevation: 6,
  } as const;
}
