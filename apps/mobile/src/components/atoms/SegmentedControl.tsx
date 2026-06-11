import { Pressable, Text, View } from 'react-native';
import { Colors, Radius, Shadows } from '@/theme/tokens';
import { Font } from '@/theme/typography';

interface Props<T extends string> {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  accent: string;
}

/** Period selector — #EDEEF3 track; active segment white + accent + card shadow. */
export function SegmentedControl<T extends string>({ options, value, onChange, accent }: Props<T>) {
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 4,
        backgroundColor: Colors.segmentBg,
        borderRadius: Radius.tile,
        padding: 4,
      }}
    >
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[
              {
                flex: 1,
                paddingVertical: 9,
                borderRadius: Radius.tile,
                alignItems: 'center',
                backgroundColor: active ? Colors.canvas : 'transparent',
              },
              active ? Shadows.card : null,
            ]}
          >
            <Text style={{ fontFamily: Font.bold, fontSize: 13, color: active ? accent : Colors.textSecondary }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
