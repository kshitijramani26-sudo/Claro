import { Pressable, Text } from 'react-native';
import { Sym } from '@/components/atoms/Icon';
import { Colors } from '@/theme/tokens';
import { Font } from '@/theme/typography';
import { useAppStore } from '@/state/store';

/** Filled/Empty demo toggle (prototype parity) — shown on Khata, Stock and Staff headers. */
export function DemoToggle() {
  const emptyMode = useAppStore((s) => s.emptyMode);
  const toggleEmpty = useAppStore((s) => s.toggleEmpty);
  return (
    <Pressable
      onPress={toggleEmpty}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: Colors.canvas,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
        paddingVertical: 7,
        paddingHorizontal: 11,
      }}
    >
      <Sym name={emptyMode ? 'inbox' : 'dataset'} size={15} color={Colors.textSecondary} />
      <Text style={{ fontFamily: Font.semibold, fontSize: 12, color: Colors.textSecondary }}>
        {emptyMode ? 'Empty' : 'Filled'}
      </Text>
    </Pressable>
  );
}
