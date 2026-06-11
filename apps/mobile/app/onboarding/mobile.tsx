import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ObFrame } from '@/components/organisms/ObFrame';
import { sendOtp } from '@/lib/supabase';
import { Colors, Radius } from '@/theme/tokens';
import { Font, tnum } from '@/theme/typography';
import { useAppStore, useBrand } from '@/state/store';

/** Step 1 — mobile number (+91 locked, 10 digits). Sends the Supabase OTP. */
export default function Mobile() {
  const router = useRouter();
  const brand = useBrand();
  const mobile = useAppStore((s) => s.mobile);
  const setMobile = useAppStore((s) => s.setMobile);
  const setObStep = useAppStore((s) => s.setObStep);
  const setResend = useAppStore((s) => s.setResend);
  const flashToast = useAppStore((s) => s.flashToast);
  const [focused, setFocused] = useState(false);
  const [sending, setSending] = useState(false);
  const complete = mobile.length === 10;

  return (
    <ObFrame
      step={1}
      title={'Enter your\nmobile number'}
      subtitle="We'll send a 6-digit code to verify it's you."
      ctaLabel={sending ? 'Sending…' : 'Continue'}
      ctaDisabled={!complete || sending}
      onCta={async () => {
        setSending(true);
        try {
          await sendOtp(mobile);
          setObStep(2);
          setResend(30);
          router.push('/onboarding/otp');
        } catch (e) {
          flashToast((e as Error).message);
        } finally {
          setSending(false);
        }
      }}
    >
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 30 }}>
        <View
          style={{
            width: 56,
            height: 54,
            borderRadius: Radius.btn,
            borderWidth: 1.5,
            borderColor: Colors.border,
            backgroundColor: Colors.canvas,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: Font.bold, fontSize: 16, color: Colors.textPrimary }}>+91</Text>
        </View>
        <TextInput
          value={mobile}
          onChangeText={(t) => setMobile(t.replace(/\D/g, '').slice(0, 10))}
          keyboardType="number-pad"
          maxLength={10}
          placeholder="10-digit number"
          placeholderTextColor={Colors.textMuted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            {
              flex: 1,
              height: 54,
              borderRadius: Radius.btn,
              borderWidth: 1.5,
              borderColor: complete || focused ? brand.brand : Colors.border,
              backgroundColor: Colors.canvas,
              paddingHorizontal: 16,
              fontFamily: Font.bold,
              fontSize: 18,
              letterSpacing: 1,
              color: Colors.textPrimary,
            },
            tnum,
          ]}
        />
      </View>
    </ObFrame>
  );
}
