import { ScrollView } from 'react-native';
import { OverlayShell } from './OverlayShell';
import { Card } from '@/components/atoms/Card';
import { ActivityRow } from '@/components/molecules/ActivityRow';
import { EmptyState } from '@/components/molecules/EmptyState';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { usePageTheme } from '@/theme/pageThemes';
import { useAppStore } from '@/state/store';

/** Full activity list — same row format as the billing feed. */
export function ActivityOverlay() {
  const theme = usePageTheme('billing');
  const closeOverlay = useAppStore((s) => s.closeOverlay);
  const { data } = useApi(() => api.getActivity(50));
  const rows = data ?? [];
  return (
    <OverlayShell title="All activity" closeIcon="arrow_back" onClose={closeOverlay} bg={theme.bg}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 30 }}>
        {rows.length === 0 ? (
          <EmptyState
            icon="receipt_long"
            tileBg={theme.tile}
            tileFg={theme.accent}
            title="No activity yet"
            sub="Bills, credits and settlements will appear here."
          />
        ) : (
          <Card style={{ paddingVertical: 6, paddingHorizontal: 18 }}>
            {rows.map((a, i) => (
              <ActivityRow key={a.id} item={a} last={i === rows.length - 1} />
            ))}
          </Card>
        )}
      </ScrollView>
    </OverlayShell>
  );
}
