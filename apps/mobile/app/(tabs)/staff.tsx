import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Tap } from '@/components/atoms/Tap';
import { StaffRow } from '@/components/molecules/StaffRow';
import { EmptyState } from '@/components/molecules/EmptyState';
import { DemoToggle } from '@/components/organisms/DemoToggle';
import { PinnedCTA } from '@/components/organisms/PinnedCTA';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { usePageTheme } from '@/theme/pageThemes';
import { Colors } from '@/theme/tokens';
import { Font, Type } from '@/theme/typography';
import { useAppStore } from '@/state/store';

/** Tab 4 — Staff. Present/Absent is an optimistic local override + API write. */
export default function Staff() {
  const theme = usePageTheme('staff');
  const insets = useSafeAreaInsets();
  const emptyMode = useAppStore((s) => s.emptyMode);
  const presence = useAppStore((s) => s.presence);
  const togglePresent = useAppStore((s) => s.togglePresent);
  const openStaff = useAppStore((s) => s.openStaff);
  const openOverlay = useAppStore((s) => s.openOverlay);
  const flashToast = useAppStore((s) => s.flashToast);

  const { data, loading, error, reload } = useApi(() => api.getStaff());
  const members = emptyMode ? [] : (data ?? []);
  const isPresent = (id: string, base: boolean) => presence[id] ?? base;
  const presentCount = members.filter((m) => isPresent(m.id, m.present)).length;

  const toggle = async (id: string, base: boolean) => {
    const next = !isPresent(id, base);
    togglePresent(id, base); // optimistic flip
    try {
      await api.markAttendance(id, next);
    } catch (e) {
      togglePresent(id, base); // revert on failure
      flashToast((e as Error).message);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, paddingBottom: 16 }}>
          <View>
            <Text style={Type.screenTitle}>Staff</Text>
            {members.length > 0 ? (
              <Text style={{ fontFamily: Font.medium, fontSize: 13, color: Colors.textSecondary, marginTop: 2 }}>
                <Text style={{ fontFamily: Font.bold, color: Colors.success }}>{presentCount}</Text> of {members.length}{' '}
                present today
              </Text>
            ) : null}
          </View>
          <DemoToggle />
        </View>

        {error ? (
          <Tap onPress={reload}>
            <EmptyState icon="cloud_off" tileBg={theme.tile} tileFg={theme.accent} title="Can't reach the server" sub={`${error} — tap to retry.`} />
          </Tap>
        ) : loading && members.length === 0 ? null : members.length === 0 ? (
          <EmptyState
            icon="groups"
            tileBg={theme.tile}
            tileFg={theme.accent}
            title="No staff yet"
            sub="Add your team to track attendance, advances and sales per person."
          />
        ) : (
          <View style={{ gap: 12 }}>
            {members.map((m) => (
              <StaffRow
                key={m.id}
                member={m}
                present={isPresent(m.id, m.present)}
                accent={theme.accent}
                tile={theme.tile}
                onPress={() => openStaff(m.id)}
                onToggle={() => toggle(m.id, m.present)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <PinnedCTA label="Add Staff" icon="add" pageBg={theme.bg} onPress={() => openOverlay('addStaff')} />
    </SafeAreaView>
  );
}
