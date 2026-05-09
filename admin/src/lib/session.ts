// Shared session helpers. All localStorage reads of the `user` key go
// through `readStoredUser` so we never end up with an unguarded JSON.parse
// scattered across the codebase. All forced sign-outs go through
// `clearSessionAndRedirect` so the bounce path stays consistent.

export interface StoredUser {
  id?: string;
  email?: string;
  username?: string;
  full_name?: string | null;
  gym_id?: string;
  gym_name?: string;
  role?: string;
}

export const ALLOWED_ROLES = ['gym_owner', 'super_admin'] as const;
export type AllowedRole = (typeof ALLOWED_ROLES)[number];

export function readStoredUser(): StoredUser | null {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') {
      return parsed as StoredUser;
    }
    return null;
  } catch {
    return null;
  }
}

export function isAllowedRole(role: string | undefined): role is AllowedRole {
  return typeof role === 'string' && (ALLOWED_ROLES as readonly string[]).includes(role);
}

export function clearSession(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
}

export function clearSessionAndRedirect(reason?: 'session_expired'): void {
  clearSession();
  if (reason) {
    const next = window.location.pathname + window.location.search;
    const params = new URLSearchParams({ reason, next });
    window.location.href = `/login?${params.toString()}`;
  } else {
    window.location.href = '/login';
  }
}

// Intentional logout — no reason param, no `next` capture.
export function signOut(): void {
  clearSession();
  window.location.href = '/login';
}
