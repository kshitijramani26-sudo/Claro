import { Image, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Colors } from '@/theme/tokens';

interface Props {
  /** upi:// deep link to encode (ignored when imageUrl is set). */
  value: string;
  size: number;
  /** Uploaded QR image — shown as-is in place of the generated QR. */
  imageUrl?: string | null;
}

/**
 * Renders a UPI QR: an uploaded image when the method has one, otherwise a
 * dynamically generated QR encoding the exact-amount upi:// link. Black on
 * white so any UPI app scans it reliably.
 */
export function UpiQr({ value, size, imageUrl }: Props) {
  if (imageUrl) {
    return <Image source={{ uri: imageUrl }} style={{ width: size, height: size }} resizeMode="contain" />;
  }
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <QRCode value={value} size={size} color={Colors.textPrimary} backgroundColor={Colors.canvas} />
    </View>
  );
}
