import { STORAGE_KEYS } from './api';

/**
 * Operator console session helpers.
 *
 * Only super_admin is permitted on this app. Gym owners and members who land
 * here get bounced — they belong on `admin` and `mobile` respectively.
 */
export const ALLOWED_ROLES = ['super_admin'] as const;
export type AllowedRole = (typeof ALLOWED_ROLES)[number];

export interface StoredUser {
  id?: string;
  email?: string;
  username?: string;
  role?: string;
  gym_id?: string | null;
  gym_name?: string | null;
  // Phase B.5 — TOTP enrollment state for super_admin. Stored after login (or
  // /2fa/confirm) so the route guard can decide whether to push the operator
  // to the enrollment wizard before they can see anything else.
  totp_enabled?: boolean;
}

export function readStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.user);
    if (!raw) return null;
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function readAccessToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.accessToken);
}

export function isAuthorized(): boolean {
  const token = readAccessToken();
  if (!token) return false;
  const user = readStoredUser();
  if (!user?.role) return false;
  return (ALLOWED_ROLES as readonly string[]).includes(user.role);
}

/**
 * `needsTotpEnrollment` — true when the operator is signed in but has not yet
 * completed TOTP enrollment. The /2fa/setup route is the only authenticated
 * destination they can reach until they finish.
 */
export function needsTotpEnrollment(): boolean {
  const user = readStoredUser();
  if (!user) return false;
  return user.totp_enabled !== true;
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEYS.accessToken);
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
  localStorage.removeItem(STORAGE_KEYS.user);
  // Also clear any lingering impersonation state.
  localStorage.removeItem(STORAGE_KEYS.impersonationAccessToken);
  localStorage.removeItem(STORAGE_KEYS.impersonationRefreshToken);
  localStorage.removeItem(STORAGE_KEYS.impersonationContext);
}

export function clearSessionAndRedirect(target: string = '/login'): void {
  clearSession();
  if (typeof window !== 'undefined') {
    window.location.href = target;
  }
}
