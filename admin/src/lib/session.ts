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
  // Phase C onboarding wizard gate. Comes from /admin/me which derives it
  // from gyms.onboarding_completed_at. `undefined` means "we haven't asked
  // yet" — treat as completed to avoid bouncing legacy users into the
  // wizard on first load. Only an explicit `false` redirects.
  onboarding_completed?: boolean;
  // Phase C trial mechanics + tier-cap surfaces — populated from /admin/me.
  // Used by TrialBanner, TrialLockout, TierCapWarning, and the LivePulseStrip
  // baseline. All optional so legacy sessions degrade gracefully.
  subscription_status?: string | null;
  subscription_tier?: string | null;
  subscription_expires_at?: string | null;
  trial_started_at?: string | null;
}

// Plan §6.1 / §8.1 #3: super_admin operates via /super-admin/* through the
// operator console. They access /admin/* only via impersonation (Phase D
// full flow, or the lightweight "preview as owner" mint coming next), which
// vends a *gym_owner-scoped* session — so super_admin never appears here.
export const ALLOWED_ROLES = ['gym_owner'] as const;
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

/**
 * `needsOnboarding` — true only when the stored user has been explicitly
 * marked as onboarding-incomplete. Treats `undefined` (legacy sessions
 * that pre-date the wizard) as "complete" so existing operators don't get
 * pulled into the wizard on first load after the feature ships.
 */
export function needsOnboarding(user: StoredUser | null): boolean {
  return user?.onboarding_completed === false;
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
