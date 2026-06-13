import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ObFrame } from '@/components/organisms/ObFrame';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { IndustrySelect } from '@/components/molecules/IndustrySelect';
import { useAppStore, useBrand } from '@/state/store';

/** Step 3 — business profile. */
export default function Profile() {
  const router = useRouter();
  const brand = useBrand();
  const form = useAppStore((s) => s.form);
  const setForm = useAppStore((s) => s.setForm);
  const setObStep = useAppStore((s) => s.setObStep);

  return (
    <ObFrame
      step={3}
      title="Tell us about your business"
      subtitle="This appears on your invoices and reports."
      ctaLabel="Continue"
      onCta={() => {
        setObStep(4);
        router.push('/onboarding/gst');
      }}
    >
      <View style={{ gap: 18, marginTop: 30 }}>
        <Input
          label="Owner name"
          value={form.owner}
          onChangeText={(t) => setForm({ owner: t })}
          placeholder="e.g. Rajesh Sharma"
          focusColor={brand.brand}
          autoCapitalize="words"
        />
        <Input
          label="Shop name"
          value={form.shop}
          onChangeText={(t) => setForm({ shop: t })}
          placeholder="e.g. Sharma General Store"
          focusColor={brand.brand}
          autoCapitalize="words"
        />
        <IndustrySelect
          label="Industry"
          value={form.industry}
          onChange={(v) => setForm({ industry: v })}
          placeholder="Select your industry"
          accent={brand.brand}
        />
      </View>
    </ObFrame>
  );
}
