/**
 * HTTP core for the api.ts seam. Screens never import this directly.
 * Base URL: EXPO_PUBLIC_API_BASE_URL, else derived from the Metro host
 * (so a phone on the same Wi-Fi reaches the dev API without config).
 */
import Constants from 'expo-constants';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

function defaultBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return host ? `http://${host}:8000` : 'http://localhost:8000';
}

export const BASE_URL = defaultBaseUrl();

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

export async function request<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string>) };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  let body = init?.body;
  if (init?.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(init.json);
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers, body });
  if (!res.ok) {
    let code = 'http_error';
    let message = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string; message?: string };
      code = data.error ?? code;
      message = data.message ?? message;
    } catch {
      // non-JSON error body
    }
    throw new ApiError(res.status, code, message);
  }
  return (await res.json()) as T;
}
