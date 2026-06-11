import { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ObFrame } from '@/components/organisms/ObFrame';
import { Input } from '@/components/atoms/Input';
import { Tap } from '@/components/atoms/Tap';
import { Sym } from '@/components/atoms/Icon';
import { api } from '@/lib/api';
import type { SymbolName } from '@/lib/icons';
import { Colors, Radius } from '@/theme/tokens';
import { Font } from '@/theme/typography';
import { useAppStore, useBrand } from '@/state/store';

/** Step 4 — GST registration. Creates the business profile on the server. */
export default function Gst() {
  const router = useRouter();
  const brand = useBrand();
  const form = useAppStore((s) => s.form);
  const setForm = useAppStore((s) => s.setForm);
  const setObStep = useAppStore((s) => s.setObStep);
  const setBusiness = useAppStore((s) => s.setBusiness);
  const flashToast = useAppStore((s) => s.flashToast);
  const [saving, setSaving] = useState(false);

  const tile = (selected: boolean, label: string, icon: SymbolName, onPress: () => void) => (
    <Tap
      onPress={onPress}
      style={{
        flex: 1,
        height: 120,
        borderRadius: Radius.btn,
        borderWidth: 2,
        borderColor: selected ? brand.brand : Colors.border,
        backgroundColor: selected ? brand.tint : Colors.canvas,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
      }}
    >
      <Sym name={icon} size={34} color={selected ? brand.brand : Colors.textSecondary} />
      <Text style={{ fontFamily: Font.bold, fontSize: 17, color: selected ? brand.brand : Colors.textSecondary }}>
        {label}
      </Text>
    </Tap>
  );

  return (
    <ObFrame
      step={4}
      title="Are you GST registered?"
      subtitle="We'll format your invoices accordingly — CGST/SGST split for registered businesses."
      ctaLabel={saving ? 'Setting up…' : 'Finish setup'}
      ctaDisabled={form.gst === null || saving}
      onCta={async () => {
        setSaving(true);
        try {
          const business = await api.createBusiness({
            name: form.shop || 'My Shop',
            owner: form.owner || 'Owner',
            industry: form.industry || 'Other',
            gstRegistered: form.gst === true,
            gstin: form.gst === true ? form.gstin : '',
          });
          setBusiness(business);
          setObStep(5);
          router.push('/onboarding/success');
        } catch (e) {
          flashToast((e as Error).message);
        } finally {
          setSaving(false);
        }
      }}
    >
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 30 }}>
        {tile(form.gst === true, 'Yes', 'verified', () => setForm({ gst: true }))}
        {tile(form.gst === false, 'No', 'storefront', () => setForm({ gst: false }))}
      </View>

      {form.gst === true ? (
        <Animated.View entering={FadeIn.duration(200)} style={{ marginTop: 18 }}>
          <Input
            label="GSTIN"
            value={form.gstin}
            onChangeText={(t) => setForm({ gstin: t.toUpperCase() })}
            placeholder="22AAAAA0000A1Z5"
            focusColor={brand.brand}
            autoCapitalize="characters"
            textStyle={{ fontFamily: Font.bold, letterSpacing: 0.5 }}
          />
        </Animated.View>
      ) : null}
    </ObFrame>
  );
}
