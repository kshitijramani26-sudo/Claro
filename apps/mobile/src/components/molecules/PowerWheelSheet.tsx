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

/** Signed field split into positive (left) and negative (right) wheels. */
export interface DualOptions {
  pos: WheelOption[];
  neg: WheelOption[];
}

interface Props {
  title: string;
  value: string;
  accent: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  /** Single wheel (AXIS, ADD). */
  options?: WheelOption[];
  /** Two-column wheel for signed powers (SPH, CYL): left +, right −. */
  dual?: DualOptions;
}

// ---------- one scrollable wheel column ----------

function WheelColumn({
  options,
  accent,
  active,
  startIndex,
  onIndexChange,
  onActivate,
}: {
  options: WheelOption[];
  accent: string;
  active: boolean;
  startIndex: number;
  onIndexChange: (i: number) => void;
  onActivate?: () => void;
}) {
  const ref = useRef<ScrollView>(null);
  const [idx, setIdx] = useState(startIndex);

  useEffect(() => {
    const t = setTimeout(() => ref.current?.scrollTo({ y: startIndex * ITEM_H, animated: false }), 0);
    return () => clearTimeout(t);
  }, [startIndex]);

  const update = (y: number, settle: boolean) => {
    const next = Math.min(options.length - 1, Math.max(0, Math.round(y / ITEM_H)));
    if (next !== idx) {
      setIdx(next);
      onIndexChange(next);
      if (Platform.OS === 'android') Vibration.vibrate(6);
    } else if (settle) {
      onIndexChange(next);
    }
  };

  return (
    <View style={{ height: VISIBLE * ITEM_H, justifyContent: 'center' }}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: PAD,
          height: ITEM_H,
          borderRadius: Radius.tile,
          backgroundColor: active ? `${accent}14` : Colors.inputBg,
          borderWidth: 1.5,
          borderColor: active ? accent : Colors.border,
        }}
      />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScrollBeginDrag={onActivate}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => update(e.nativeEvent.contentOffset.y, false)}
        onMomentumScrollEnd={(e) => update(e.nativeEvent.contentOffset.y, true)}
        onScrollEndDrag={(e) => update(e.nativeEvent.contentOffset.y, true)}
        contentContainerStyle={{ paddingVertical: PAD }}
      >
        {options.map((o, i) => {
          const on = i === idx && active;
          return (
            <View key={o.value || 'blank'} style={{ height: ITEM_H, alignItems: 'center', justifyContent: 'center' }}>
              <Text
                style={{
                  fontFamily: on ? Font.extrabold : Font.semibold,
                  fontSize: on ? 22 : 18,
                  color: on ? accent : Colors.textMuted,
                  opacity: i === idx ? 1 : 0.55,
                }}
              >
                {o.label}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

/**
 * Lenskart-style bottom-sheet power picker. AXIS/ADD use a single wheel; signed
 * powers (SPH/CYL) split into two shorter columns — left positive, right negative —
 * so the optician scrolls half the distance. No keyboard; every field optional.
 */
export function PowerWheelSheet({ title, value, accent, onSelect, onClose, options, dual }: Props) {
  const insets = useSafeAreaInsets();

  // Resolve initial selection.
  const initSide: 'pos' | 'neg' = value.startsWith('-') ? 'neg' : 'pos';
  const posStart = dual ? Math.max(0, dual.pos.findIndex((o) => o.value === value)) : 0;
  const negStart = dual ? Math.max(0, dual.neg.findIndex((o) => o.value === value)) : 0;
  const singleStart = options ? Math.max(0, options.findIndex((o) => o.value === value)) : 0;

  const [side, setSide] = useState<'pos' | 'neg'>(initSide);
  const [posIdx, setPosIdx] = useState(posStart);
  const [negIdx, setNegIdx] = useState(negStart);
  const [singleIdx, setSingleIdx] = useState(singleStart);

  const current = (): string => {
    if (dual) return side === 'pos' ? dual.pos[posIdx]?.value ?? '' : dual.neg[negIdx]?.value ?? '';
    return options?.[singleIdx]?.value ?? '';
  };

  const apply = (v: string) => {
    onSelect(v);
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

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 10 }}>
          <Text style={{ fontFamily: Font.extrabold, fontSize: 17, color: Colors.textPrimary }}>{title}</Text>
          <Tap onPress={() => apply('')} hitSlop={8}>
            <Text style={{ fontFamily: Font.bold, fontSize: 13, color: Colors.textSecondary }}>Clear</Text>
          </Tap>
        </View>

        {dual ? (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ textAlign: 'center', fontFamily: Font.bold, fontSize: 11, marginBottom: 6, color: side === 'pos' ? accent : Colors.textMuted }}>
                Plus (+)
              </Text>
              <WheelColumn
                options={dual.pos}
                accent={accent}
                active={side === 'pos'}
                startIndex={posStart}
                onActivate={() => setSide('pos')}
                onIndexChange={setPosIdx}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ textAlign: 'center', fontFamily: Font.bold, fontSize: 11, marginBottom: 6, color: side === 'neg' ? accent : Colors.textMuted }}>
                Minus (−)
              </Text>
              <WheelColumn
                options={dual.neg}
                accent={accent}
                active={side === 'neg'}
                startIndex={negStart}
                onActivate={() => setSide('neg')}
                onIndexChange={setNegIdx}
              />
            </View>
          </View>
        ) : (
          <WheelColumn
            options={options ?? []}
            accent={accent}
            active
            startIndex={singleStart}
            onIndexChange={setSingleIdx}
          />
        )}

        <Tap
          onPress={() => apply(current())}
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

/** Signed dioptre field split into +/− columns. Left col leads with blank "—" + Plano. */
export function signedSplitOptions(max: number, step: number): DualOptions {
  const pos: WheelOption[] = [{ value: '', label: '—' }, { value: 'Plano', label: 'Plano' }];
  const neg: WheelOption[] = [{ value: '', label: '—' }];
  for (let n = step; n <= max + 1e-9; n = round2(n + step)) {
    const v = round2(n);
    pos.push({ value: `+${v.toFixed(2)}`, label: `+${v.toFixed(2)}` });
    neg.push({ value: `-${v.toFixed(2)}`, label: `−${v.toFixed(2)}` }); // display uses U+2212 minus
  }
  return { pos, neg };
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
      sph: signedSplitOptions(20, 0.25),
      cyl: signedSplitOptions(6, 0.25),
      axis: axisOptions(0, 180),
      add: addPowerOptions(0.25, 3.5, 0.25),
    }),
    [],
  );
}
