import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sym } from '@/components/atoms/Icon';
import type { SymbolName } from '@/lib/icons';
import { PageThemes, type TabName } from '@/theme/pageThemes';
import { Colors } from '@/theme/tokens';
import { Font } from '@/theme/typography';
import { Spacing } from '@/theme/spacing';
import { useAppStore } from '@/state/store';

const TABS: { key: TabName; href: string; label: string; icon: SymbolName }[] = [
  { key: 'billing', href: '/(tabs)', label: 'Billing', icon: 'point_of_sale' },
  { key: 'khata', href: '/(tabs)/khata', label: 'Khata', icon: 'account_balance_wallet' },
  { key: 'stock', href: '/(tabs)/stock', label: 'Stock', icon: 'inventory_2' },
  { key: 'staff', href: '/(tabs)/staff', label: 'Staff', icon: 'groups' },
  { key: 'analytics', href: '/(tabs)/analytics', label: 'Analytics', icon: 'monitoring' },
];

/**
 * Persistent bottom nav — 78px, 5 items. Active item in the page accent;
 * inactive items take the CURRENT page's navIdle so the whole bar glows
 * with the active tab's hue. Hidden while any overlay/sheet is open.
 */
export function BottomNav() {
  const router = useRouter();
  const tab = useAppStore((s) => s.tab);
  const overlay = useAppStore((s) => s.overlay);
  const setTab = useAppStore((s) => s.setTab);
  const insets = useSafeAreaInsets();

  if (overlay) return null;

  const theme = PageThemes[tab];
  return (
    <View
      style={{
        flexDirection: 'row',
        height: Spacing.navHeight + insets.bottom,
        paddingBottom: insets.bottom,
        backgroundColor: Colors.canvas,
        borderTopWidth: 1,
        borderTopColor: Colors.navBorder,
      }}
    >
      {TABS.map((t) => {
        const active = t.key === tab;
        const color = active ? theme.accent : theme.navIdle;
        return (
          <Pressable
            key={t.key}
            android_ripple={{ color: '#e0e0e0', borderless: true }}
            onPress={() => {
              setTab(t.key);
              router.navigate(t.href as never);
            }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 }}
          >
            <Sym name={t.icon} size={25} color={color} />
            <Text style={{ fontFamily: active ? Font.bold : Font.medium, fontSize: 10.5, color }}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
