import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { OverlayShell } from './OverlayShell';
import { Card } from '@/components/atoms/Card';
import { Sym } from '@/components/atoms/Icon';
import { Tap } from '@/components/atoms/Tap';
import { Avatar } from '@/components/atoms/Avatar';
import { Money } from '@/components/atoms/Money';
import { EmptyState } from '@/components/molecules/EmptyState';
import { api } from '@/lib/api';
import { usePageTheme } from '@/theme/pageThemes';
import { Colors, Radius } from '@/theme/tokens';
import { Font, tnum } from '@/theme/typography';
import { useAppStore } from '@/state/store';
import type { CustomerHit } from '@/data/types';

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('') || '?';

/** Home search — find a customer, then open their full activity page (A6). */
export function SearchOverlay() {
  const theme = usePageTheme('billing');
  const closeOverlay = useAppStore((s) => s.closeOverlay);
  const openCustomerActivity = useAppStore((s) => s.openCustomerActivity);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<CustomerHit[]>([]);
  const [focused, setFocused] = useState(true);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      api.searchCustomers(query.trim()).then((r) => { if (alive) setHits(r); }).catch(() => undefined);
    }, 220);
    return () => { alive = false; clearTimeout(t); };
  }, [query]);

  return (
    <OverlayShell title="Search customers" closeIcon="arrow_back" onClose={closeOverlay} bg={theme.bg}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
        {/* Search bar */}
        <View
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, borderRadius: Radius.btn,
            borderWidth: 1.5, borderColor: focused ? theme.accent : Colors.border, backgroundColor: Colors.canvas,
            paddingHorizontal: 14, marginBottom: 16,
          }}
        >
          <Sym name="search" size={21} color={Colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name or phone…"
            placeholderTextColor={Colors.textMuted}
            autoFocus
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{ flex: 1, fontFamily: Font.semibold, fontSize: 14.5, color: Colors.textPrimary }}
          />
        </View>

        {hits.length === 0 ? (
          <EmptyState
            icon="person_search"
            tileBg={theme.tile}
            tileFg={theme.accent}
            title={query ? 'No customers found' : 'Find a customer'}
            sub={query ? 'Try a different name or phone number.' : 'Type a name to see their bills, credit and payments.'}
          />
        ) : (
          <Card style={{ paddingVertical: 6, paddingHorizontal: 16 }}>
            {hits.map((c, i) => (
              <Tap
                key={c.id}
                onPress={() => openCustomerActivity(c.id, c.name, c.phone, c.outstanding)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12,
                  borderBottomWidth: i === hits.length - 1 ? 0 : 1, borderBottomColor: Colors.divider,
                }}
              >
                <Avatar initials={initials(c.name)} size={42} bg={theme.tile} color={theme.accent} fontSize={14} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: Font.bold, fontSize: 14.5, color: Colors.textPrimary }} numberOfLines={1}>{c.name}</Text>
                  <Text style={[{ fontFamily: Font.medium, fontSize: 12.5, color: Colors.textSecondary, marginTop: 1 }, tnum]} numberOfLines={1}>
                    {c.phone || 'No phone'}
                  </Text>
                </View>
                {c.outstanding > 0 ? (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Money value={c.outstanding} style={[{ fontFamily: Font.extrabold, fontSize: 14.5, color: Colors.danger }, tnum]} />
                    <Text style={{ fontFamily: Font.semibold, fontSize: 10.5, color: Colors.textMuted }}>outstanding</Text>
                  </View>
                ) : null}
                <Sym name="chevron_right" size={18} color={Colors.textMuted} />
              </Tap>
            ))}
          </Card>
        )}
      </ScrollView>
    </OverlayShell>
  );
}
