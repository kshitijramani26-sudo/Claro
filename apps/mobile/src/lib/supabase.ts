/**
 * Supabase phone-OTP auth. Two modes:
 *  • DEV (EXPO_PUBLIC_DEV_AUTH=true): no Supabase call; any 6-digit OTP passes and
 *    the API receives "dev:<phone>" (accepted only when the API runs AUTH_DEV_BYPASS).
 *  • REAL: supabase-js signInWithOtp/verifyOtp; the session JWT goes to the API.
 * Session is now persisted in local storage so that already logged in users bypass login.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { File, Paths } from 'expo-file-system';
import { request, setAuthToken } from './http';

const DEV_AUTH = (process.env.EXPO_PUBLIC_DEV_AUTH ?? 'true') === 'true';
const BETA_AUTH = (process.env.EXPO_PUBLIC_BETA_AUTH ?? 'false') === 'true';
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const TOKEN_FILE = new File(Paths.document, 'auth_token.txt');

let client: SupabaseClient | null = null;

function supabase(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }
  return client;
}

export async function saveSessionToken(token: string): Promise<void> {
  try {
    TOKEN_FILE.write(token);
  } catch (e) {
    console.error('Error saving session token:', e);
  }
}

export async function loadSessionToken(): Promise<string | null> {
  try {
    if (TOKEN_FILE.exists) {
      return await TOKEN_FILE.text();
    }
  } catch (e) {
    console.error('Error loading session token:', e);
  }
  return null;
}

export async function clearSessionToken(): Promise<void> {
  try {
    if (TOKEN_FILE.exists) {
      TOKEN_FILE.delete();
    }
  } catch (e) {
    console.error('Error clearing session token:', e);
  }
}

/** "98765 43210" → "+919876543210" */
export function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (raw.trim().startsWith('+') && digits.length > 10) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return digits ? `+${digits}` : '';
}

export async function sendOtp(phone: string): Promise<void> {
  if (BETA_AUTH) {
    await request('/auth/login', { method: 'POST', json: { phone } });
    return;
  }
  if (DEV_AUTH) return; // no SMS in dev mode — any code is accepted at verify
  const { error } = await supabase().auth.signInWithOtp({ phone: toE164(phone) });
  if (error) throw new Error(error.message);
}

export async function verifyOtp(phone: string, code: string): Promise<void> {
  const e164 = toE164(phone);
  if (BETA_AUTH) {
    if (code.replace(/\D/g, '').length !== 6) throw new Error('Enter the 6-digit code');
    const data = await request<{ access_token: string }>('/auth/verify', {
      method: 'POST',
      json: { phone: e164, code },
    });
    setAuthToken(data.access_token);
    await saveSessionToken(data.access_token);
    return;
  }
  if (DEV_AUTH) {
    if (code.replace(/\D/g, '').length !== 6) throw new Error('Enter the 6-digit code');
    const token = `dev:${e164}`;
    setAuthToken(token);
    await saveSessionToken(token);
    return;
  }
  const { data, error } = await supabase().auth.verifyOtp({ phone: e164, token: code, type: 'sms' });
  if (error || !data.session) throw new Error(error?.message ?? 'Verification failed');
  setAuthToken(data.session.access_token);
  await saveSessionToken(data.session.access_token);
  supabase().auth.onAuthStateChange((_event, session) => {
    const token = session?.access_token ?? null;
    setAuthToken(token);
    if (token) {
      saveSessionToken(token);
    } else {
      clearSessionToken();
    }
  });
}

export async function signOut(): Promise<void> {
  if (!DEV_AUTH && !BETA_AUTH) await supabase().auth.signOut();
  setAuthToken(null);
  await clearSessionToken();
}
