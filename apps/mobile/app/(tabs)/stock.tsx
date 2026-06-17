import { Alert, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/atoms/Card';
import { Tap } from '@/components/atoms/Tap';
import { SummaryCard } from '@/components/molecules/SummaryCard';
import { StatTile } from '@/components/molecules/StatTile';
import { InventoryRow } from '@/components/molecules/InventoryRow';
import { EmptyState } from '@/components/molecules/EmptyState';
import { DemoToggle } from '@/components/organisms/DemoToggle';
import { PinnedCTA } from '@/components/organisms/PinnedCTA';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { usePageTheme } from '@/theme/pageThemes';
import { Colors } from '@/theme/tokens';
import { Type } from '@/theme/typography';
import { useAppStore } from '@/state/store';

/** Tab 3 — Stock & Inventory. */
export default function Stock() {
  const theme = usePageTheme('stock');
  const insets = useSafeAreaInsets();
  const emptyMode = useAppStore((s) => s.emptyMode);
  const openOverlay = useAppStore((s) => s.openOverlay);
  const openEditInventory = useAppStore((s) => s.openEditInventory);
  const refresh = useAppStore((s) => s.refresh);
  const flashToast = useAppStore((s) => s.flashToast);

  const { data: stats } = useApi(() => api.getInventoryStats());
  const { data, loading, error, reload } = useApi(() => api.getInventory());
  const items = emptyMode ? [] : (data ?? []);

  const confirmDelete = (id: string, name: string) => {
    Alert.alert('Delete this item?', `${name} will be removed from your inventory.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteInventory(id);
            refresh();
            flashToast('Item deleted');
          } catch (e) {
            flashToast((e as Error).message);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, paddingBottom: 16 }}>
          <Text style={Type.screenTitle}>Inventory</Text>
          <DemoToggle />
        </View>

        {error ? (
          <Tap onPress={reload}>
            <EmptyState icon="cloud_off" tileBg={theme.tile} tileFg={theme.accent} title="Can't reach the server" sub={`${error} — tap to retry.`} />
          </Tap>
        ) : loading && items.length === 0 ? null : (
          <>
            {/* Stock value hero — always shown (₹0 for a new shop) */}
            <SummaryCard
              icon="inventory_2"
              tileBg={theme.tile}
              tileFg={theme.accent}
              label="Total stock value"
              value={items.length === 0 ? 0 : stats?.totalValue ?? 0}
              sub={`Across ${items.length === 0 ? 0 : stats?.skus ?? 0} active SKUs`}
            />

            {/* Mini stats */}
            <View style={{ flexDirection: 'row', gap: 11, marginTop: 11 }}>
              <StatTile icon="category" tileBg={theme.tile} tileFg={theme.accent} value={String(items.length === 0 ? 0 : stats?.skus ?? 0)} label="Total SKUs" />
              <StatTile icon="warning" tileBg={Colors.warningTile2} tileFg={Colors.warning} value={String(items.length === 0 ? 0 : stats?.lowCount ?? 0)} label="Low on stock" />
            </View>

            {/* Inventory list / empty */}
            {items.length === 0 ? (
              <View style={{ marginTop: 16 }}>
                <EmptyState
                  icon="inventory_2"
                  tileBg={Colors.warningTile}
                  tileFg={Colors.warning}
                  title="Your shelves are empty"
                  sub="Add your products to track stock value and get low-stock alerts."
                />
              </View>
            ) : (
              <Card style={{ paddingVertical: 6, paddingHorizontal: 18, marginTop: 14 }}>
                {items.map((it, i) => (
                  <InventoryRow key={it.id} item={it} last={i === items.length - 1} onPress={() => openEditInventory(it)} onDelete={() => confirmDelete(it.id, it.name)} />
                ))}
              </Card>
            )}
          </>
        )}
      </ScrollView>

      <PinnedCTA label="Add Inventory" icon="add" pageBg={theme.bg} onPress={() => openOverlay('addInventory')} />
    </SafeAreaView>
  );
}
