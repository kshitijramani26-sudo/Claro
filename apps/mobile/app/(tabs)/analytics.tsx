import { useState } from 'react';
import { ScrollView, Text, View, FlatList } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { WebView } from 'react-native-webview';
import { Card } from '@/components/atoms/Card';
import { Sym } from '@/components/atoms/Icon';
import { Money } from '@/components/atoms/Money';
import { Badge } from '@/components/atoms/Badge';
import { Tap } from '@/components/atoms/Tap';
import { SegmentedControl } from '@/components/atoms/SegmentedControl';
import { PrimaryButton, OutlineButton } from '@/components/atoms/Button';
import { KpiTile } from '@/components/molecules/KpiTile';
import { EmptyState } from '@/components/molecules/EmptyState';
import { Sparkline } from '@/components/organisms/Sparkline';
import { PinnedCTA } from '@/components/organisms/PinnedCTA';
import { BottomSheet } from '@/components/organisms/BottomSheet';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { formatINR, periodDelta } from '@/lib/format';
import { analyticsHtml, analyticsCanvasHtml, type AnalyticsExport } from '@/lib/analyticsExport';
import { usePageTheme } from '@/theme/pageThemes';
import { Colors, MetricTiles, Radius } from '@/theme/tokens';
import { Font, Type, tnum } from '@/theme/typography';
import { useAppStore } from '@/state/store';

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
] as const;

const PERIOD_LABEL: Record<string, string> = { today: 'Today', week: 'This week', month: 'This month' };

/** Tab 5 — Analytics. */
export default function Analytics() {
  const theme = usePageTheme('analytics');
  const insets = useSafeAreaInsets();
  const period = useAppStore((s) => s.period);
  const setPeriod = useAppStore((s) => s.setPeriod);
  const business = useAppStore((s) => s.business);
  const flashToast = useAppStore((s) => s.flashToast);
  const [exportMenu, setExportMenu] = useState(false);
  const [pngHtml, setPngHtml] = useState<string | null>(null);

  const { data, error, reload } = useApi(() => api.getAnalytics(period), [period]);
  const { data: bestData } = useApi(() => api.getBestSelling(period), [period]);
  const best = bestData ?? [];

  const payload = (): AnalyticsExport => ({
    shopName: business?.name ?? 'My Shop',
    periodLabel: PERIOD_LABEL[period] ?? period,
    netPnl: data?.netPnl ?? 0,
    sales: data?.sales ?? 0,
    credit: data?.credit ?? 0,
    inventory: data?.inventory ?? 0,
    topStaff: data?.topStaff ?? '—',
    best: best.map((b) => ({ name: b.name, units: b.units, revenue: b.revenue })),
  });

  const exportPdf = async () => {
    setExportMenu(false);
    try {
      const { uri } = await Print.printToFileAsync({ html: analyticsHtml(payload()) });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Analytics ${period}`, UTI: 'com.adobe.pdf' });
      }
    } catch (e) {
      flashToast((e as Error).message);
    }
  };

  const exportPng = () => {
    setExportMenu(false);
    setPngHtml(analyticsCanvasHtml(payload())); // mounts the off-screen capture WebView
  };

  const onPngCaptured = async (dataUrl: string) => {
    setPngHtml(null);
    try {
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
      const file = new File(Paths.cache, `claro-analytics-${period}.png`);
      file.write(Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0)));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'image/png', dialogTitle: `Analytics ${period}`, UTI: 'public.png' });
      }
    } catch (e) {
      flashToast((e as Error).message);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
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
                {(() => {
                  const d = data ? periodDelta(data.netPnl, data.prevNetPnl) : null;
                  return d ? (
                    <Badge label={d.label} bg={d.up ? Colors.successTile : Colors.dangerTile} fg={d.up ? Colors.success : Colors.danger} radius={9} />
                  ) : null;
                })()}
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
                  <FlatList
                    data={best}
                    scrollEnabled={false}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item: b, index: i }) => (
                      <View
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
                    )}
                  />
                </Card>
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      <PinnedCTA label="Export" icon="ios_share" pageBg={theme.bg} onPress={() => setExportMenu(true)} />

      {exportMenu ? (
        <BottomSheet title="Export analytics" onClose={() => setExportMenu(false)}>
          <View style={{ gap: 12 }}>
            <Text style={{ fontFamily: Font.medium, fontSize: 13.5, color: Colors.textSecondary }}>
              Share your {PERIOD_LABEL[period] ?? period} summary as a file.
            </Text>
            <PrimaryButton label="Export as PDF" icon="picture_as_pdf" onPress={exportPdf} />
            <OutlineButton label="Export as PNG" icon="image" height={54} fontSize={16} onPress={exportPng} />
          </View>
        </BottomSheet>
      ) : null}

      {/* Off-screen canvas → PNG (works in Expo Go; no native view-shot needed) */}
      {pngHtml ? (
        <View style={{ position: 'absolute', left: -2000, width: 360, height: 1 }} pointerEvents="none">
          <WebView
            source={{ html: pngHtml }}
            originWhitelist={['*']}
            javaScriptEnabled
            onMessage={(e) => onPngCaptured(e.nativeEvent.data)}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}
