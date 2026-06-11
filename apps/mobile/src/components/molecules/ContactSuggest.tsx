/**
 * Inline device-contact suggestions under a name field. Debounced search;
 * tapping a row fills name + phone. Renders nothing with no matches.
 */
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Tap } from '@/components/atoms/Tap';
import { Sym } from '@/components/atoms/Icon';
import { searchContacts, type ContactHit } from '@/lib/contacts';
import { Colors, Radius } from '@/theme/tokens';
import { Font, tnum } from '@/theme/typography';

interface Props {
  query: string;
  accent: string;
  onPick: (hit: ContactHit) => void;
}

export function ContactSuggest({ query, accent, onPick }: Props) {
  const [hits, setHits] = useState<ContactHit[]>([]);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      searchContacts(query)
        .then((result) => {
          if (!cancelled) setHits(result);
        })
        .catch(() => {
          if (!cancelled) setHits([]);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  if (hits.length === 0) return null;
  return (
    <View
      style={{
        backgroundColor: Colors.canvas,
        borderRadius: Radius.btnSm,
        borderWidth: 1.5,
        borderColor: Colors.border,
        overflow: 'hidden',
      }}
    >
      {hits.map((hit, i) => (
        <Tap
          key={`${hit.phone}-${i}`}
          onPress={() => {
            setHits([]);
            onPick(hit);
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 14,
            paddingVertical: 11,
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: Colors.divider,
          }}
        >
          <Sym name="contacts" size={17} color={accent} />
          <Text style={{ flex: 1, fontFamily: Font.semibold, fontSize: 13.5, color: Colors.textPrimary }} numberOfLines={1}>
            {hit.name}
          </Text>
          <Text style={[{ fontFamily: Font.medium, fontSize: 12, color: Colors.textMuted }, tnum]}>{hit.phone}</Text>
        </Tap>
      ))}
    </View>
  );
}
