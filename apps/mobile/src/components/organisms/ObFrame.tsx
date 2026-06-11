import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tap } from '@/components/atoms/Tap';
import { Sym } from '@/components/atoms/Icon';
import { ProgressBar } from '@/components/atoms/ProgressBar';
import { PinnedCTA } from './PinnedCTA';
import { Colors, Radius, Shadows } from '@/theme/tokens';
import { Font, tnum } from '@/theme/typography';
import { useBrand } from '@/state/store';

export const OB_BG = '#F6F5FB';

interface Props {
  /** 1–4 (drives the bar at step/5 and the "Step N of 4" label). */
  step: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  ctaLabel: string;
  ctaDisabled?: boolean;
  onCta: () => void;
}

/** Shared onboarding frame — back + progress bar + heading + pinned CTA. */
export function ObFrame({ step, title, subtitle, children, ctaLabel, ctaDisabled, onCta }: Props) {
  const router = useRouter();
  const brand = useBrand();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: OB_BG, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingTop: 8 }}>
        <Tap
          onPress={() => router.back()}
          style={[
            {
              width: 38,
              height: 38,
              borderRadius: Radius.tile,
              backgroundColor: Colors.canvas,
              alignItems: 'center',
              justifyContent: 'center',
            },
            Shadows.card,
          ]}
        >
          <Sym name="arrow_back" size={22} color={Colors.textPrimary} />
        </Tap>
        <View style={{ flex: 1 }}>
          <ProgressBar progress={step / 5} color={brand.brand} />
        </View>
        <Text style={[{ fontFamily: Font.semibold, fontSize: 13, color: Colors.textSecondary }, tnum]}>
          Step {step} of 4
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 30, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontFamily: Font.extrabold, fontSize: 27, letterSpacing: -0.6, color: Colors.textPrimary, lineHeight: 34 }}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ fontFamily: Font.medium, fontSize: 15, color: Colors.textSecondary, marginTop: 10, lineHeight: 22 }}>
            {subtitle}
          </Text>
        ) : null}
        {children}
      </ScrollView>
      <PinnedCTA label={ctaLabel} onPress={onCta} disabled={ctaDisabled} pageBg={OB_BG} bottomInset={insets.bottom} />
    </View>
  );
}
