import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Sym } from './Icon';
import { Colors, Radius } from '@/theme/tokens';
import { Font } from '@/theme/typography';

interface Props {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder: string;
  label?: string;
  /** Chevron / selected highlight color. */
  accent: string;
  height?: number;
  radius?: number;
  bg?: string;
  style?: StyleProp<ViewStyle>;
}

/** Native <select> replacement: field + slide-up option sheet. */
export function Select({ value, options, onChange, placeholder, label, accent, height = 54, radius = Radius.btn, bg = Colors.canvas, style }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <View style={style}>
      {label ? (
        <Text style={{ fontFamily: Font.semibold, fontSize: 13, color: Colors.textSecondary, marginBottom: 8 }}>
          {label}
        </Text>
      ) : null}
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          height,
          borderRadius: radius,
          borderWidth: 1.5,
          borderColor: Colors.border,
          backgroundColor: bg,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text
          style={{
            fontFamily: Font.semibold,
            fontSize: 16,
            color: value ? Colors.textPrimary : Colors.textMuted,
          }}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <Sym name="expand_more" size={22} color={accent} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: Colors.scrim }} onPress={() => setOpen(false)} />
        <View
          style={{
            backgroundColor: Colors.canvas,
            borderTopLeftRadius: Radius.sheet,
            borderTopRightRadius: Radius.sheet,
            paddingTop: 10,
            paddingBottom: 26,
            paddingHorizontal: 24,
            maxHeight: 420,
          }}
        >
          <View
            style={{
              width: 40,
              height: 5,
              borderRadius: Radius.pill,
              backgroundColor: Colors.dashed,
              alignSelf: 'center',
              marginBottom: 14,
            }}
          />
          <ScrollView>
            {options.map((opt) => {
              const selected = opt === value;
              return (
                <Pressable
                  key={opt}
                  onPress={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  style={{
                    height: 52,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottomWidth: 1,
                    borderBottomColor: Colors.divider,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: selected ? Font.bold : Font.semibold,
                      fontSize: 15,
                      color: selected ? accent : Colors.textPrimary,
                    }}
                  >
                    {opt}
                  </Text>
                  {selected ? <Sym name="check" size={20} color={accent} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
