import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { OverlayShell } from './OverlayShell';
import { Card } from '@/components/atoms/Card';
import { Tap } from '@/components/atoms/Tap';
import { ActivityRow } from '@/components/molecules/ActivityRow';
import { EmptyState } from '@/components/molecules/EmptyState';
import { Sym } from '@/components/atoms/Icon';
import { PrimaryButton } from '@/components/atoms/Button';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { usePageTheme } from '@/theme/pageThemes';
import { Colors, Radius } from '@/theme/tokens';
import { Font, Type, tnum } from '@/theme/typography';
import { useAppStore } from '@/state/store';
import type { PrescriptionResult } from '@/data/types';

/** A customer's full activity — all their bills, credit and payments (A6). */
export function CustomerActivityOverlay() {
  const theme = usePageTheme('billing');
  const target = useAppStore((s) => s.selCustomerActivity);
  const business = useAppStore((s) => s.business);
  const closeOverlay = useAppStore((s) => s.closeOverlay);
  const openInvoice = useAppStore((s) => s.openInvoice);
  const flashToast = useAppStore((s) => s.flashToast);

  const { data, error, reload } = useApi(() => api.getCustomerActivity(target?.id ?? ''), [target?.id]);
  const { data: latestRx, reload: reloadRx } = useApi(() => api.getLatestPrescription(target?.id ?? ''), [target?.id]);
  const rows = data ?? [];

  // Prescription edit modal state
  const [rxModalOpen, setRxModalOpen] = useState(false);
  const [savingRx, setSavingRx] = useState(false);

  // Eye prescription fields state
  const [rDistSph, setRDistSph] = useState('');
  const [rDistCyl, setRDistCyl] = useState('');
  const [rDistAxis, setRDistAxis] = useState('');
  const [rDistVn, setRDistVn] = useState('');

  const [rNearSph, setRNearSph] = useState('');
  const [rNearCyl, setRNearCyl] = useState('');
  const [rNearAxis, setRNearAxis] = useState('');
  const [rNearVn, setRNearVn] = useState('');

  const [lDistSph, setLDistSph] = useState('');
  const [lDistCyl, setLDistCyl] = useState('');
  const [lDistAxis, setLDistAxis] = useState('');
  const [lDistVn, setLDistVn] = useState('');

  const [lNearSph, setLNearSph] = useState('');
  const [lNearCyl, setLNearCyl] = useState('');
  const [lNearAxis, setLNearAxis] = useState('');
  const [lNearVn, setLNearVn] = useState('');

  const [addR, setAddR] = useState('');
  const [addL, setAddL] = useState('');
  const [pd, setPd] = useState('');
  const [remarks, setRemarks] = useState('');
  const [lensTypes, setLensTypes] = useState<string[]>([]);

  useEffect(() => {
    if (rxModalOpen && latestRx) {
      setRDistSph(latestRx.rDistSph || '');
      setRDistCyl(latestRx.rDistCyl || '');
      setRDistAxis(latestRx.rDistAxis ? String(latestRx.rDistAxis) : '');
      setRDistVn(latestRx.rDistVn || '');
      setRNearSph(latestRx.rNearSph || '');
      setRNearCyl(latestRx.rNearCyl || '');
      setRNearAxis(latestRx.rNearAxis ? String(latestRx.rNearAxis) : '');
      setRNearVn(latestRx.rNearVn || '');
      
      setLDistSph(latestRx.lDistSph || '');
      setLDistCyl(latestRx.lDistCyl || '');
      setLDistAxis(latestRx.lDistAxis ? String(latestRx.lDistAxis) : '');
      setLDistVn(latestRx.lDistVn || '');
      setLNearSph(latestRx.lNearSph || '');
      setLNearCyl(latestRx.lNearCyl || '');
      setLNearAxis(latestRx.lNearAxis ? String(latestRx.lNearAxis) : '');
      setLNearVn(latestRx.lNearVn || '');

      setAddR(latestRx.addR || '');
      setAddL(latestRx.addL || '');
      setPd(latestRx.pd || '');
      setRemarks(latestRx.remarks || '');
      setLensTypes(latestRx.lensTypes || []);
    } else if (rxModalOpen) {
      setRDistSph(''); setRDistCyl(''); setRDistAxis(''); setRDistVn('');
      setRNearSph(''); setRNearCyl(''); setRNearAxis(''); setRNearVn('');
      setLDistSph(''); setLDistCyl(''); setLDistAxis(''); setLDistVn('');
      setLNearSph(''); setLNearCyl(''); setLNearAxis(''); setLNearVn('');
      setAddR(''); setAddL(''); setPd(''); setRemarks(''); setLensTypes([]);
    }
  }, [rxModalOpen, latestRx]);

  const saveRx = async () => {
    if (!target) return;
    setSavingRx(true);
    try {
      await api.savePrescription(target.id, {
        rDistSph,
        rDistCyl,
        rDistAxis: parseInt(rDistAxis, 10) || null,
        rDistVn,
        rNearSph,
        rNearCyl,
        rNearAxis: parseInt(rNearAxis, 10) || null,
        rNearVn,
        lDistSph,
        lDistCyl,
        lDistAxis: parseInt(lDistAxis, 10) || null,
        lDistVn,
        lNearSph,
        lNearCyl,
        lNearAxis: parseInt(lNearAxis, 10) || null,
        lNearVn,
        addR,
        addL,
        pd,
        lensTypes,
        remarks,
      });
      flashToast('Prescription saved successfully');
      reloadRx();
      setRxModalOpen(false);
    } catch (e) {
      flashToast((e as Error).message);
    } finally {
      setSavingRx(false);
    }
  };

  return (
    <>
      <OverlayShell title={target?.name ?? 'Activity'} closeIcon="arrow_back" onClose={closeOverlay} bg={theme.bg}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
          
          {/* Customer Header Card */}
          <Card pad={16} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.tile, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: Font.bold, fontSize: 16, color: theme.accent }}>
                    {(target?.name ?? 'C').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: Font.extrabold, fontSize: 16, color: Colors.textPrimary }}>{target?.name}</Text>
                  {target?.phone ? (
                    <Text style={{ fontFamily: Font.semibold, fontSize: 12.5, color: Colors.textSecondary, marginTop: 2 }}>
                      {target.phone}
                    </Text>
                  ) : null}
                </View>
              </View>
              
              {business?.industry === 'Optical' && (
                <Tap
                  onPress={() => setRxModalOpen(true)}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.btn,
                    backgroundColor: theme.accent,
                  }}
                >
                  <Text style={{ fontFamily: Font.bold, fontSize: 12, color: Colors.canvas }}>
                    {latestRx ? 'See / Edit Power' : '+ Record Power'}
                  </Text>
                </Tap>
              )}
            </View>

            {target?.outstanding && target.outstanding > 0 ? (
              <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.divider, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontFamily: Font.semibold, fontSize: 13, color: Colors.textSecondary }}>Outstanding Balance</Text>
                <Text style={{ fontFamily: Font.bold, fontSize: 14, color: Colors.danger }}>
                  ₹{(target.outstanding / 100).toFixed(2)}
                </Text>
              </View>
            ) : null}
          </Card>

          {/* Latest Eye Power (Rx) */}
          {business?.industry === 'Optical' && latestRx && (
            <Card pad={18} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Sym name="visibility" size={18} color={theme.accent} />
                <Text style={{ fontFamily: Font.bold, fontSize: 13.5, color: Colors.textPrimary }}>
                  Latest Eye Prescription (Rx)
                </Text>
                <Text style={{ fontFamily: Font.medium, fontSize: 11, color: Colors.textMuted, marginLeft: 'auto' }}>
                  {new Date(latestRx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </Text>
              </View>
              
              <View style={{ borderWidth: 1.5, borderColor: Colors.border, borderRadius: 8, overflow: 'hidden' }}>
                <View style={{ flexDirection: 'row', backgroundColor: Colors.inputBg, paddingVertical: 6, paddingHorizontal: 8 }}>
                  <Text style={{ width: 60, fontFamily: Font.bold, fontSize: 10.5, color: Colors.textSecondary }}>Eye</Text>
                  <Text style={{ flex: 1, textAlign: 'center', fontFamily: Font.bold, fontSize: 10.5, color: Colors.textSecondary }}>SPH</Text>
                  <Text style={{ flex: 1, textAlign: 'center', fontFamily: Font.bold, fontSize: 10.5, color: Colors.textSecondary }}>CYL</Text>
                  <Text style={{ width: 44, textAlign: 'center', fontFamily: Font.bold, fontSize: 10.5, color: Colors.textSecondary }}>Axis</Text>
                  <Text style={{ width: 44, textAlign: 'center', fontFamily: Font.bold, fontSize: 10.5, color: Colors.textSecondary }}>V.A.</Text>
                </View>

                <RxDisplayRow label="R. Dist" sph={latestRx.rDistSph} cyl={latestRx.rDistCyl} axis={latestRx.rDistAxis} vn={latestRx.rDistVn} />
                <RxDisplayRow label="R. Near" sph={latestRx.rNearSph} cyl={latestRx.rNearCyl} axis={latestRx.rNearAxis} vn={latestRx.rNearVn} isDivider />
                <RxDisplayRow label="L. Dist" sph={latestRx.lDistSph} cyl={latestRx.lDistCyl} axis={latestRx.lDistAxis} vn={latestRx.lDistVn} />
                <RxDisplayRow label="L. Near" sph={latestRx.lNearSph} cyl={latestRx.lNearCyl} axis={latestRx.lNearAxis} vn={latestRx.lNearVn} />
              </View>

              <View style={{ flexDirection: 'row', marginTop: 10, gap: 12 }}>
                {latestRx.addR ? (
                  <Text style={{ fontFamily: Font.medium, fontSize: 12, color: Colors.textSecondary }}>
                    Add R: <Text style={{ fontFamily: Font.bold, color: Colors.textPrimary }}>{latestRx.addR}</Text>
                  </Text>
                ) : null}
                {latestRx.addL ? (
                  <Text style={{ fontFamily: Font.medium, fontSize: 12, color: Colors.textSecondary }}>
                    Add L: <Text style={{ fontFamily: Font.bold, color: Colors.textPrimary }}>{latestRx.addL}</Text>
                  </Text>
                ) : null}
                {latestRx.pd ? (
                  <Text style={{ fontFamily: Font.medium, fontSize: 12, color: Colors.textSecondary }}>
                    P.D.: <Text style={{ fontFamily: Font.bold, color: Colors.textPrimary }}>{latestRx.pd} mm</Text>
                  </Text>
                ) : null}
              </View>

              {latestRx.lensTypes && latestRx.lensTypes.length > 0 ? (
                <Text style={{ fontFamily: Font.medium, fontSize: 12, color: Colors.textSecondary, marginTop: 6 }}>
                  Lens: <Text style={{ fontFamily: Font.bold, color: Colors.textPrimary }}>{latestRx.lensTypes.join(', ')}</Text>
                </Text>
              ) : null}

              {latestRx.remarks ? (
                <Text style={{ fontFamily: Font.medium, fontSize: 12, color: Colors.textSecondary, marginTop: 4, fontStyle: 'italic' }}>
                  Remarks: {latestRx.remarks}
                </Text>
              ) : null}
            </Card>
          )}

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

      {/* Eye Prescription Modal */}
      {rxModalOpen && (
        <OverlayShell
          title="Eye Prescription (Rx)"
          closeIcon="close"
          onClose={() => setRxModalOpen(false)}
          bg={theme.bg}
          footer={
            <PrimaryButton
              label={savingRx ? 'Saving…' : 'Save Prescription'}
              icon="check"
              onPress={saveRx}
              disabled={savingRx}
            />
          }
        >
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 14 }} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 4 }}>
              <Text style={{ width: 60, fontFamily: Font.bold, fontSize: 11, color: Colors.textSecondary }}>Eye (Dist)</Text>
              <Text style={{ flex: 1, textAlign: 'center', fontFamily: Font.bold, fontSize: 11, color: Colors.textSecondary }}>SPH</Text>
              <Text style={{ flex: 1, textAlign: 'center', fontFamily: Font.bold, fontSize: 11, color: Colors.textSecondary }}>CYL</Text>
              <Text style={{ width: 44, textAlign: 'center', fontFamily: Font.bold, fontSize: 11, color: Colors.textSecondary }}>Axis</Text>
              <Text style={{ width: 44, textAlign: 'center', fontFamily: Font.bold, fontSize: 11, color: Colors.textSecondary }}>V.A.</Text>
            </View>

            {/* Right eye distance */}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Text style={{ width: 60, fontFamily: Font.bold, fontSize: 12, color: Colors.textPrimary }}>R. Dist</Text>
              <RxStepperField value={rDistSph} onChange={setRDistSph} placeholder="SPH" />
              <RxStepperField value={rDistCyl} onChange={setRDistCyl} placeholder="CYL" />
              <TextInput
                value={rDistAxis}
                onChangeText={setRDistAxis}
                placeholder="Axis"
                keyboardType="number-pad"
                style={{ width: 44, height: 38, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, backgroundColor: Colors.inputBg, textAlign: 'center', fontFamily: Font.semibold, fontSize: 11, color: Colors.textPrimary }}
              />
              <TextInput
                value={rDistVn}
                onChangeText={setRDistVn}
                placeholder="V.A."
                style={{ width: 44, height: 38, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, backgroundColor: Colors.inputBg, textAlign: 'center', fontFamily: Font.semibold, fontSize: 11, color: Colors.textPrimary }}
              />
            </View>

            {/* Right eye near */}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Text style={{ width: 60, fontFamily: Font.bold, fontSize: 12, color: Colors.textPrimary }}>R. Near</Text>
              <RxStepperField value={rNearSph} onChange={setRNearSph} placeholder="SPH" />
              <RxStepperField value={rNearCyl} onChange={setRNearCyl} placeholder="CYL" />
              <TextInput
                value={rNearAxis}
                onChangeText={setRNearAxis}
                placeholder="Axis"
                keyboardType="number-pad"
                style={{ width: 44, height: 38, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, backgroundColor: Colors.inputBg, textAlign: 'center', fontFamily: Font.semibold, fontSize: 11, color: Colors.textPrimary }}
              />
              <TextInput
                value={rNearVn}
                onChangeText={setRNearVn}
                placeholder="V.A."
                style={{ width: 44, height: 38, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, backgroundColor: Colors.inputBg, textAlign: 'center', fontFamily: Font.semibold, fontSize: 11, color: Colors.textPrimary }}
              />
            </View>

            {/* Left eye distance */}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Text style={{ width: 60, fontFamily: Font.bold, fontSize: 12, color: Colors.textPrimary }}>L. Dist</Text>
              <RxStepperField value={lDistSph} onChange={setLDistSph} placeholder="SPH" />
              <RxStepperField value={lDistCyl} onChange={setLDistCyl} placeholder="CYL" />
              <TextInput
                value={lDistAxis}
                onChangeText={setLDistAxis}
                placeholder="Axis"
                keyboardType="number-pad"
                style={{ width: 44, height: 38, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, backgroundColor: Colors.inputBg, textAlign: 'center', fontFamily: Font.semibold, fontSize: 11, color: Colors.textPrimary }}
              />
              <TextInput
                value={lDistVn}
                onChangeText={setLDistVn}
                placeholder="V.A."
                style={{ width: 44, height: 38, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, backgroundColor: Colors.inputBg, textAlign: 'center', fontFamily: Font.semibold, fontSize: 11, color: Colors.textPrimary }}
              />
            </View>

            {/* Left eye near */}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Text style={{ width: 60, fontFamily: Font.bold, fontSize: 12, color: Colors.textPrimary }}>L. Near</Text>
              <RxStepperField value={lNearSph} onChange={setLNearSph} placeholder="SPH" />
              <RxStepperField value={lNearCyl} onChange={setLNearCyl} placeholder="CYL" />
              <TextInput
                value={lNearAxis}
                onChangeText={setLNearAxis}
                placeholder="Axis"
                keyboardType="number-pad"
                style={{ width: 44, height: 38, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, backgroundColor: Colors.inputBg, textAlign: 'center', fontFamily: Font.semibold, fontSize: 11, color: Colors.textPrimary }}
              />
              <TextInput
                value={lNearVn}
                onChangeText={setLNearVn}
                placeholder="V.A."
                style={{ width: 44, height: 38, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, backgroundColor: Colors.inputBg, textAlign: 'center', fontFamily: Font.semibold, fontSize: 11, color: Colors.textPrimary }}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: Font.semibold, fontSize: 12, color: Colors.textSecondary, marginBottom: 4 }}>Add R</Text>
                <SheetField placeholder="+2.00" value={addR} onChangeText={setAddR} accent={theme.accent} height={38} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: Font.semibold, fontSize: 12, color: Colors.textSecondary, marginBottom: 4 }}>Add L</Text>
                <SheetField placeholder="+2.00" value={addL} onChangeText={setAddL} accent={theme.accent} height={38} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: Font.semibold, fontSize: 12, color: Colors.textSecondary, marginBottom: 4 }}>P.D. (mm)</Text>
                <SheetField placeholder="64" value={pd} onChangeText={setPd} accent={theme.accent} height={38} />
              </View>
            </View>

            <View style={{ gap: 6, marginTop: 4 }}>
              <Text style={{ fontFamily: Font.semibold, fontSize: 12, color: Colors.textSecondary }}>Lens Types</Text>
              <View style={{ flexWrap: 'wrap', flexDirection: 'row', gap: 6 }}>
                {[
                  'Single Vision', 'Bifocal', 'Progressive',
                  'CR-39', 'Anti-reflection', 'Blue Cut',
                  'Photochromic', 'Glass', 'Plastic'
                ].map((chip) => {
                  const active = lensTypes.includes(chip);
                  return (
                    <Tap
                      key={chip}
                      onPress={() => {
                        if (active) {
                          setLensTypes(lensTypes.filter((c) => c !== chip));
                        } else {
                          setLensTypes([...lensTypes, chip]);
                        }
                      }}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: Radius.chip,
                        borderWidth: 1.5,
                        borderColor: active ? theme.accent : Colors.border,
                        backgroundColor: active ? theme.tile : Colors.canvas,
                      }}
                    >
                      <Text style={{ fontFamily: Font.bold, fontSize: 11, color: active ? theme.accent : Colors.textSecondary }}>
                        {chip}
                      </Text>
                    </Tap>
                  );
                })}
              </View>
            </View>

            <View style={{ gap: 4, marginTop: 4 }}>
              <Text style={{ fontFamily: Font.semibold, fontSize: 12, color: Colors.textSecondary }}>Remarks</Text>
              <SheetField placeholder="Any special notes or fitting instructions..." value={remarks} onChangeText={setRemarks} accent={theme.accent} height={38} />
            </View>
          </ScrollView>
        </OverlayShell>
      )}
    </>
  );
}

/** Compact grey form field used inside cards/sheets (radius 10, #F7F8FA). */
function SheetField({
  value,
  onChangeText,
  placeholder,
  accent,
  height = 50,
  radius = Radius.btn,
  ...props
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  accent: string;
  height?: number;
  radius?: number;
  [key: string]: any;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={Colors.textMuted}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      {...props}
      style={[
        {
          height,
          borderRadius: radius,
          borderWidth: 1.5,
          borderColor: focused ? accent : Colors.border,
          backgroundColor: Colors.inputBg,
          paddingHorizontal: 12,
          fontFamily: Font.semibold,
          fontSize: 14,
          color: Colors.textPrimary,
        },
        props.style,
      ]}
    />
  );
}

function stepValue(val: string, step: number): string {
  let num = 0;
  const clean = val.toLowerCase().trim();
  if (clean === 'plano' || clean === 'sph' || clean === 'pl' || !clean) {
    num = 0;
  } else {
    num = parseFloat(clean) || 0;
  }
  num += step;
  if (num === 0) return 'plano';
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}`;
}

function RxStepperField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        height: 38,
        borderWidth: 1.5,
        borderColor: Colors.border,
        borderRadius: 6,
        backgroundColor: Colors.inputBg,
      }}
    >
      <Tap onPress={() => onChange(stepValue(value, -0.25))} style={{ paddingHorizontal: 8, height: '100%', justifyContent: 'center' }}>
        <Text style={{ fontFamily: Font.bold, fontSize: 16, color: Colors.textSecondary }}>−</Text>
      </Tap>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        style={{
          flex: 1,
          textAlign: 'center',
          fontFamily: Font.semibold,
          fontSize: 11,
          color: Colors.textPrimary,
          padding: 0,
        }}
      />
      <Tap onPress={() => onChange(stepValue(value, 0.25))} style={{ paddingHorizontal: 8, height: '100%', justifyContent: 'center' }}>
        <Text style={{ fontFamily: Font.bold, fontSize: 16, color: Colors.textSecondary }}>+</Text>
      </Tap>
    </View>
  );
}

function RxDisplayRow({ label, sph, cyl, axis, vn, isDivider }: { label: string; sph?: string; cyl?: string; axis?: any; vn?: string; isDivider?: boolean }) {
  if (!sph && !cyl && !axis && !vn) return null;
  return (
    <View style={{
      flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 8, alignItems: 'center',
      borderBottomWidth: isDivider ? 1.5 : 1, borderBottomColor: isDivider ? Colors.border : Colors.divider
    }}>
      <Text style={{ width: 60, fontFamily: Font.bold, fontSize: 11, color: Colors.textPrimary }}>{label}</Text>
      <Text style={{ flex: 1, textAlign: 'center', fontFamily: Font.semibold, fontSize: 11, color: Colors.textPrimary }}>{sph || '—'}</Text>
      <Text style={{ flex: 1, textAlign: 'center', fontFamily: Font.semibold, fontSize: 11, color: Colors.textPrimary }}>{cyl || '—'}</Text>
      <Text style={{ width: 44, textAlign: 'center', fontFamily: Font.semibold, fontSize: 11, color: Colors.textPrimary }}>{axis != null ? String(axis) : '—'}</Text>
      <Text style={{ width: 44, textAlign: 'center', fontFamily: Font.semibold, fontSize: 11, color: Colors.textPrimary }}>{vn || '—'}</Text>
    </View>
  );
}
