import { ScrollView, Text, View, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Tap } from '@/components/atoms/Tap';
import { Avatar } from '@/components/atoms/Avatar';
import { Card } from '@/components/atoms/Card';
import { Sym } from '@/components/atoms/Icon';
import { SummaryCard } from '@/components/molecules/SummaryCard';
import { StatTile } from '@/components/molecules/StatTile';
import { ActivityRow } from '@/components/molecules/ActivityRow';
import { EmptyState } from '@/components/molecules/EmptyState';
import { PinnedCTA } from '@/components/organisms/PinnedCTA';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { formatINRShort } from '@/lib/format';
import { usePageTheme } from '@/theme/pageThemes';
import { Colors, MetricTiles, avatarShadow } from '@/theme/tokens';
import { Font, Type } from '@/theme/typography';
import { useAppStore, useBrand } from '@/state/store';

/** Tab 1 — Billing (home feed). */
export default function Billing() {
  const theme = usePageTheme('billing');
  const brand = useBrand();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const business = useAppStore((s) => s.business);
  const emptyMode = useAppStore((s) => s.emptyMode);
  const openOverlay = useAppStore((s) => s.openOverlay);
  const openInvoice = useAppStore((s) => s.openInvoice);
  const openSearch = useAppStore((s) => s.openSearch);
  const cbReset = useAppStore((s) => s.cbReset);

  const { data: summary, error: summaryError, reload } = useApi(() => api.getSummary());
  const { data: activity } = useApi(() => api.getActivity());
  const feed = (activity ?? []).slice(0, 5);

  const ownerName = business?.owner ?? '';
  const ownerFirst = ownerName.split(' ')[0] ?? '';
  const initials = ownerName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '·';
  const shopName = business?.name ?? '';
  const showEmpty = emptyMode || (summary !== null && summary.todaysBills === 0 && feed.length === 0);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingTop: 6,
            paddingHorizontal: 20,
            paddingBottom: 18,
          }}
        >
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ fontFamily: Font.medium, fontSize: 14, color: Colors.textSecondary }}>
              Good morning{ownerFirst ? `, ${ownerFirst}` : ''}
            </Text>
            <Text
              numberOfLines={1}
              style={{ fontFamily: Font.extrabold, fontSize: 21, letterSpacing: -0.5, color: Colors.textPrimary, marginTop: 2 }}
            >
              {shopName || ' '}
            </Text>
          </View>
          <Tap
            onPress={openSearch}
            style={{
              width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.canvas,
              borderWidth: 0.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginRight: 12,
            }}
          >
            <Sym name="search" size={22} color={Colors.textPrimary} />
          </Tap>
          <Tap onPress={() => router.push('/profile')}>
            <Avatar initials={initials} size={46} bg={brand.brand} color="#FFFFFF" fontSize={16} style={avatarShadow(brand.brand)} />
          </Tap>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {summaryError ? (
            <Tap onPress={reload}>
              <EmptyState
                icon="cloud_off"
                tileBg={theme.tile}
                tileFg={theme.accent}
                title="Can't reach the server"
                sub={`${summaryError} — tap to retry.`}
              />
            </Tap>
          ) : showEmpty ? (
            <View style={{ marginTop: 30 }}>
              <EmptyState
                icon="receipt_long"
                tileBg={theme.tile}
                tileFg={theme.accent}
                title="No sales yet today"
                sub="Create your first bill and your daily numbers will appear right here."
              />
            </View>
          ) : (
            <>
              {/* Today's Sales hero */}
              <SummaryCard
                icon="payments"
                tileBg={MetricTiles.bills.bg}
                tileFg={MetricTiles.bills.fg}
                label="Today's Sales"
                value={summary?.todaysSales ?? 0}
                sub={`${summary?.todaysBills ?? 0} bills today`}
                delta="▲ 12%"
              />

              {/* Mini stats */}
              <View style={{ flexDirection: 'row', gap: 11, marginTop: 12 }}>
                <StatTile icon="receipt_long" tileBg={MetricTiles.bills.bg} tileFg={MetricTiles.bills.fg} value={String(summary?.todaysBills ?? 0)} label="Bills" />
                <StatTile icon="account_balance_wallet" tileBg={MetricTiles.pendingKhata.bg} tileFg={MetricTiles.pendingKhata.fg} value={formatINRShort(summary?.pendingKhata ?? 0)} label="Pending Khata" />
                <StatTile icon="inventory_2" tileBg={MetricTiles.lowStock.bg} tileFg={MetricTiles.lowStock.fg} value={String(summary?.lowStock ?? 0)} label="Low Stock" />
              </View>

              {/* Recent activity */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 24,
                  marginBottom: 12,
                  marginHorizontal: 2,
                }}
              >
                <Text style={Type.sectionTitle}>Recent activity</Text>
                <Tap onPress={() => openOverlay('activity')} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Text style={{ fontFamily: Font.bold, fontSize: 13, color: theme.accent }}>View all</Text>
                  <Sym name="chevron_right" size={17} color={theme.accent} />
                </Tap>
              </View>
              {feed.length > 0 ? (
                <Card style={{ paddingVertical: 6, paddingHorizontal: 18 }}>
                  <FlatList
                    data={feed}
                    scrollEnabled={false}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => (
                      <ActivityRow
                        item={item}
                        last={index === feed.length - 1}
                        onPress={(a) => a.billId && openInvoice(a.billId)}
                      />
                    )}
                  />
                </Card>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>

      <PinnedCTA
        label="Create Bill"
        icon="add"
        pageBg={theme.bg}
        onPress={() => {
          cbReset();
          openOverlay('createBill');
        }}
      />
    </SafeAreaView>
  );
}
