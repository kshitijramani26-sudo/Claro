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
import { IconTile } from '@/components/atoms/IconTile';
import { PrimaryButton, OutlineButton } from '@/components/atoms/Button';
import { KpiTile } from '@/components/molecules/KpiTile';
import type { SymbolName } from '@/lib/icons';
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

            {/* ── §1 Top customers ── */}
            <Text style={[Type.sectionTitle, { marginTop: 22, marginBottom: 12, marginHorizontal: 2 }]}>Top customers</Text>
            <Card style={{ paddingVertical: 6, paddingHorizontal: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.divider }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Sym name="person" size={15} color={Colors.success} />
                  <Text style={[{ fontFamily: Font.bold, fontSize: 12.5, color: Colors.textSecondary }, tnum]}>New: {data?.newCustomers ?? 0}</Text>
                </View>
                <Text style={{ fontFamily: Font.medium, fontSize: 12.5, color: Colors.textMuted }}>·</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Sym name="history" size={15} color={theme.accent} />
                  <Text style={[{ fontFamily: Font.bold, fontSize: 12.5, color: Colors.textSecondary }, tnum]}>Repeat: {data?.repeatCustomers ?? 0}</Text>
                </View>
              </View>
              {(data?.topCustomers ?? []).length > 0 ? (
                (data?.topCustomers ?? []).map((c, i, arr) => (
                  <View key={c.name + i} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14, borderBottomWidth: i === arr.length - 1 ? 0 : 1, borderBottomColor: Colors.divider }}>
                    <View style={{ width: 30, height: 30, borderRadius: Radius.tile, backgroundColor: theme.tile, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontFamily: Font.extrabold, fontSize: 13, color: theme.accent }}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: Font.bold, fontSize: 14.5, color: Colors.textPrimary }} numberOfLines={1}>{c.name}</Text>
                      <Text style={[{ fontFamily: Font.medium, fontSize: 12, color: Colors.textSecondary, marginTop: 2 }, tnum]}>{c.bills} {c.bills === 1 ? 'bill' : 'bills'}</Text>
                    </View>
                    <Money value={c.total} style={[{ fontFamily: Font.extrabold, fontSize: 15, color: Colors.textPrimary }, tnum]} />
                  </View>
                ))
              ) : (
                <Text style={{ fontFamily: Font.medium, fontSize: 13, color: Colors.textMuted, paddingVertical: 16, textAlign: 'center' }}>No customer sales in this period yet</Text>
              )}
            </Card>

            {/* ── §2 Busiest times ── */}
            <Text style={[Type.sectionTitle, { marginTop: 22, marginBottom: 12, marginHorizontal: 2 }]}>Busiest times</Text>
            <Card pad={18}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Sym name="calendar_month" size={18} color={theme.accent} />
                <Text style={{ fontFamily: Font.bold, fontSize: 14.5, color: Colors.textPrimary }}>
                  {data?.busiestWeekday ? `Peak: ${data.busiestWeekday}s, ${data.peakHourLabel || '—'}` : 'Not enough data yet'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 72, marginTop: 16, gap: 8 }}>
                {(data?.weekdayTotals ?? [0, 0, 0, 0, 0, 0, 0]).map((v, i, arr) => {
                  const peak = Math.max(...arr, 1);
                  const h = v > 0 ? Math.max(6, Math.round((v / peak) * 64)) : 4;
                  const isPeak = v === peak && v > 0;
                  return (
                    <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                      <View style={{ width: '100%', height: h, borderRadius: 5, backgroundColor: isPeak ? theme.accent : theme.tile }} />
                      <Text style={{ fontFamily: Font.semibold, fontSize: 11, color: isPeak ? theme.accent : Colors.textMuted }}>{'MTWTFSS'[i]}</Text>
                    </View>
                  );
                })}
              </View>
            </Card>

            {/* ── §3 Avg bill + bills/day ── */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
              <DeltaTile icon="payments" tileBg={MetricTiles.totalSales.bg} tileFg={MetricTiles.totalSales.fg}
                value={(data?.billCount ?? 0) > 0 ? formatINR(data?.avgBill ?? 0) : '—'} label="Avg bill value"
                delta={data ? periodDelta(data.avgBill, data.prevAvgBill) : null} />
              <DeltaTile icon="receipt_long" tileBg={MetricTiles.bills.bg} tileFg={MetricTiles.bills.fg}
                value={(data?.billCount ?? 0) > 0 ? String(data?.billsPerDay ?? 0) : '—'} label="Bills / day"
                delta={data ? periodDelta(data.billsPerDay, data.prevBillsPerDay) : null} />
            </View>

            {/* ── §4 Payment mix ── */}
            <Text style={[Type.sectionTitle, { marginTop: 22, marginBottom: 12, marginHorizontal: 2 }]}>Payment mix</Text>
            <Card pad={18}>
              {(() => {
                const cash = data?.payCash ?? 0, upi = data?.payUpi ?? 0, credit = data?.payCredit ?? 0;
                const tot = cash + upi + credit;
                const pct = (v: number) => (tot > 0 ? Math.round((v / tot) * 100) : 0);
                const segs = [
                  { label: 'Cash', v: cash, color: Colors.success },
                  { label: 'UPI', v: upi, color: theme.accent },
                  { label: 'Credit (udhaar)', v: credit, color: Colors.danger },
                ];
                return (
                  <>
                    <View style={{ flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', backgroundColor: Colors.divider }}>
                      {tot > 0 ? segs.map((s) => s.v > 0 ? <View key={s.label} style={{ width: `${(s.v / tot) * 100}%`, backgroundColor: s.color }} /> : null) : null}
                    </View>
                    <View style={{ gap: 10, marginTop: 14 }}>
                      {segs.map((s) => (
                        <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: s.color }} />
                          <Text style={{ flex: 1, fontFamily: Font.semibold, fontSize: 13.5, color: Colors.textPrimary }}>{s.label}</Text>
                          <Money value={s.v} style={[{ fontFamily: Font.bold, fontSize: 13.5, color: Colors.textPrimary }, tnum]} />
                          <Text style={[{ fontFamily: Font.bold, fontSize: 12.5, color: Colors.textMuted, minWidth: 38, textAlign: 'right' }, tnum]}>{pct(s.v)}%</Text>
                        </View>
                      ))}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.divider }}>
                      <Sym name="account_balance_wallet" size={17} color={Colors.danger} />
                      <Text style={[{ fontFamily: Font.semibold, fontSize: 13, color: Colors.textSecondary }, tnum]}>
                        <Money value={credit} style={{ fontFamily: Font.bold, color: Colors.danger }} /> tied up in udhaar (credit)
                      </Text>
                    </View>
                  </>
                );
              })()}
            </Card>
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

/** KPI tile with a period-over-period delta chip (Avg bill, Bills/day). */
function DeltaTile({ icon, tileBg, tileFg, value, label, delta }: {
  icon: SymbolName; tileBg: string; tileFg: string; value: string; label: string;
  delta: { label: string; up: boolean } | null;
}) {
  return (
    <Card pad={16} style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconTile name={icon} bg={tileBg} fg={tileFg} size={38} iconSize={20} radius={Radius.btn} />
        {delta ? (
          <Badge label={delta.label} bg={delta.up ? Colors.successTile : Colors.dangerTile} fg={delta.up ? Colors.success : Colors.danger} radius={9} />
        ) : null}
      </View>
      <Text style={[{ fontFamily: Font.extrabold, fontSize: 22, letterSpacing: -0.4, color: Colors.textPrimary, marginTop: 12 }, tnum]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={{ fontFamily: Font.medium, fontSize: 12, color: Colors.textSecondary, marginTop: 2 }}>{label}</Text>
    </Card>
  );
}
