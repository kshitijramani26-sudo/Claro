import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Card } from '@/components/atoms/Card';
import { Sym } from '@/components/atoms/Icon';
import { Money } from '@/components/atoms/Money';
import { Badge } from '@/components/atoms/Badge';
import { Tap } from '@/components/atoms/Tap';
import { SegmentedControl } from '@/components/atoms/SegmentedControl';
import { KpiTile } from '@/components/molecules/KpiTile';
import { EmptyState } from '@/components/molecules/EmptyState';
import { Sparkline } from '@/components/organisms/Sparkline';
import { PinnedCTA } from '@/components/organisms/PinnedCTA';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { BASE_URL, getAuthToken } from '@/lib/http';
import { formatINR } from '@/lib/format';
import { usePageTheme } from '@/theme/pageThemes';
import { Colors, MetricTiles, Radius } from '@/theme/tokens';
import { Font, Type, tnum } from '@/theme/typography';
import { useAppStore } from '@/state/store';

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
] as const;

/** Tab 5 — Analytics. */
export default function Analytics() {
  const theme = usePageTheme('analytics');
  const insets = useSafeAreaInsets();
  const period = useAppStore((s) => s.period);
  const setPeriod = useAppStore((s) => s.setPeriod);
  const flashToast = useAppStore((s) => s.flashToast);

  const { data, error, reload } = useApi(() => api.getAnalytics(period), [period]);
  const { data: bestData } = useApi(() => api.getBestSelling(period), [period]);
  const best = bestData ?? [];

  const exportCsv = async () => {
    try {
      const res = await fetch(`${BASE_URL}/analytics/export?period=${period}`, {
        headers: { Authorization: `Bearer ${getAuthToken() ?? ''}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const csv = await res.text();
      const file = new File(Paths.cache, `claro-${period}.csv`);
      file.write(csv);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export for CA' });
      } else {
        flashToast('Report saved');
      }
    } catch (e) {
      flashToast((e as Error).message);
    }
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ paddingTop: 12, paddingBottom: 16 }}>
          <Text style={Type.screenTitle}>Analytics</Text>
        </View>

        {/* Period selector */}
        <View style={{ marginBottom: 18 }}>
          <SegmentedControl options={[...PERIODS]} value={period} onChange={setPeriod} accent={theme.accent} />
        </View>

        {error ? (
          <Tap onPress={reload}>
            <EmptyState icon="cloud_off" tileBg={theme.tile} tileFg={theme.accent} title="Can't reach the server" sub={`${error} — tap to retry.`} />
          </Tap>
        ) : (
          <>
            {/* Net P&L hero */}
            <Card radius={Radius.hero} pad={24} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Sym name="trending_up" size={18} color={Colors.success} />
                    <Text style={Type.cardLabel}>Net Profit & Loss</Text>
                  </View>
                  <Money
                    value={data?.netPnl ?? 0}
                    style={[{ fontFamily: Font.extrabold, fontSize: 40, letterSpacing: -1.2, color: Colors.textPrimary, marginTop: 10 }, tnum]}
                  />
                </View>
                <Badge label="▲ 8.4%" bg={Colors.successTile} fg={Colors.success} radius={9} />
              </View>
              <Sparkline data={data?.spark ?? [0, 0]} accent={theme.accent} />
            </Card>

            {/* KPI grid */}
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <KpiTile icon="payments" tileBg={MetricTiles.totalSales.bg} tileFg={MetricTiles.totalSales.fg} value={formatINR(data?.sales ?? 0)} label="Total Sales" />
                <KpiTile icon="account_balance_wallet" tileBg={MetricTiles.pendingKhata.bg} tileFg={MetricTiles.pendingKhata.fg} value={formatINR(data?.credit ?? 0)} label="Credit Outstanding" />
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <KpiTile icon="inventory_2" tileBg={MetricTiles.inventoryValue.bg} tileFg={MetricTiles.inventoryValue.fg} value={formatINR(data?.inventory ?? 0)} label="Inventory Value" />
                <KpiTile icon="workspace_premium" tileBg={MetricTiles.netPnl.bg} tileFg={MetricTiles.netPnl.fg} value={(data?.topStaff || '—').split(' ')[0]} label="Top Staff" />
              </View>
            </View>

            {/* Best-selling */}
            {best.length > 0 ? (
              <>
                <Text style={[Type.sectionTitle, { marginTop: 22, marginBottom: 12, marginHorizontal: 2 }]}>Best-selling items</Text>
                <Card style={{ paddingVertical: 6, paddingHorizontal: 18 }}>
                  {best.map((b, i) => (
                    <View
                      key={b.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 13,
                        paddingVertical: 14,
                        borderBottomWidth: i === best.length - 1 ? 0 : 1,
                        borderBottomColor: Colors.divider,
                      }}
                    >
                      <View
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: Radius.tile,
                          backgroundColor: theme.tile,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontFamily: Font.extrabold, fontSize: 13, color: theme.accent }}>{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: Font.bold, fontSize: 14.5, color: Colors.textPrimary }}>{b.name}</Text>
                        <Text style={[{ fontFamily: Font.medium, fontSize: 12, color: Colors.textSecondary, marginTop: 2 }, tnum]}>
                          {b.units} units sold
                        </Text>
                      </View>
                      <Money value={b.revenue} style={[{ fontFamily: Font.extrabold, fontSize: 15, color: Colors.textPrimary }, tnum]} />
                    </View>
                  ))}
                </Card>
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      <PinnedCTA label="Export for CA" icon="ios_share" pageBg={theme.bg} onPress={exportCsv} />
    </View>
  );
}
