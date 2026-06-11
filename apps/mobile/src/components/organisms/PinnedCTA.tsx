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
 * Pinned CTA region — absolute above the nav, fade-from-transparent gradient
 * into the page background, full-width 54px brand button.
 */
export function PinnedCTA({ label, onPress, disabled, icon, iconNode, pageBg, bottomInset = 0 }: Props) {
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20 }}>
      <LinearGradient
        colors={['transparent', pageBg]}
        locations={[0, 0.38]}
        style={{ paddingTop: 16, paddingHorizontal: 20, paddingBottom: 14 + bottomInset }}
      >
        <PrimaryButton label={label} onPress={onPress} disabled={disabled} icon={icon} iconNode={iconNode} shadow />
      </LinearGradient>
    </View>
  );
}
