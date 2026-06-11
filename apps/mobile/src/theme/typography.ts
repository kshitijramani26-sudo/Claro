import type { TextStyle } from 'react-native';
import { Colors } from './tokens';

/** Plus Jakarta Sans — weight is selected via font family, never fontWeight. */
export const Font = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

/** Tabular numerals — apply to ALL money/numeric text. */
export const tnum: TextStyle = { fontVariant: ['tabular-nums'] };

export const Type = {
  heroMoney: {
    fontFamily: Font.extrabold,
    fontSize: 42,
    letterSpacing: -1.5,
    color: Colors.textPrimary,
    ...tnum,
  },
  cardMoney: {
    fontFamily: Font.extrabold,
    fontSize: 26,
    letterSpacing: -0.6,
    color: Colors.textPrimary,
    ...tnum,
  },
  listMoney: {
    fontFamily: Font.extrabold,
    fontSize: 15,
    letterSpacing: -0.3,
    color: Colors.textPrimary,
    ...tnum,
  },
  screenTitle: {
    fontFamily: Font.extrabold,
    fontSize: 26,
    letterSpacing: -0.6,
    color: Colors.textPrimary,
  },
  sectionTitle: {
    fontFamily: Font.extrabold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  cardLabel: {
    fontFamily: Font.semibold,
    fontSize: 13.5,
    color: Colors.textSecondary,
  },
  body: {
    fontFamily: Font.semibold,
    fontSize: 14.5,
    color: Colors.textPrimary,
  },
  caption: {
    fontFamily: Font.medium,
    fontSize: 12.5,
    color: Colors.textSecondary,
  },
  badge: {
    fontFamily: Font.bold,
    fontSize: 11.5,
  },
} satisfies Record<string, TextStyle>;
