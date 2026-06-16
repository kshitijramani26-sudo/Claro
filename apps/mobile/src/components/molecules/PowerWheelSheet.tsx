import { useEffect, useMemo, useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  Text,
  Vibration,
  View,
} from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tap } from '@/components/atoms/Tap';
import { Colors, Radius } from '@/theme/tokens';
import { Font } from '@/theme/typography';

const SHEET_EASING = Easing.bezier(0.32, 0.72, 0, 1);
const ITEM_H = 46;
const VISIBLE = 5; // odd → one centred highlight row
const PAD = ((VISIBLE - 1) / 2) * ITEM_H;

export interface WheelOption {
  /** Canonical stored value ('' = blank/none). */
  value: string;
  /** Display label ('—' for blank). */
  label: string;
}

interface Props {
  title: string;
  options: WheelOption[];
  value: string;
  accent: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

/**
 * Lenskart-style bottom-sheet wheel for optical powers (SPH/CYL/AXIS/ADD).
 * No keyboard — scroll to a value, it snaps into the centred highlight band.
 * First option is always blank ("—"); every field stays optional.
 */
export function PowerWheelSheet({ title, options, value, accent, onSelect, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const ref = useRef<ScrollView>(null);
  const startIdx = Math.max(0, options.findIndex((o) => o.value === value));
  const [idx, setIdx] = useState(startIdx < 0 ? 0 : startIdx);

  // Position the wheel on the current value once mounted.
  useEffect(() => {
    const t = setTimeout(() => ref.current?.scrollTo({ y: startIdx * ITEM_H, animated: false }), 0);
    return () => clearTimeout(t);
  }, [startIdx]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    const clamped = Math.min(options.length - 1, Math.max(0, next));
    if (clamped !== idx) {
      setIdx(clamped);
      if (Platform.OS === 'android') Vibration.vibrate(6); // light tick, Android only
    }
  };

  const onSettle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    const clamped = Math.min(options.length - 1, Math.max(0, next));
    setIdx(clamped);
  };

  const confirm = () => {
    onSelect(options[idx]?.value ?? '');
    onClose();
  };

  return (
    <View style={{ position: 'absolute', inset: 0, zIndex: 60 }}>
      <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)} style={{ position: 'absolute', inset: 0, backgroundColor: Colors.scrim }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>
      <Animated.View
        entering={SlideInDown.duration(280).easing(SHEET_EASING)}
        exiting={SlideOutDown.duration(220).easing(SHEET_EASING)}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: Colors.canvas,
          borderTopLeftRadius: Radius.sheet,
          borderTopRightRadius: Radius.sheet,
          paddingTop: 10,
          paddingHorizontal: 24,
          paddingBottom: 22 + insets.bottom,
        }}
      >
        <View style={{ width: 40, height: 5, borderRadius: Radius.pill, backgroundColor: Colors.dashed, alignSelf: 'center' }} />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 6 }}>
          <Text style={{ fontFamily: Font.extrabold, fontSize: 17, color: Colors.textPrimary }}>{title}</Text>
          <Tap
            onPress={() => {
              onSelect('');
              onClose();
            }}
            hitSlop={8}
          >
            <Text style={{ fontFamily: Font.bold, fontSize: 13, color: Colors.textSecondary }}>Clear</Text>
          </Tap>
        </View>

        <View style={{ height: VISIBLE * ITEM_H, justifyContent: 'center' }}>
          {/* Centred highlight band */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: PAD,
              height: ITEM_H,
              borderRadius: Radius.tile,
              backgroundColor: `${accent}14`,
              borderWidth: 1.5,
              borderColor: accent,
            }}
          />
          <ScrollView
            ref={ref}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_H}
            decelerationRate="fast"
            scrollEventThrottle={16}
            onScroll={onScroll}
            onMomentumScrollEnd={onSettle}
            onScrollEndDrag={onSettle}
            contentContainerStyle={{ paddingVertical: PAD }}
          >
            {options.map((o, i) => {
              const active = i === idx;
              return (
                <View key={o.value || 'blank'} style={{ height: ITEM_H, alignItems: 'center', justifyContent: 'center' }}>
                  <Text
                    style={{
                      fontFamily: active ? Font.extrabold : Font.semibold,
                      fontSize: active ? 22 : 18,
                      color: active ? accent : Colors.textMuted,
                      opacity: active ? 1 : 0.6,
                    }}
                  >
                    {o.label}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>

        <Tap
          onPress={confirm}
          style={{ height: 50, borderRadius: Radius.btn, backgroundColor: accent, alignItems: 'center', justifyContent: 'center', marginTop: 14 }}
        >
          <Text style={{ fontFamily: Font.extrabold, fontSize: 15, color: '#FFFFFF' }}>Done</Text>
        </Tap>
      </Animated.View>
    </View>
  );
}

// ---------- option generators ----------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Signed dioptre options; 0 → "Plano". Blank "—" prepended. min/max inclusive. */
export function signedPowerOptions(min: number, max: number, step: number): WheelOption[] {
  const out: WheelOption[] = [{ value: '', label: '—' }];
  for (let n = min; n <= max + 1e-9; n = round2(n + step)) {
    const v = round2(n);
    if (v === 0) {
      out.push({ value: 'Plano', label: 'Plano' });
    } else {
      const s = `${v > 0 ? '+' : '-'}${Math.abs(v).toFixed(2)}`;
      out.push({ value: s, label: s });
    }
  }
  return out;
}

/** Positive-only dioptre options (ADD). Blank "—" prepended. */
export function addPowerOptions(min: number, max: number, step: number): WheelOption[] {
  const out: WheelOption[] = [{ value: '', label: '—' }];
  for (let n = min; n <= max + 1e-9; n = round2(n + step)) {
    const s = `+${round2(n).toFixed(2)}`;
    out.push({ value: s, label: s });
  }
  return out;
}

/** Integer axis options 0–180. Blank "—" prepended. */
export function axisOptions(min: number, max: number): WheelOption[] {
  const out: WheelOption[] = [{ value: '', label: '—' }];
  for (let n = min; n <= max; n += 1) out.push({ value: String(n), label: `${n}°` });
  return out;
}

/** Memo-stable shared option sets. */
export function useRxWheelOptions() {
  return useMemo(
    () => ({
      sph: signedPowerOptions(-20, 20, 0.25),
      cyl: signedPowerOptions(-6, 6, 0.25),
      axis: axisOptions(0, 180),
      add: addPowerOptions(0.25, 3.5, 0.25),
    }),
    [],
  );
}
