import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/atoms/Card';
import { Sym } from '@/components/atoms/Icon';
import { Tap } from '@/components/atoms/Tap';
import { Avatar } from '@/components/atoms/Avatar';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { PrimaryButton, HeaderIconButton } from '@/components/atoms/Button';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { pickQrImage } from '@/lib/pickQrImage';
import { signOut } from '@/lib/supabase';
import { GST_STATES, stateName } from '@/lib/states';
import { Colors, Radius } from '@/theme/tokens';
import { Font, Type, tnum } from '@/theme/typography';
import { useAppStore, useBrand } from '@/state/store';

const BG = '#F6F5FB';

const INDUSTRIES = [
  'Grocery / Kirana', 'Fashion & Apparel', 'Salon & Spa', 'Optical', 'Pharmacy / Medical',
  'Restaurant & Café', 'Electronics', 'Mobile & Accessories', 'Hardware', 'Stationery',
  'Footwear', 'Jewellery', 'General / Services', 'Other',
];

/** Profile / Settings — business, payments, account, preferences, logout. */
export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const brand = useBrand();
  const business = useAppStore((s) => s.business);
  const setBusiness = useAppStore((s) => s.setBusiness);
  const setPhase = useAppStore((s) => s.setPhase);
  const setObStep = useAppStore((s) => s.setObStep);
  const flashToast = useAppStore((s) => s.flashToast);
  const refresh = useAppStore((s) => s.refresh);

  const { data: methods, reload: reloadMethods } = useApi(() => api.getPaymentMethods());

  // Local edit state, seeded from the cached business profile.
  const [name, setName] = useState(business?.name ?? '');
  const [owner, setOwner] = useState(business?.owner ?? '');
  const [industry, setIndustry] = useState(business?.industry ?? '');
  const [state, setState] = useState(business?.stateCode ?? '27');
  const [address, setAddress] = useState(business?.address ?? '');
  const [gstin, setGstin] = useState(business?.gstin ?? '');
  const [gstRegistered, setGstRegistered] = useState(business?.gstRegistered ?? false);
  const [gstDefault, setGstDefault] = useState<'gst' | 'non_gst'>(business?.gstDefaultMode ?? 'non_gst');
  const [inclTax, setInclTax] = useState(business?.priceIncludesTax ?? true);
  const [prefix, setPrefix] = useState(business?.invoicePrefix ?? 'INV-');
  const [email, setEmail] = useState(business?.email ?? '');
  const [lowStock, setLowStock] = useState(String(business?.lowStockDefault ?? 10));
  const [saving, setSaving] = useState(false);

  // New payment method form
  const [newUpi, setNewUpi] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newQr, setNewQr] = useState<string | null>(null);

  useEffect(() => {
    if (business) {
      setName(business.name); setOwner(business.owner); setIndustry(business.industry);
      setState(business.stateCode); setAddress(business.address); setGstin(business.gstin);
      setGstRegistered(business.gstRegistered); setGstDefault(business.gstDefaultMode);
      setInclTax(business.priceIncludesTax); setPrefix(business.invoicePrefix);
      setEmail(business.email); setLowStock(String(business.lowStockDefault));
    }
  }, [business]);

  const saveBusiness = async () => {
    setSaving(true);
    try {
      const updated = await api.patchBusiness({
        name, owner, industry, stateCode: state, address, gstin,
        gstRegistered, gstDefaultMode: gstRegistered ? gstDefault : 'non_gst',
        priceIncludesTax: inclTax, invoicePrefix: prefix, email,
        lowStockDefault: Math.max(0, parseInt(lowStock, 10) || 10),
      });
      setBusiness(updated);
      refresh();
      flashToast('Profile saved');
    } catch (e) {
      flashToast((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const addMethod = async () => {
    if (!newUpi.trim()) {
      flashToast('Enter a UPI ID');
      return;
    }
    try {
      await api.addPaymentMethod({ upiId: newUpi.trim(), label: newLabel.trim(), qrImageUrl: newQr });
      setNewUpi('');
      setNewLabel('');
      setNewQr(null);
      reloadMethods();
      flashToast('UPI method added');
    } catch (e) {
      flashToast((e as Error).message);
    }
  };

  const pickNewQr = async () => {
    const uri = await pickQrImage();
    if (uri) setNewQr(uri);
  };

  const setMethodQr = async (id: string, clear = false) => {
    const uri = clear ? null : await pickQrImage();
    if (!clear && !uri) return;
    await api.setPaymentMethodQr(id, uri).catch((e: Error) => flashToast(e.message));
    reloadMethods();
    flashToast(clear ? 'QR image removed' : 'QR image saved');
  };

  const logout = async () => {
    await signOut().catch(() => undefined);
    setBusiness(null);
    setPhase('onboarding');
    setObStep(0);
    router.replace('/onboarding');
  };

  const initials = (business?.owner ?? '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1, backgroundColor: BG, paddingTop: insets.top }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 12 }}>
          <HeaderIconButton icon="arrow_back" onPress={() => router.back()} />
          <Text style={Type.screenTitle}>Profile</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 40 + insets.bottom, gap: 14 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Identity */}
        <Card pad={20} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Avatar initials={initials} size={54} bg={brand.brand} color="#FFFFFF" fontSize={17} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: Font.extrabold, fontSize: 17, color: Colors.textPrimary }} numberOfLines={1}>
              {business?.name ?? ''}
            </Text>
            <Text style={[{ fontFamily: Font.medium, fontSize: 12.5, color: Colors.textSecondary, marginTop: 2 }, tnum]}>
              {business?.phone ?? ''}
            </Text>
          </View>
        </Card>

        {/* Business */}
        <Card pad={20} style={{ gap: 14 }}>
          <SectionTitle icon="storefront" label="Business" accent={brand.brand} />
          <Input label="Shop name" value={name} onChangeText={setName} focusColor={brand.brand} height={50} />
          <Input label="Owner name" value={owner} onChangeText={setOwner} focusColor={brand.brand} height={50} />
          <Select label="Industry" value={industry} options={INDUSTRIES} onChange={setIndustry} placeholder="Select industry" accent={brand.brand} height={50} />
          <Select
            label="Business state (drives GST)"
            value={stateName(state)}
            options={GST_STATES.map((s) => s.name)}
            onChange={(n) => setState(GST_STATES.find((s) => s.name === n)?.code ?? state)}
            placeholder="Select state"
            accent={brand.brand}
            height={50}
          />
          <Input label="Address" value={address} onChangeText={setAddress} focusColor={brand.brand} height={50} />
          <ToggleRow label="GST registered" value={gstRegistered} onChange={setGstRegistered} accent={brand.brand} />
          {gstRegistered ? (
            <>
              <Input label="GSTIN" value={gstin} onChangeText={(t) => setGstin(t.toUpperCase())} placeholder="22AAAAA0000A1Z5" focusColor={brand.brand} height={50} autoCapitalize="characters" />
              <ToggleRow
                label="Default bill mode: GST"
                sub="Each bill can still be flipped while billing"
                value={gstDefault === 'gst'}
                onChange={(v) => setGstDefault(v ? 'gst' : 'non_gst')}
                accent={brand.brand}
              />
              <ToggleRow label="Prices include tax (MRP)" value={inclTax} onChange={setInclTax} accent={brand.brand} />
            </>
          ) : null}
          <Input label="Invoice prefix" value={prefix} onChangeText={setPrefix} focusColor={brand.brand} height={50} autoCapitalize="characters" />
          <PrimaryButton label={saving ? 'Saving…' : 'Save changes'} disabled={saving} onPress={saveBusiness} />
        </Card>

        {/* Payments */}
        <Card pad={20} style={{ gap: 12 }}>
          <SectionTitle icon="qr_code_2" label="Payments" accent={brand.brand} />
          {(methods ?? []).map((m) => (
            <View
              key={m.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingHorizontal: 12,
                paddingVertical: 12,
                borderRadius: Radius.tile,
                borderWidth: 1.5,
                borderColor: m.isDefault ? brand.brand : Colors.border,
                backgroundColor: m.isDefault ? brand.tint : Colors.canvas,
              }}
            >
              <Tap onPress={() => setMethodQr(m.id, !!m.qrImageUrl)} hitSlop={4}>
                {m.qrImageUrl ? (
                  <Image source={{ uri: m.qrImageUrl }} style={{ width: 38, height: 38, borderRadius: Radius.chip }} resizeMode="cover" />
                ) : (
                  <View
                    style={{
                      width: 38, height: 38, borderRadius: Radius.chip, borderWidth: 1.5,
                      borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Sym name="file_upload" size={18} color={Colors.textMuted} />
                  </View>
                )}
              </Tap>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: Font.bold, fontSize: 14, color: Colors.textPrimary }} numberOfLines={1}>
                  {m.label || m.upiId}
                </Text>
                <Text style={[{ fontFamily: Font.medium, fontSize: 12, color: Colors.textSecondary, marginTop: 1 }, tnum]} numberOfLines={1}>
                  {m.qrImageUrl ? 'Tap QR to remove' : m.upiId}
                </Text>
              </View>
              <Tap
                hitSlop={6}
                onPress={async () => {
                  if (m.isDefault) return;
                  await api.setDefaultPaymentMethod(m.id).catch((e: Error) => flashToast(e.message));
                  reloadMethods();
                }}
              >
                <Sym name={m.isDefault ? 'star' : 'star_outline'} size={22} color={m.isDefault ? brand.brand : Colors.textMuted} />
              </Tap>
              <Tap
                hitSlop={6}
                onPress={async () => {
                  await api.deletePaymentMethod(m.id).catch((e: Error) => flashToast(e.message));
                  reloadMethods();
                }}
              >
                <Sym name="delete" size={21} color={Colors.textMuted} />
              </Tap>
            </View>
          ))}
          <Input value={newUpi} onChangeText={setNewUpi} placeholder="UPI ID (e.g. shop@oksbi)" focusColor={brand.brand} height={50} autoCapitalize="none" />
          <Input value={newLabel} onChangeText={setNewLabel} placeholder="Label (e.g. SBI Personal)" focusColor={brand.brand} height={50} />
          <Tap
            onPress={pickNewQr}
            style={{
              height: 50, borderRadius: Radius.btn, borderWidth: 1.5, borderColor: Colors.border,
              backgroundColor: Colors.inputBg, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14,
            }}
          >
            {newQr ? (
              <Image source={{ uri: newQr }} style={{ width: 30, height: 30, borderRadius: Radius.chip }} resizeMode="cover" />
            ) : (
              <Sym name="image" size={20} color={Colors.textMuted} />
            )}
            <Text style={{ flex: 1, fontFamily: Font.semibold, fontSize: 13.5, color: newQr ? Colors.textPrimary : Colors.textMuted }}>
              {newQr ? 'QR image attached — tap to change' : 'Attach a QR image (optional)'}
            </Text>
            {newQr ? <Sym name="check_circle" size={20} color={Colors.success} /> : null}
          </Tap>
          <PrimaryButton label="Add UPI method" icon="add" onPress={addMethod} />
          <Text style={{ fontFamily: Font.medium, fontSize: 11.5, color: Colors.textMuted }}>
            No image? Claro generates an exact-amount QR from your UPI ID for every bill.
          </Text>
        </Card>

        {/* Account */}
        <Card pad={20} style={{ gap: 14 }}>
          <SectionTitle icon="person" label="Account" accent={brand.brand} />
          <View>
            <Text style={{ fontFamily: Font.semibold, fontSize: 13, color: Colors.textSecondary, marginBottom: 8 }}>Phone (login)</Text>
            <View
              style={{
                height: 50,
                borderRadius: Radius.btn,
                borderWidth: 1.5,
                borderColor: Colors.border,
                backgroundColor: Colors.inputBg,
                paddingHorizontal: 16,
                justifyContent: 'center',
              }}
            >
              <Text style={[{ fontFamily: Font.semibold, fontSize: 16, color: Colors.textMuted }, tnum]}>{business?.phone ?? ''}</Text>
            </View>
          </View>
          <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" focusColor={brand.brand} height={50} keyboardType="email-address" autoCapitalize="none" />
          <Select label="Language" value="English" options={['English']} onChange={() => undefined} placeholder="English" accent={brand.brand} height={50} />
        </Card>

        {/* Preferences */}
        <Card pad={20} style={{ gap: 14 }}>
          <SectionTitle icon="notifications" label="Preferences" accent={brand.brand} />
          <Input label="Low-stock alert threshold (default)" value={lowStock} onChangeText={setLowStock} keyboardType="number-pad" focusColor={brand.brand} height={50} />
        </Card>

        {/* Footer */}
        <Card pad={20} style={{ gap: 12 }}>
          <FooterRow icon="privacy_tip" label="Privacy: your data stays in your account" />
          <FooterRow icon="description" label="Terms of service" />
          <FooterRow icon="storefront" label="Claro v0.1.0" />
          <Tap
            onPress={logout}
            style={{
              height: 50,
              borderRadius: Radius.btn,
              borderWidth: 1.5,
              borderColor: Colors.dangerTile,
              backgroundColor: Colors.dangerTile,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 4,
            }}
          >
            <Sym name="logout" size={19} color={Colors.danger} />
            <Text style={{ fontFamily: Font.bold, fontSize: 14.5, color: Colors.danger }}>Log out</Text>
          </Tap>
        </Card>
      </ScrollView>
    </View>
    </KeyboardAvoidingView>
  );
}

function SectionTitle({ icon, label, accent }: { icon: 'storefront' | 'qr_code_2' | 'person' | 'notifications'; label: string; accent: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Sym name={icon} size={19} color={accent} />
      <Text style={{ fontFamily: Font.extrabold, fontSize: 16, color: Colors.textPrimary }}>{label}</Text>
    </View>
  );
}

function ToggleRow({ label, sub, value, onChange, accent }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void; accent: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={{ fontFamily: Font.semibold, fontSize: 14, color: Colors.textPrimary }}>{label}</Text>
        {sub ? <Text style={{ fontFamily: Font.medium, fontSize: 11.5, color: Colors.textMuted, marginTop: 2 }}>{sub}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: Colors.segmentBg, true: accent }} thumbColor="#FFFFFF" />
    </View>
  );
}

function FooterRow({ icon, label }: { icon: 'privacy_tip' | 'description' | 'storefront'; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Sym name={icon} size={17} color={Colors.textMuted} />
      <Text style={{ fontFamily: Font.medium, fontSize: 13, color: Colors.textSecondary }}>{label}</Text>
    </View>
  );
}
