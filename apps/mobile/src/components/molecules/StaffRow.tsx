import { Pressable, Text, View } from 'react-native';
import { Card } from '@/components/atoms/Card';
import { Avatar } from '@/components/atoms/Avatar';
import { Tap } from '@/components/atoms/Tap';
import { Sym } from '@/components/atoms/Icon';
import type { StaffMember } from '@/data/types';
import { formatINR } from '@/lib/format';
import { Colors, Radius } from '@/theme/tokens';
import { Font, tnum } from '@/theme/typography';

interface Props {
  member: StaffMember;
  present: boolean;
  accent: string;
  tile: string;
  onPress: () => void;
  onToggle: () => void;
}

/** Staff card — avatar, role, advance line, Present/Absent toggle (optimistic local override). */
export function StaffRow({ member, present, accent, tile, onPress, onToggle }: Props) {
  return (
    <Tap onPress={onPress}>
      <Card pad={18} style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
        <Avatar initials={member.initials} size={48} bg={tile} color={accent} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: Font.bold, fontSize: 16, color: Colors.textPrimary }}>{member.name}</Text>
          <Text style={{ fontFamily: Font.medium, fontSize: 12.5, color: Colors.textSecondary, marginTop: 2 }}>
            {member.role}
          </Text>
          {member.advance > 0 ? (
            <Text style={[{ fontFamily: Font.semibold, fontSize: 12, color: Colors.danger, marginTop: 3 }, tnum]}>
              Advance {formatINR(member.advance)}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingVertical: 8,
            paddingHorizontal: 13,
            borderRadius: Radius.tile,
            backgroundColor: present ? Colors.successTile : Colors.dangerTile,
          }}
        >
          <Sym name={present ? 'check_circle' : 'cancel'} size={16} color={present ? Colors.success : Colors.danger} />
          <Text style={{ fontFamily: Font.bold, fontSize: 12.5, color: present ? Colors.success : Colors.danger }}>
            {present ? 'Present' : 'Absent'}
          </Text>
        </Pressable>
      </Card>
    </Tap>
  );
}
