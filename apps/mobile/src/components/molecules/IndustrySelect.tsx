import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { Sym } from '@/components/atoms/Icon';
import { INDUSTRY_GROUPS } from '@/data/industries';
import { Colors, Radius } from '@/theme/tokens';
import { Font } from '@/theme/typography';

interface Props {
  value: string;
  onChange: (v: string) => void;
  accent: string;
  placeholder?: string;
  label?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/** Searchable, grouped industry picker — sections when browsing, flat filter when typing. */
export function IndustrySelect({ value, onChange, accent, placeholder = 'Select industry', label, height = 54, style }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return null;
    const hits: string[] = [];
    for (const g of INDUSTRY_GROUPS) for (const it of g.items) if (it.toLowerCase().includes(q)) hits.push(it);
    if ('other'.includes(q)) hits.push('Other');
    return hits;
  }, [q]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    setQuery('');
  };

  return (
    <View style={style}>
      {label ? (
        <Text style={{ fontFamily: Font.semibold, fontSize: 13, color: Colors.textSecondary, marginBottom: 8 }}>{label}</Text>
      ) : null}
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          height, borderRadius: Radius.btn, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.canvas,
          paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <Text style={{ fontFamily: Font.semibold, fontSize: 16, color: value ? Colors.textPrimary : Colors.textMuted }} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Sym name="expand_more" size={22} color={accent} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => { setOpen(false); setQuery(''); }}>
        <Pressable style={{ flex: 1, backgroundColor: Colors.scrim }} onPress={() => { setOpen(false); setQuery(''); }} />
        <View
          style={{
            backgroundColor: Colors.canvas, borderTopLeftRadius: Radius.sheet, borderTopRightRadius: Radius.sheet,
            paddingTop: 10, paddingBottom: 26, paddingHorizontal: 24, maxHeight: '82%',
          }}
        >
          <View style={{ width: 40, height: 5, borderRadius: Radius.pill, backgroundColor: Colors.dashed, alignSelf: 'center', marginBottom: 14 }} />
          {/* Search */}
          <View
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, borderRadius: Radius.btn, borderWidth: 1.5,
              borderColor: query ? accent : Colors.border, backgroundColor: Colors.inputBg, paddingHorizontal: 14, marginBottom: 12,
            }}
          >
            <Sym name="search" size={20} color={Colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search your business type…"
              placeholderTextColor={Colors.textMuted}
              autoFocus
              style={{ flex: 1, fontFamily: Font.semibold, fontSize: 15, color: Colors.textPrimary }}
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={8}><Sym name="close" size={18} color={Colors.textMuted} /></Pressable>
            ) : null}
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {filtered ? (
              filtered.length > 0 ? (
                filtered.map((it) => <Row key={it} label={it} selected={it === value} accent={accent} onPress={() => pick(it)} />)
              ) : (
                <Text style={{ fontFamily: Font.medium, fontSize: 14, color: Colors.textMuted, paddingVertical: 24, textAlign: 'center' }}>
                  No match — pick “Other”
                </Text>
              )
            ) : (
              <>
                {INDUSTRY_GROUPS.map((g) => (
                  <View key={g.group}>
                    <Text style={{ fontFamily: Font.extrabold, fontSize: 12, color: accent, letterSpacing: 0.4, marginTop: 14, marginBottom: 2, textTransform: 'uppercase' }}>
                      {g.group}
                    </Text>
                    {g.items.map((it) => <Row key={it} label={it} selected={it === value} accent={accent} onPress={() => pick(it)} />)}
                  </View>
                ))}
                <Text style={{ fontFamily: Font.extrabold, fontSize: 12, color: accent, letterSpacing: 0.4, marginTop: 14, marginBottom: 2, textTransform: 'uppercase' }}>
                  Other
                </Text>
                <Row label="Other" selected={value === 'Other'} accent={accent} onPress={() => pick('Other')} />
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function Row({ label, selected, accent, onPress }: { label: string; selected: boolean; accent: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: Colors.divider }}
    >
      <Text style={{ fontFamily: selected ? Font.bold : Font.semibold, fontSize: 15, color: selected ? accent : Colors.textPrimary }}>{label}</Text>
      {selected ? <Sym name="check" size={20} color={accent} /> : null}
    </Pressable>
  );
}
