import { Linking, ScrollView, Text, View } from 'react-native';
import { OverlayShell } from './OverlayShell';
import { Card } from '@/components/atoms/Card';
import { Avatar } from '@/components/atoms/Avatar';
import { IconTile } from '@/components/atoms/IconTile';
import { Money } from '@/components/atoms/Money';
import { Tap } from '@/components/atoms/Tap';
import { PrimaryButton, OutlineButton } from '@/components/atoms/Button';
import { WhatsAppIcon } from '@/components/atoms/WhatsAppIcon';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { formatINR } from '@/lib/format';
import { usePageTheme } from '@/theme/pageThemes';
import { Colors, KindTiles } from '@/theme/tokens';
import { Font, tnum } from '@/theme/typography';
import { useAppStore } from '@/state/store';

/** Customer detail — header card + running-balance timeline + Remind / Settle Up footer. */
export function CustomerDetailOverlay() {
  const theme = usePageTheme('khata');
  const selCustomer = useAppStore((s) => s.selCustomer);
  const business = useAppStore((s) => s.business);
  const closeOverlay = useAppStore((s) => s.closeOverlay);
  const openSettle = useAppStore((s) => s.openSettle);
  const flashToast = useAppStore((s) => s.flashToast);

  const { data: customers } = useApi(() => api.getKhata());
  const { data: timelineData } = useApi(() => api.getKhataTimeline(selCustomer), [selCustomer]);
  const { data: rxHistory } = useApi(() => api.getPrescriptions(selCustomer ?? ''), [selCustomer]);
  const customer = (customers ?? []).find((k) => k.id === selCustomer);
  const timeline = timelineData ?? [];

  // Running balance, prototype logic: accumulate oldest → newest.
  let bal = 0;
  const balances: Record<string, number> = {};
  [...timeline].reverse().forEach((t) => {
    bal += t.debit - t.credit;
    balances[t.id] = bal;
  });

  if (!customer) {
    return (
      <OverlayShell title="Customer" closeIcon="arrow_back" onClose={closeOverlay} bg={theme.bg}>
        <View />
      </OverlayShell>
    );
  }

  const remind = async () => {
    try {
      const { waUrl } = await api.getReminder(customer.id);
      await Linking.openURL(waUrl);
    } catch {
      flashToast('Could not open WhatsApp');
    }
  };

  return (
    <OverlayShell
      title={customer.name}
      closeIcon="arrow_back"
      onClose={closeOverlay}
      bg={theme.bg}
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <OutlineButton
            label="Remind"
            iconNode={<WhatsAppIcon size={18} />}
            height={52}
            fontSize={14}
            onPress={remind}
            style={{ flex: 1 }}
          />
          <PrimaryButton label="Settle Up" height={52} onPress={() => openSettle(customer.id, customer.name, customer.amount)} style={{ flex: 1.4 }} />
        </View>
      }
    >
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 30, gap: 14 }}>
        {/* Header card */}
        <Card pad={24} style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Avatar initials={customer.initials} size={58} bg={theme.tile} color={theme.accent} fontSize={18} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: Font.extrabold, fontSize: 18, color: Colors.textPrimary }}>{customer.name}</Text>
            <Text style={[{ fontFamily: Font.medium, fontSize: 12.5, color: Colors.textSecondary, marginTop: 2 }, tnum]}>
              +91 {customer.phone}
            </Text>
          </View>
          <Money
            value={customer.amount}
            style={[{ fontFamily: Font.extrabold, fontSize: 28, letterSpacing: -0.6, color: Colors.danger }, tnum]}
          />
        </Card>

        {/* Timeline */}
        {timeline.length > 0 ? (
          <Card style={{ paddingVertical: 6, paddingHorizontal: 18 }}>
            {timeline.map((t, i) => {
              const isDebit = t.debit > 0;
              const tile = isDebit ? KindTiles.credit : KindTiles.sale;
              return (
                <View
                  key={t.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 13,
                    paddingVertical: 14,
                    borderBottomWidth: i === timeline.length - 1 ? 0 : 1,
                    borderBottomColor: Colors.divider,
                  }}
                >
                  <IconTile name={isDebit ? 'north_east' : 'south_west'} bg={tile.bg} fg={tile.fg} size={40} iconSize={20} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: Font.bold, fontSize: 14.5, color: Colors.textPrimary }}>{t.label}</Text>
                    <Text style={[{ fontFamily: Font.medium, fontSize: 12, color: Colors.textMuted, marginTop: 2 }, tnum]}>
                      {t.date} · Balance {formatINR(balances[t.id] ?? 0)}
                    </Text>
                  </View>
                  <Money
                    value={isDebit ? t.debit : t.credit}
                    prefix={isDebit ? '+' : '−'}
                    style={[{ fontFamily: Font.extrabold, fontSize: 15, color: isDebit ? Colors.danger : Colors.success }, tnum]}
                  />
                </View>
              );
            })}
          </Card>
        ) : null}

        {/* Prescriptions History */}
        {business?.industry === 'Optical' && rxHistory && rxHistory.length > 0 ? (
          <View style={{ gap: 8, marginTop: 6 }}>
            <Text style={{ fontFamily: Font.bold, fontSize: 15, color: Colors.textPrimary, marginLeft: 2 }}>
              Prescription (Rx) History
            </Text>
            <Card style={{ paddingHorizontal: 18, paddingVertical: 6 }}>
              {rxHistory.map((rx, i) => (
                <View
                  key={rx.id}
                  style={{
                    paddingVertical: 12,
                    borderBottomWidth: i === rxHistory.length - 1 ? 0 : 1,
                    borderBottomColor: Colors.divider,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ fontFamily: Font.bold, fontSize: 13.5, color: Colors.textPrimary }}>
                      {rx.date ? new Date(rx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Rx Date'}
                    </Text>
                    {rx.billId && (
                      <Tap
                        onPress={() => useAppStore.getState().openInvoice(rx.billId!)}
                        style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: theme.tile }}
                      >
                        <Text style={{ fontFamily: Font.bold, fontSize: 11, color: theme.accent }}>View Invoice</Text>
                      </Tap>
                    )}
                  </View>
                  
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {rx.rDistSph || rx.rDistCyl ? (
                      <Text style={{ fontFamily: Font.medium, fontSize: 12, color: Colors.textSecondary }}>
                        R: <Text style={{ fontFamily: Font.bold, color: Colors.textPrimary }}>{rx.rDistSph || '0.00'}/{rx.rDistCyl || '0.00'}</Text>
                      </Text>
                    ) : null}
                    {rx.lDistSph || rx.lDistCyl ? (
                      <Text style={{ fontFamily: Font.medium, fontSize: 12, color: Colors.textSecondary }}>
                        L: <Text style={{ fontFamily: Font.bold, color: Colors.textPrimary }}>{rx.lDistSph || '0.00'}/{rx.lDistCyl || '0.00'}</Text>
                      </Text>
                    ) : null}
                    {rx.addR || rx.addL ? (
                      <Text style={{ fontFamily: Font.medium, fontSize: 12, color: Colors.textSecondary }}>
                        Add: <Text style={{ fontFamily: Font.bold, color: Colors.textPrimary }}>{rx.addR || rx.addL}</Text>
                      </Text>
                    ) : null}
                  </View>
                  {rx.remarks ? (
                    <Text style={{ fontFamily: Font.medium, fontSize: 12, color: Colors.textMuted, marginTop: 4, fontStyle: 'italic' }}>
                      Remarks: {rx.remarks}
                    </Text>
                  ) : null}
                </View>
              ))}
            </Card>
          </View>
        ) : null}
      </ScrollView>
    </OverlayShell>
  );
}
