import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ObFrame } from '@/components/organisms/ObFrame';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/http';
import { sendOtp, verifyOtp } from '@/lib/supabase';
import { Colors, Radius } from '@/theme/tokens';
import { Font, tnum } from '@/theme/typography';
import { useAppStore, useBrand } from '@/state/store';

/** Step 2 — 6-box OTP with auto-advance and 30s resend timer. Verifies with Supabase. */
export default function Otp() {
  const router = useRouter();
  const brand = useBrand();
  const mobile = useAppStore((s) => s.mobile);
  const otp = useAppStore((s) => s.otp);
  const setOtp = useAppStore((s) => s.setOtp);
  const resend = useAppStore((s) => s.resend);
  const setResend = useAppStore((s) => s.setResend);
  const setObStep = useAppStore((s) => s.setObStep);
  const setPhase = useAppStore((s) => s.setPhase);
  const setBusiness = useAppStore((s) => s.setBusiness);
  const flashToast = useAppStore((s) => s.flashToast);
  const [verifying, setVerifying] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  // 30s countdown, restarted on entry and on resend
  useEffect(() => {
    const t = setInterval(() => {
      const r = useAppStore.getState().resend;
      if (r > 0) setResend(r - 1);
    }, 1000);
    return () => clearInterval(t);
  }, [setResend]);

  const setDigit = (i: number, v: string) => {
    const digit = v.replace(/\D/g, '').slice(-1);
    const next = [...otp] as typeof otp;
    next[i] = digit;
    setOtp(next);
    if (digit && i < 5) inputs.current[i + 1]?.focus();
  };

  return (
    <ObFrame
      step={2}
      title="Verify your number"
      ctaLabel={verifying ? 'Verifying…' : 'Continue'}
      ctaDisabled={verifying}
      onCta={async () => {
        setVerifying(true);
        try {
          await verifyOtp(mobile, otp.join(''));
          // Existing business → straight into the app; otherwise continue onboarding.
          try {
            const business = await api.getBusiness();
            setBusiness(business);
            setPhase('app');
            router.replace('/(tabs)');
            return;
          } catch (e) {
            if (!(e instanceof ApiError && e.code === 'no_business')) throw e;
          }
          setObStep(3);
          router.push('/onboarding/profile');
        } catch (e) {
          flashToast((e as Error).message);
        } finally {
          setVerifying(false);
        }
      }}
    >
      <Text style={{ fontFamily: Font.medium, fontSize: 15, color: Colors.textSecondary, marginTop: 10, lineHeight: 22 }}>
        Enter the code sent to{' '}
        <Text style={[{ fontFamily: Font.bold, color: Colors.textPrimary }, tnum]}>+91 {mobile || 'your number'}</Text>
      </Text>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 30 }}>
        {otp.map((digit, i) => (
          <TextInput
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            value={digit}
            onChangeText={(v) => setDigit(i, v)}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === 'Backspace' && !digit && i > 0) inputs.current[i - 1]?.focus();
            }}
            keyboardType="number-pad"
            maxLength={1}
            style={[
              {
                flex: 1,
                height: 58,
                borderRadius: Radius.tile,
                borderWidth: 1.5,
                borderColor: digit ? brand.brand : Colors.border,
                backgroundColor: Colors.canvas,
                textAlign: 'center',
                fontFamily: Font.bold,
                fontSize: 24,
                color: Colors.textPrimary,
              },
              tnum,
            ]}
          />
        ))}
      </View>

      <View style={{ marginTop: 22, alignItems: 'center' }}>
        {resend > 0 ? (
          <Text style={[{ fontFamily: Font.semibold, fontSize: 13, color: Colors.textSecondary }, tnum]}>
            Resend code in 0:{String(resend).padStart(2, '0')}
          </Text>
        ) : (
          <Pressable
            onPress={async () => {
              try {
                await sendOtp(mobile);
                setResend(30);
                flashToast('Code resent');
              } catch (e) {
                flashToast((e as Error).message);
              }
            }}
          >
            <Text style={{ fontFamily: Font.bold, fontSize: 13, color: brand.brand }}>Resend code</Text>
          </Pressable>
        )}
      </View>
    </ObFrame>
  );
}
