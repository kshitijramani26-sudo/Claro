import { useState } from 'react';
import { Text, TextInput, View, type KeyboardTypeOptions, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Colors, Radius } from '@/theme/tokens';
import { Font } from '@/theme/typography';

interface Props {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  label?: string;
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
  /** Border color when focused (page accent or brand). */
  focusColor: string;
  height?: number;
  radius?: number;
  bg?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
}

/** Bordered text input — 1.5px #E7E9F2, focus ring in accent/brand. */
export function Input({
  value,
  onChangeText,
  placeholder,
  label,
  keyboardType,
  maxLength,
  focusColor,
  height = 54,
  radius = Radius.btn,
  bg = Colors.canvas,
  autoCapitalize,
  textStyle,
  style,
}: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={style}>
      {label ? (
        <Text style={{ fontFamily: Font.semibold, fontSize: 13, color: Colors.textSecondary, marginBottom: 8 }}>
          {label}
        </Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        keyboardType={keyboardType}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          {
            height,
            borderRadius: radius,
            borderWidth: 1.5,
            borderColor: focused ? focusColor : Colors.border,
            backgroundColor: bg,
            paddingHorizontal: 16,
            fontFamily: Font.semibold,
            fontSize: 16,
            color: Colors.textPrimary,
          },
          textStyle,
        ]}
      />
    </View>
  );
}
