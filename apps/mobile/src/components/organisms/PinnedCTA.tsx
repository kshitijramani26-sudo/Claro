import type { ReactNode } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PrimaryButton } from '@/components/atoms/Button';
import type { SymbolName } from '@/lib/icons';

interface Props {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  icon?: SymbolName;
  iconNode?: ReactNode;
  /** The page background the gradient fades into. */
  pageBg: string;
  /** Extra bottom padding (safe-area inset on onboarding screens). */
  bottomInset?: number;
}

/**
 * Convert a 6-digit hex color to rgba(r,g,b,0).
 * Using 'transparent' (rgba(0,0,0,0)) causes the gradient to interpolate
 * through near-black tones, producing the dark hairline above the button.
 */
function hexToTransparent(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},0)`;
}

/**
 * Pinned CTA region — absolute above the nav, fade-from-transparent gradient
 * into the page background, full-width 54px brand button.
 */
export function PinnedCTA({ label, onPress, disabled, icon, iconNode, pageBg, bottomInset = 0 }: Props) {
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20 }}>
      <LinearGradient
        colors={[hexToTransparent(pageBg), pageBg]}
        locations={[0, 0.38]}
        style={{ paddingTop: 16, paddingHorizontal: 20, paddingBottom: 14 + bottomInset }}
      >
        <PrimaryButton label={label} onPress={onPress} disabled={disabled} icon={icon} iconNode={iconNode} shadow />
      </LinearGradient>
    </View>
  );
}
