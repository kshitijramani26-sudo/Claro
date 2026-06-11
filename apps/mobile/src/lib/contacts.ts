/**
 * Device contacts autocomplete (expo-contacts). Permission is requested on first
 * use; a denial is remembered for the session and search returns [] silently.
 */
import * as Contacts from 'expo-contacts';

export interface ContactHit {
  name: string;
  phone: string;
}

let permission: 'unknown' | 'granted' | 'denied' = 'unknown';

async function ensurePermission(): Promise<boolean> {
  if (permission === 'granted') return true;
  if (permission === 'denied') return false;
  const { status } = await Contacts.requestPermissionsAsync();
  permission = status === 'granted' ? 'granted' : 'denied';
  return permission === 'granted';
}

export async function searchContacts(query: string): Promise<ContactHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  if (!(await ensurePermission())) return [];
  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.PhoneNumbers],
    name: q,
    pageSize: 5,
  });
  const hits: ContactHit[] = [];
  for (const c of data) {
    const phone = c.phoneNumbers?.[0]?.number ?? '';
    if (c.name && phone) hits.push({ name: c.name, phone: phone.replace(/[^\d+]/g, '') });
    if (hits.length >= 5) break;
  }
  return hits;
}
