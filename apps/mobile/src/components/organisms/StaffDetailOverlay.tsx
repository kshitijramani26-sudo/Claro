import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { OverlayShell } from './OverlayShell';
import { Card } from '@/components/atoms/Card';
import { Avatar } from '@/components/atoms/Avatar';
import { Badge } from '@/components/atoms/Badge';
import { Money } from '@/components/atoms/Money';
import { PrimaryButton, OutlineButton } from '@/components/atoms/Button';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { formatINR } from '@/lib/format';
import { usePageTheme } from '@/theme/pageThemes';
import { Colors, Radius } from '@/theme/tokens';
import { Font, Type, tnum } from '@/theme/typography';
import { useAppStore } from '@/state/store';

/** Staff detail — profile card, 3-col performance, 14-day attendance grid, advances list. */
export function StaffDetailOverlay() {
  const theme = usePageTheme('staff');
  const selStaff = useAppStore((s) => s.selStaff);
  const closeOverlay = useAppStore((s) => s.closeOverlay);
  const flashToast = useAppStore((s) => s.flashToast);
  const refresh = useAppStore((s) => s.refresh);
  const [advanceMode, setAdvanceMode] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState('');

  const { data: members } = useApi(() => api.getStaff());
  const { data: detail, reload } = useApi(() => api.getStaffDetail(selStaff), [selStaff]);
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

  const paySalary = async () => {
    try {
      if (member.advance > 0) {
        await api.addRepayment(member.id, member.advance, 'Adjusted against salary');
        refresh();
        reload();
        flashToast(`Salary paid · advance of ${formatINR(member.advance)} cleared`);
      } else {
        flashToast('Salary paid · ' + formatINR(member.salary));
      }
      closeOverlay();
    } catch (e) {
      flashToast((e as Error).message);
    }
  };

  return (
    <OverlayShell
      title={member.name}
      closeIcon="arrow_back"
      onClose={closeOverlay}
      bg={theme.bg}
      footer={
        advanceMode ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
              value={advanceAmount}
              onChangeText={setAdvanceAmount}
              placeholder="Advance amount (₹)"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              autoFocus
              style={{
                flex: 1,
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
            <OutlineButton label="Cancel" height={52} fontSize={14} onPress={() => setAdvanceMode(false)} />
            <PrimaryButton label="Save" height={52} onPress={recordAdvance} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <OutlineButton
              label="Record Advance"
              icon="payments"
              height={52}
              fontSize={14}
              onPress={() => setAdvanceMode(true)}
              style={{ flex: 1 }}
            />
            <PrimaryButton label="Pay Salary" icon="check_circle" height={52} onPress={paySalary} style={{ flex: 1.2 }} />
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
              {member.role} · ₹{member.salary.toLocaleString('en-IN')}/mo
            </Text>
            {member.advance > 0 ? (
              <Text style={[{ fontFamily: Font.semibold, fontSize: 12, color: Colors.danger, marginTop: 3 }, tnum]}>
                Advance outstanding {formatINR(member.advance)}
              </Text>
            ) : null}
          </View>
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

        {/* Attendance — last 14 days */}
        <Card pad={18}>
          <Text style={[Type.sectionTitle, { marginBottom: 14 }]}>Attendance · last 14 days</Text>
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
