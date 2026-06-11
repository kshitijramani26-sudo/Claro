import { useState } from 'react';
import { Linking, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/atoms/Card';
import { Sym } from '@/components/atoms/Icon';
import { Money } from '@/components/atoms/Money';
import { Tap } from '@/components/atoms/Tap';
import { KhataRow } from '@/components/molecules/KhataRow';
import { EmptyState } from '@/components/molecules/EmptyState';
import { DemoToggle } from '@/components/organisms/DemoToggle';
import { PinnedCTA } from '@/components/organisms/PinnedCTA';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { usePageTheme } from '@/theme/pageThemes';
import { Colors, Radius } from '@/theme/tokens';
import { Font, Type, tnum } from '@/theme/typography';
import { useAppStore } from '@/state/store';

/** Tab 2 — Khata (credit ledger). */
export default function Khata() {
  const theme = usePageTheme('khata');
  const insets = useSafeAreaInsets();
  const emptyMode = useAppStore((s) => s.emptyMode);
  const khataSearch = useAppStore((s) => s.khataSearch);
  const setKhataSearch = useAppStore((s) => s.setKhataSearch);
  const openCustomer = useAppStore((s) => s.openCustomer);
  const openOverlay = useAppStore((s) => s.openOverlay);
  const openSettle = useAppStore((s) => s.openSettle);
  const flashToast = useAppStore((s) => s.flashToast);
  const [searchFocused, setSearchFocused] = useState(false);

  const { data, loading, error, reload } = useApi(() => api.getKhata());
  const customers = emptyMode ? [] : (data ?? []);
  const filtered = customers.filter((c) => c.name.toLowerCase().includes(khataSearch.toLowerCase()));
  const totalOutstanding = customers.reduce((s, c) => s + c.amount, 0);

  const remind = async (id: string, name: string) => {
    try {
      const { waUrl } = await api.getReminder(id);
      await Linking.openURL(waUrl);
    } catch {
      flashToast('Could not open WhatsApp for ' + name.split(' ')[0]);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, paddingBottom: 16 }}>
          <Text style={Type.screenTitle}>Khata</Text>
          <DemoToggle />
        </View>

        {error ? (
          <Tap onPress={reload}>
            <EmptyState icon="cloud_off" tileBg={theme.tile} tileFg={theme.accent} title="Can't reach the server" sub={`${error} — tap to retry.`} />
          </Tap>
        ) : loading && customers.length === 0 ? null : customers.length === 0 ? (
          <EmptyState
            icon="verified_user"
            tileBg={Colors.successTile}
            tileFg={Colors.success}
            title="No pending credit"
            sub="Every customer is settled up. Add a credit record when someone buys on Khata."
          />
        ) : (
          <>
            {/* Total outstanding */}
            <Card pad={22} style={{ marginBottom: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Sym name="account_balance_wallet" size={18} color={Colors.danger} />
                <Text style={Type.cardLabel}>Total outstanding credit</Text>
              </View>
              <Money
                value={totalOutstanding}
                style={[{ fontFamily: Font.extrabold, fontSize: 40, letterSpacing: -1.2, color: Colors.danger, marginTop: 10 }, tnum]}
              />
              <Text style={{ fontFamily: Font.medium, fontSize: 13, color: Colors.textSecondary, marginTop: 4 }}>
                Across {customers.length} customers
              </Text>
            </Card>

            {/* Search */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                height: 48,
                borderRadius: Radius.btn,
                borderWidth: 1.5,
                borderColor: searchFocused ? theme.accent : Colors.border,
                backgroundColor: Colors.canvas,
                paddingHorizontal: 14,
                marginBottom: 14,
              }}
            >
              <Sym name="search" size={20} color={Colors.textMuted} />
              <TextInput
                value={khataSearch}
                onChangeText={setKhataSearch}
                placeholder="Search customers…"
                placeholderTextColor={Colors.textMuted}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                style={{ flex: 1, fontFamily: Font.semibold, fontSize: 14.5, color: Colors.textPrimary }}
              />
            </View>

            {/* Customer list / no-match */}
            {filtered.length === 0 ? (
              <EmptyState
                icon="search_off"
                tileBg={theme.tile}
                tileFg={theme.accent}
                title="No customers found"
                sub="Try a different name — or add a new credit record below."
              />
            ) : (
              <View style={{ gap: 12 }}>
                {filtered.map((c) => (
                  <KhataRow
                    key={c.id}
                    customer={c}
                    accent={theme.accent}
                    tile={theme.tile}
                    onPress={() => openCustomer(c.id)}
                    onSettle={() => openSettle(c.id, c.name, c.amount)}
                    onRemind={() => remind(c.id, c.name)}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <PinnedCTA label="Add Credit Record" icon="add" pageBg={theme.bg} onPress={() => openOverlay('addCredit')} />
    </SafeAreaView>
  );
}
