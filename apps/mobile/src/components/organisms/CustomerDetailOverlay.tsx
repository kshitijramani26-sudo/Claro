import { Linking, ScrollView, Text, View } from 'react-native';
import { OverlayShell } from './OverlayShell';
import { Card } from '@/components/atoms/Card';
import { Avatar } from '@/components/atoms/Avatar';
import { IconTile } from '@/components/atoms/IconTile';
import { Money } from '@/components/atoms/Money';
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
  const closeOverlay = useAppStore((s) => s.closeOverlay);
  const openSettle = useAppStore((s) => s.openSettle);
  const flashToast = useAppStore((s) => s.flashToast);

  const { data: customers } = useApi(() => api.getKhata());
  const { data: timelineData } = useApi(() => api.getKhataTimeline(selCustomer), [selCustomer]);
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
      </ScrollView>
    </OverlayShell>
  );
}
