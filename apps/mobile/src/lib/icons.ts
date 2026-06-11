import type { ComponentProps } from 'react';
import type { MaterialIcons } from '@expo/vector-icons';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

/**
 * Google Material Symbols Rounded (design spec) → nearest @expo/vector-icons MaterialIcons glyph.
 * Substitutions (no exact MaterialIcons equivalent): monitoring → bar-chart.
 * The Symbols FILL axis cannot be reproduced by the static MaterialIcons font; active/inactive
 * state is signalled with color (accent vs navIdle) per the page-theme rules.
 */
export const SYMBOLS = {
  point_of_sale: 'point-of-sale',
  account_balance_wallet: 'account-balance-wallet',
  inventory_2: 'inventory-2',
  groups: 'groups',
  monitoring: 'bar-chart',
  receipt_long: 'receipt-long',
  qr_code_2: 'qr-code-2',
  trending_up: 'trending-up',
  check_circle: 'check-circle',
  verified: 'verified',
  verified_user: 'verified-user',
  storefront: 'storefront',
  search: 'search',
  search_off: 'search-off',
  add: 'add',
  add_circle: 'add-circle',
  edit_note: 'edit-note',
  paid: 'paid',
  payments: 'payments',
  category: 'category',
  warning: 'warning',
  north_east: 'north-east',
  south_west: 'south-west',
  ios_share: 'ios-share',
  chevron_right: 'chevron-right',
  arrow_forward: 'arrow-forward',
  arrow_back: 'arrow-back',
  close: 'close',
  check: 'check',
  remove: 'remove',
  cancel: 'cancel',
  shopping_cart: 'shopping-cart',
  expand_more: 'expand-more',
  inbox: 'inbox',
  dataset: 'dataset',
  workspace_premium: 'workspace-premium',
  cloud_off: 'cloud-off',
  person: 'person',
  mail: 'mail',
  logout: 'logout',
  delete: 'delete',
  star: 'star',
  star_outline: 'star-outline',
  description: 'description',
  privacy_tip: 'privacy-tip',
  language: 'language',
  location_on: 'location-on',
  currency_rupee: 'currency-rupee',
  contacts: 'contacts',
  notifications: 'notifications',
  open_in_full: 'open-in-full',
  image: 'image',
  picture_as_pdf: 'picture-as-pdf',
  sell: 'sell',
  percent: 'percent',
  person_search: 'person-search',
  calendar_month: 'calendar-month',
  event: 'event',
  account_balance: 'account-balance',
  savings: 'savings',
  file_upload: 'file-upload',
  history: 'history',
  payments_outlined: 'payments',
} as const satisfies Record<string, MaterialIconName>;

export type SymbolName = keyof typeof SYMBOLS;

/** Official WhatsApp glyph (simple-icons path, from Claro.dc.html) — render via react-native-svg in #25D366. */
export const WHATSAPP_PATH =
  'M17.47 14.38c-.3-.15-1.76-.86-2.03-.96-.27-.1-.47-.15-.67.15s-.76.96-.94 1.16-.35.22-.64.08a8.1 8.1 0 0 1-2.39-1.48 9 9 0 0 1-1.66-2.06c-.17-.3 0-.46.13-.6.13-.14.3-.35.44-.53.15-.17.2-.3.3-.5.1-.19.05-.37-.03-.51-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.08-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.19 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.27-.2-.56-.35M12.04 21.5a9.43 9.43 0 0 1-4.8-1.32l-.35-.2-3.57.93.96-3.48-.23-.36a9.4 9.4 0 0 1-1.44-5.01c0-5.2 4.24-9.43 9.46-9.43a9.4 9.4 0 0 1 9.45 9.44c0 5.2-4.24 9.43-9.46 9.43m8.04-17.48A11.3 11.3 0 0 0 12.04 1C5.85 1 .82 6.02.82 12.2c0 1.97.52 3.9 1.5 5.6L.73 23.3l5.66-1.48a11.26 11.26 0 0 0 5.65 1.52h.01c6.18 0 11.21-5.02 11.22-11.2A11.13 11.13 0 0 0 20.08 4.02';

export const WHATSAPP_GREEN = '#25D366';
