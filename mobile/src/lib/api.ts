import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

let accessToken: string | null = null;
let refreshToken: string | null = null;

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
}

export function getAccessToken(): string | null {
  return accessToken;
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const newAccess: string = json.data.access_token;
    const newRefresh: string = json.data.refresh_token;
    accessToken = newAccess;
    refreshToken = newRefresh;
    // Persist rotated tokens so the next cold start uses the fresh pair.
    // Supabase rotates the refresh token on every use — without this the next
    // app restart loads a stale (already-consumed) refresh token and the user
    // appears to lose their session overnight.
    SecureStore.setItemAsync('access_token', newAccess).catch(() => {});
    SecureStore.setItemAsync('refresh_token', newRefresh).catch(() => {});
    return newAccess;
  } catch {
    return null;
  }
}

export async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  retried = false
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !retried && refreshToken) {
    const newToken = await refreshAccessToken();
    if (newToken) return apiRequest<T>(method, path, body, true);
  }

  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

export const api = {
  get: <T>(path: string) => apiRequest<T>('GET', path),
  post: <T>(path: string, body?: unknown) => apiRequest<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>('PATCH', path, body),
  put: <T>(path: string, body?: unknown) => apiRequest<T>('PUT', path, body),
  delete: <T>(path: string, body?: unknown) => apiRequest<T>('DELETE', path, body),
};
