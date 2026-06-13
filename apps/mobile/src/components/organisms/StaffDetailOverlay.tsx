import { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { OverlayShell } from './OverlayShell';
import { BottomSheet } from './BottomSheet';
import { Card } from '@/components/atoms/Card';
import { Avatar } from '@/components/atoms/Avatar';
import { Badge } from '@/components/atoms/Badge';
import { Money } from '@/components/atoms/Money';
import { Sym } from '@/components/atoms/Icon';
import { Tap } from '@/components/atoms/Tap';
import { SegmentedControl } from '@/components/atoms/SegmentedControl';
import { PrimaryButton, OutlineButton } from '@/components/atoms/Button';
import { api } from '@/lib/api';
import type { StaffMember } from '@/data/types';
import { useApi } from '@/lib/useApi';
import { formatINR } from '@/lib/format';
import { usePageTheme } from '@/theme/pageThemes';
import { Colors, Radius } from '@/theme/tokens';
import { Font, Type, tnum } from '@/theme/typography';
import { useAppStore } from '@/state/store';

const ATT_RANGES = [
  { key: '14', label: 'Last 2 weeks' },
  { key: '31', label: 'Last month' },
] as const;

/** Staff detail — profile, salary, performance, attendance grid (2wk/month), advances. */
export function StaffDetailOverlay() {
  const theme = usePageTheme('staff');
  const selStaff = useAppStore((s) => s.selStaff);
  const closeOverlay = useAppStore((s) => s.closeOverlay);
  const flashToast = useAppStore((s) => s.flashToast);
  const refresh = useAppStore((s) => s.refresh);
  const [advanceMode, setAdvanceMode] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [attDays, setAttDays] = useState<14 | 31>(14);
  const [editing, setEditing] = useState(false);

  const { data: members } = useApi(() => api.getStaff());
  const { data: detail, reload } = useApi(() => api.getStaffDetail(selStaff, attDays), [selStaff, attDays]);
  const member = (members ?? []).find((m) => m.id === selStaff);

  if (!member) {
    return (
      <OverlayShell title="Staff" closeIcon="arrow_back" onClose={closeOverlay} bg={theme.bg}>
        <View />
      </OverlayShell>
    );
  }

  const firstName = member.name.split(' ')[0];

  const recordAdvance = async () => {
    const amt = parseFloat(advanceAmount);
    if (!(amt > 0)) {
      flashToast('Enter an advance amount');
      return;
    }
    try {
      await api.addAdvance(member.id, amt, 'Advance');
      refresh();
      reload();
      setAdvanceMode(false);
      setAdvanceAmount('');
      flashToast('Advance recorded for ' + firstName);
    } catch (e) {
      flashToast((e as Error).message);
    }
  };

  const remaining = detail?.remainingSalary ?? Math.max(0, member.salary - member.advance);
  const paidThisMonth = detail?.paidThisMonth ?? false;

  const paySalary = async () => {
    try {
      await api.payStaffSalary(member.id);
      refresh();
      reload();
      flashToast(`Salary paid · ${formatINR(remaining)} to ${firstName}`);
      closeOverlay();
    } catch (e) {
      flashToast((e as Error).message);
    }
  };

  return (
    <>
    <OverlayShell
      title={member.name}
      closeIcon="arrow_back"
      onClose={closeOverlay}
      bg={theme.bg}
      footer={
        advanceMode ? (
          <View style={{ gap: 10 }}>
            <TextInput
              value={advanceAmount}
              onChangeText={setAdvanceAmount}
              placeholder="Advance amount (₹)"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              autoFocus
              style={{
                height: 52,
                borderRadius: Radius.tile,
                borderWidth: 1.5,
                borderColor: theme.accent,
                backgroundColor: Colors.inputBg,
                paddingHorizontal: 14,
                fontFamily: Font.semibold,
                fontSize: 14.5,
                color: Colors.textPrimary,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <OutlineButton
                label="Cancel"
                height={52}
                fontSize={14}
                onPress={() => { setAdvanceMode(false); setAdvanceAmount(''); }}
                style={{ flex: 1 }}
              />
              <PrimaryButton label="Save advance" height={52} onPress={recordAdvance} style={{ flex: 1.4 }} />
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <OutlineButton
              label="Record Advance"
              icon="savings"
              height={52}
              fontSize={14}
              onPress={() => setAdvanceMode(true)}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              label={paidThisMonth ? 'Salary paid' : 'Pay Salary'}
              icon="check_circle"
              height={52}
              disabled={paidThisMonth}
              onPress={paySalary}
              style={{ flex: 1.2 }}
            />
          </View>
        )
      }
    >
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 30, gap: 14 }}>
        {/* Profile */}
        <Card pad={24} style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Avatar initials={member.initials} size={58} bg={theme.tile} color={theme.accent} fontSize={18} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: Font.extrabold, fontSize: 18, color: Colors.textPrimary }}>{member.name}</Text>
            <Text style={{ fontFamily: Font.medium, fontSize: 12.5, color: Colors.textSecondary, marginTop: 2 }}>
              {member.role || 'No role set'}{member.phone ? ` · ${member.phone}` : ''}
            </Text>
            {member.advance > 0 ? (
              <Text style={[{ fontFamily: Font.semibold, fontSize: 12, color: Colors.danger, marginTop: 3 }, tnum]}>
                Advance outstanding {formatINR(member.advance)}
              </Text>
            ) : null}
          </View>
          <Tap
            onPress={() => setEditing(true)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, height: 34,
              borderRadius: Radius.pill, backgroundColor: theme.tile,
            }}
          >
            <Sym name="edit_note" size={17} color={theme.accent} />
            <Text style={{ fontFamily: Font.bold, fontSize: 12.5, color: theme.accent }}>Edit</Text>
          </Tap>
        </Card>

        {/* Salary — remaining to pay this month */}
        <Card pad={18} style={{ gap: 10 }}>
          <Text style={Type.sectionTitle}>Salary</Text>
          <SalaryRow label="Monthly salary" value={formatINR(member.salary)} />
          <SalaryRow label="Advance outstanding" value={member.advance > 0 ? `− ${formatINR(member.advance)}` : formatINR(0)} color={member.advance > 0 ? Colors.danger : undefined} />
          <View style={{ height: 1, backgroundColor: Colors.divider }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: Font.bold, fontSize: 14, color: Colors.textPrimary }}>Remaining to pay</Text>
            <Money value={remaining} style={[{ fontFamily: Font.extrabold, fontSize: 20, color: paidThisMonth ? Colors.textMuted : theme.accent }, tnum]} />
          </View>
          {paidThisMonth ? (
            <Text style={{ fontFamily: Font.semibold, fontSize: 12, color: Colors.success }}>✓ Salary paid for this month</Text>
          ) : (
            <Text style={{ fontFamily: Font.medium, fontSize: 11.5, color: Colors.textMuted }}>
              Any advance is adjusted against salary; next month starts fresh.
            </Text>
          )}
        </Card>

        {/* Performance */}
        <Card pad={18}>
          <Text style={[Type.sectionTitle, { marginBottom: 14 }]}>Performance</Text>
          <View style={{ flexDirection: 'row' }}>
            <PerfCol label="Sales driven" value={formatINR(detail?.pnl.sales ?? 0)} />
            <View style={{ width: 1, backgroundColor: Colors.divider }} />
            <PerfCol label="Bills" value={String(detail?.pnl.bills ?? 0)} />
            <View style={{ width: 1, backgroundColor: Colors.divider }} />
            <PerfCol label="Avg bill" value={formatINR(detail?.pnl.avg ?? 0)} />
          </View>
        </Card>

        {/* Attendance — 2 weeks / month */}
        <Card pad={18}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={Type.sectionTitle}>Attendance</Text>
            <Text style={[{ fontFamily: Font.semibold, fontSize: 12, color: Colors.textSecondary }, tnum]}>
              {(detail?.attendance ?? []).filter(Boolean).length}/{(detail?.attendance ?? []).length} present
            </Text>
          </View>
          <View style={{ marginBottom: 14 }}>
            <SegmentedControl
              options={[...ATT_RANGES]}
              value={String(attDays)}
              onChange={(v) => setAttDays(Number(v) as 14 | 31)}
              accent={theme.accent}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {(detail?.attendance ?? []).map((present, i) => (
              <View
                key={i}
                style={{
                  width: 18,
                  height: 26,
                  borderRadius: 5,
                  backgroundColor: present ? Colors.success : Colors.attendanceAbsent,
                }}
              />
            ))}
          </View>
        </Card>

        {/* Advances & loans */}
        {(detail?.advances ?? []).length > 0 ? (
          <Card style={{ paddingVertical: 6, paddingHorizontal: 18 }}>
            <Text style={[Type.sectionTitle, { paddingVertical: 12 }]}>Advances & loans</Text>
            {(detail?.advances ?? []).map((a) => (
              <View
                key={a.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 14,
                  borderTopWidth: 1,
                  borderTopColor: Colors.divider,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: Font.bold, fontSize: 14.5, color: Colors.textPrimary }}>{a.label}</Text>
                  <Text style={{ fontFamily: Font.medium, fontSize: 12, color: Colors.textMuted, marginTop: 2 }}>{a.date}</Text>
                </View>
                <Money value={a.amount} style={[{ fontFamily: Font.extrabold, fontSize: 15, color: Colors.textPrimary }, tnum]} />
                <Badge
                  label={a.repaid ? 'Repaid' : 'Outstanding'}
                  bg={a.repaid ? Colors.successTile : Colors.dangerTile}
                  fg={a.repaid ? Colors.success : Colors.danger}
                  fontSize={11}
                />
              </View>
            ))}
          </Card>
        ) : null}
      </ScrollView>
    </OverlayShell>
    {editing ? (
      <StaffEditSheet
        member={member}
        accent={theme.accent}
        onClose={() => setEditing(false)}
        onSaved={() => { setEditing(false); refresh(); reload(); }}
        onDeleted={() => { setEditing(false); refresh(); closeOverlay(); }}
      />
    ) : null}
    </>
  );
}

function StaffEditSheet({ member, accent, onClose, onSaved, onDeleted }: {
  member: StaffMember; accent: string; onClose: () => void; onSaved: () => void; onDeleted: () => void;
}) {
  const flashToast = useAppStore((s) => s.flashToast);
  const [name, setName] = useState(member.name);
  const [role, setRole] = useState(member.role);
  const [phone, setPhone] = useState(member.phone);
  const [salary, setSalary] = useState(String(member.salary));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) { flashToast('Name is required'); return; }
    setSaving(true);
    try {
      await api.patchStaff(member.id, { name: name.trim(), role: role.trim(), phone: phone.trim(), salaryRupees: parseFloat(salary) || 0 });
      onSaved();
    } catch (e) { flashToast((e as Error).message); setSaving(false); }
  };

  const remove = () => {
    Alert.alert('Remove staff member?', `${member.name} will be removed from your records. This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try { await api.deleteStaff(member.id); flashToast('Staff removed'); onDeleted(); }
        catch (e) { flashToast((e as Error).message); }
      } },
    ]);
  };

  const fieldStyle = { height: 52, borderRadius: Radius.tile, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.inputBg, paddingHorizontal: 14, fontFamily: Font.semibold, fontSize: 14.5, color: Colors.textPrimary } as const;

  return (
    <BottomSheet title="Edit staff details" onClose={onClose}>
      <View style={{ gap: 12 }}>
        <TextInput value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor={Colors.textMuted} style={fieldStyle} />
        <TextInput value={role} onChangeText={setRole} placeholder="Role (e.g. Cashier)" placeholderTextColor={Colors.textMuted} style={fieldStyle} />
        <TextInput value={phone} onChangeText={setPhone} placeholder="Phone number" placeholderTextColor={Colors.textMuted} keyboardType="phone-pad" style={fieldStyle} />
        <TextInput value={salary} onChangeText={setSalary} placeholder="Monthly salary (₹)" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" style={fieldStyle} />
        <PrimaryButton label={saving ? 'Saving…' : 'Save changes'} disabled={saving} onPress={save} style={{ marginTop: 4 }} />
        <Tap onPress={remove} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 46 }}>
          <Sym name="delete" size={18} color={Colors.danger} />
          <Text style={{ fontFamily: Font.bold, fontSize: 14, color: Colors.danger }}>Remove staff member</Text>
        </Tap>
      </View>
    </BottomSheet>
  );
}

function SalaryRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ fontFamily: Font.medium, fontSize: 13.5, color: Colors.textSecondary }}>{label}</Text>
      <Text style={[{ fontFamily: Font.bold, fontSize: 14, color: color ?? Colors.textPrimary }, tnum]}>{value}</Text>
    </View>
  );
}

function PerfCol({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
      <Text style={[{ fontFamily: Font.extrabold, fontSize: 21, letterSpacing: -0.4, color: Colors.textPrimary }, tnum]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={{ fontFamily: Font.medium, fontSize: 11.5, color: Colors.textSecondary }}>{label}</Text>
    </View>
  );
}
