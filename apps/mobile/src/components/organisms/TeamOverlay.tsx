import { useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { PrimaryButton, OutlineButton } from '@/components/atoms/Button';
import { Tap } from '@/components/atoms/Tap';
import { Avatar } from '@/components/atoms/Avatar';
import { Sym } from '@/components/atoms/Icon';
import { SegmentedControl } from '@/components/atoms/SegmentedControl';
import { EmptyState } from '@/components/molecules/EmptyState';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { Colors, Radius } from '@/theme/tokens';
import { Font } from '@/theme/typography';
import { useAppStore, useBrand } from '@/state/store';
import type { Role, TeamMember } from '@/data/types';

const ROLE_BADGE: Record<Role, { bg: string; fg: string; label: string }> = {
  owner: { bg: '#2D1150', fg: '#FFFFFF', label: 'Owner' },
  co_owner: { bg: '#ECE6F4', fg: '#2D1150', label: 'Co-owner' },
  staff: { bg: Colors.neutralTile, fg: Colors.textSecondary, label: 'Staff' },
};

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('') || '?';
}

function maskPhone(p: string): string {
  const d = p.replace(/\D/g, '').slice(-10);
  return d.length === 10 ? `${d.slice(0, 5)} ${d.slice(5)}` : p;
}

/** Settings → Team. Owner manages co-owners + staff; co-owner manages staff only. */
export function TeamOverlay() {
  const brand = useBrand();
  const closeOverlay = useAppStore((s) => s.closeOverlay);
  const flashToast = useAppStore((s) => s.flashToast);
  const myRole = useAppStore((s) => s.business?.role ?? 'owner');
  const { data, reload } = useApi(() => api.getTeam());
  const members = data ?? [];

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'co_owner' | 'staff'>(myRole === 'owner' ? 'co_owner' : 'staff');
  const [saving, setSaving] = useState(false);

  const roleOptions = myRole === 'owner'
    ? [{ key: 'co_owner', label: 'Co-owner' }, { key: 'staff', label: 'Staff' }]
    : [{ key: 'staff', label: 'Staff' }];

  const add = async () => {
    if (!name.trim()) return flashToast('Enter a name');
    if (phone.replace(/\D/g, '').length < 10) return flashToast('Enter a valid 10-digit phone');
    setSaving(true);
    try {
      await api.addMember({ name: name.trim(), phone, role });
      setName(''); setPhone(''); setAdding(false);
      reload();
      flashToast('Invitation added — they log in with this number');
    } catch (e) {
      flashToast((e as Error).message);
    }
    setSaving(false);
  };

  const remove = (m: TeamMember) => {
    Alert.alert('Remove member?', `${m.name} will lose access to ${m.role === 'co_owner' ? 'this business' : 'the app'}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try { await api.removeMember(m.id); reload(); flashToast('Member removed'); }
          catch (e) { flashToast((e as Error).message); }
        },
      },
    ]);
  };

  const canRemove = (m: TeamMember) =>
    m.role !== 'owner' && !m.isSelf && (myRole === 'owner' || m.role === 'staff');

  return (
    <BottomSheet title="Team" onClose={closeOverlay}>
      <View style={{ gap: 10 }}>
        {members.map((m) => {
          const b = ROLE_BADGE[m.role];
          return (
            <View
              key={m.id}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10,
                borderBottomWidth: 1, borderBottomColor: Colors.rowDivider,
              }}
            >
              <Avatar initials={initials(m.name)} size={42} bg={brand.tint} color={brand.brand} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: Font.bold, fontSize: 15, color: Colors.textPrimary }}>
                  {m.name}{m.isSelf ? ' (you)' : ''}
                </Text>
                <Text style={{ fontFamily: Font.medium, fontSize: 12.5, color: Colors.textSecondary, marginTop: 1 }}>
                  {maskPhone(m.phone)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <View style={{ backgroundColor: b.bg, borderRadius: Radius.badge, paddingHorizontal: 9, paddingVertical: 3 }}>
                  <Text style={{ fontFamily: Font.bold, fontSize: 11, color: b.fg }}>{b.label}</Text>
                </View>
                {m.role !== 'owner' ? (
                  <Text style={{ fontFamily: Font.semibold, fontSize: 10.5, color: m.status === 'active' ? Colors.success : Colors.warning }}>
                    {m.status === 'active' ? 'Active' : 'Invited'}
                  </Text>
                ) : null}
              </View>
              {canRemove(m) ? (
                <Tap onPress={() => remove(m)} hitSlop={8} style={{ paddingLeft: 4 }}>
                  <Sym name="delete" size={19} color={Colors.textMuted} />
                </Tap>
              ) : null}
            </View>
          );
        })}

        {members.length <= 1 && !adding ? (
          <View style={{ paddingVertical: 6 }}>
            <EmptyState
              icon="groups"
              tileBg={brand.tint}
              tileFg={brand.brand}
              title="Just you, for now"
              sub="Add a co-owner or staff to share billing and khata. They log in with their phone number."
            />
          </View>
        ) : null}

        {adding ? (
          <View style={{ gap: 10, marginTop: 6, padding: 14, borderRadius: Radius.card, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.inputBg }}>
            <TextInput
              value={name} onChangeText={setName} placeholder="Member name" placeholderTextColor={Colors.textMuted}
              style={{ height: 46, borderRadius: Radius.btnSm, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.canvas, paddingHorizontal: 14, fontFamily: Font.semibold, fontSize: 14.5, color: Colors.textPrimary }}
            />
            <TextInput
              value={phone} onChangeText={setPhone} placeholder="Phone number" placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              style={{ height: 46, borderRadius: Radius.btnSm, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.canvas, paddingHorizontal: 14, fontFamily: Font.semibold, fontSize: 14.5, color: Colors.textPrimary }}
            />
            {roleOptions.length > 1 ? (
              <SegmentedControl options={roleOptions} value={role} onChange={(v) => setRole(v as 'co_owner' | 'staff')} accent={brand.brand} />
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <OutlineButton label="Cancel" onPress={() => setAdding(false)} style={{ flex: 1 }} />
              <PrimaryButton label={saving ? 'Adding…' : 'Add member'} disabled={saving} onPress={add} style={{ flex: 1 }} />
            </View>
          </View>
        ) : (
          <PrimaryButton label="Add member" icon="add" onPress={() => setAdding(true)} style={{ marginTop: 8 }} />
        )}
      </View>
    </BottomSheet>
  );
}
