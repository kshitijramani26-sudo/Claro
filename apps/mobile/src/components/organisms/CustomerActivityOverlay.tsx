import { ScrollView, Text, View } from 'react-native';
import { OverlayShell } from './OverlayShell';
import { Card } from '@/components/atoms/Card';
import { Tap } from '@/components/atoms/Tap';
import { ActivityRow } from '@/components/molecules/ActivityRow';
import { EmptyState } from '@/components/molecules/EmptyState';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { usePageTheme } from '@/theme/pageThemes';
import { Type } from '@/theme/typography';
import { useAppStore } from '@/state/store';

/** A customer's full activity — all their bills, credit and payments (A6). */
export function CustomerActivityOverlay() {
  const theme = usePageTheme('billing');
  const target = useAppStore((s) => s.selCustomerActivity);
  const closeOverlay = useAppStore((s) => s.closeOverlay);
  const openInvoice = useAppStore((s) => s.openInvoice);

  const { data, error, reload } = useApi(() => api.getCustomerActivity(target?.id ?? ''), [target?.id]);
  const rows = data ?? [];

  return (
    <OverlayShell title={target?.name ?? 'Activity'} closeIcon="arrow_back" onClose={closeOverlay} bg={theme.bg}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 30 }}>
        <Text style={[Type.sectionTitle, { marginBottom: 12, marginHorizontal: 2 }]}>Full activity</Text>
        {error ? (
          <Tap onPress={reload}>
            <EmptyState icon="cloud_off" tileBg={theme.tile} tileFg={theme.accent} title="Can't reach the server" sub={`${error} — tap to retry.`} />
          </Tap>
        ) : rows.length === 0 ? (
          <EmptyState icon="history" tileBg={theme.tile} tileFg={theme.accent} title="No activity yet" sub="Bills, credit and payments for this customer will appear here." />
        ) : (
          <Card style={{ paddingVertical: 6, paddingHorizontal: 18 }}>
            {rows.map((a, i) => (
              <ActivityRow key={a.id} item={a} last={i === rows.length - 1} onPress={() => a.billId && openInvoice(a.billId)} />
            ))}
          </Card>
        )}
      </ScrollView>
    </OverlayShell>
  );
}
