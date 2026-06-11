import { Pressable, Text, View } from 'react-native';
import { Sym } from './Icon';
import { Colors } from '@/theme/tokens';
import { Font, tnum } from '@/theme/typography';

interface Props {
  qty: number;
  onInc: () => void;
  onDec: () => void;
}

/** −/qty/+ pill — #F2F3F7 track, 28×28 white step buttons. Dec to 0 removes the item upstream. */
export function Stepper({ qty, onInc, onDec }: Props) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.chipBg,
        borderRadius: 8,
        padding: 3,
        gap: 2,
      }}
    >
      <Pressable onPress={onDec} style={stepBtn} hitSlop={6}>
        <Sym name="remove" size={16} color={Colors.textPrimary} />
      </Pressable>
      <Text
        style={[
          { fontFamily: Font.bold, fontSize: 14, color: Colors.textPrimary, minWidth: 26, textAlign: 'center' },
          tnum,
        ]}
      >
        {qty}
      </Text>
      <Pressable onPress={onInc} style={stepBtn} hitSlop={6}>
        <Sym name="add" size={16} color={Colors.textPrimary} />
      </Pressable>
    </View>
  );
}

const stepBtn = {
  width: 28,
  height: 28,
  borderRadius: 8,
  backgroundColor: Colors.canvas,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};
