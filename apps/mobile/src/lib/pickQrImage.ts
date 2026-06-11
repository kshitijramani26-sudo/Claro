/**
 * Pick a UPI QR image from the library and return it as a data URI, so it can
 * be stored on the payment method and rendered as-is on invoices / Scan & Pay.
 */
import * as ImagePicker from 'expo-image-picker';

export async function pickQrImage(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    base64: true,
    quality: 0.6,
    allowsEditing: true,
    aspect: [1, 1],
  });
  const asset = res.canceled ? null : res.assets?.[0];
  if (!asset?.base64) return null;
  return `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`;
}
