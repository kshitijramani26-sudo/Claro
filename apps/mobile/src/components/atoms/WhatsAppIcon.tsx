import Svg, { Path } from 'react-native-svg';
import { WHATSAPP_GREEN, WHATSAPP_PATH } from '@/lib/icons';

/** Official WhatsApp glyph — always #25D366, never a Material icon. */
export function WhatsAppIcon({ size = 17 }: { size?: number }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path fill={WHATSAPP_GREEN} d={WHATSAPP_PATH} />
    </Svg>
  );
}
