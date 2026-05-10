// Cross-route layoutId handoff: marketing → admin signup.
//
// === The problem ===
// Framer Motion's `layoutId` morphs are SAME-DOCUMENT only. The browser
// FLIPs the source element to the target element by measuring both
// rects in a single layout pass. That requires both elements to live in
// the same React tree and the same window.
//
// IronPath's marketing site (`ironpath.health`, this Next app) and the
// admin app (`admin.ironpath.health`, separate Vercel project) are
// SEPARATE deployments on SEPARATE origins. There is no shared React
// tree — the navigation crosses a hard document boundary.
//
// === The pragmatic solution ===
// Two halves of one perceived animation:
//
//   1. MARKETING SIDE (this file's owner — α4 + α1):
//      The Crescendo CTA in the Denouement scene scales/morphs to fill
//      the viewport (cubic-bezier ease, ~480ms), then triggers the
//      navigation. The trick is that the user sees the button "become"
//      the next page. The Cold Open hero CTA shares the same
//      `layoutId="trialCta"` so within the marketing route, scrolling
//      back-and-forth produces a real Framer FLIP between the two.
//
//   2. ADMIN SIDE (admin team's responsibility, NOT in this scope):
//      The signup page reads `?from=marketing&via=hero` and plays a
//      complementary opening animation: a near-black hero shape that
//      contracts/fades into the signup form. Same easing, same crimson
//      accent color. The user perceives one continuous motion.
//
// The illusion only works if both halves run with matching tokens — see
// `@/lib/motion`'s `springModal` (380/32) and `VERCEL_EASE` curve.
//
// === Token contract ===
// Anything below is the cross-route handoff API. Both halves MUST stay
// in sync; treat this module as the source of truth.

/** The single shared layoutId for the trial CTA across marketing routes. */
export const TRIAL_CTA_LAYOUT_ID = 'trialCta';

/** Admin signup endpoint. */
export const ADMIN_SIGNUP_URL = '/start';

/** Duration (ms) of the marketing-side scale-out before navigation fires. */
export const HANDOFF_SCALE_OUT_MS = 480;

/** Easing curve for the scale-out — must match admin's intro curve. */
export const HANDOFF_EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];

/**
 * Where on the marketing site the click originated. Admin uses this to
 * pick the right intro animation (hero vs nav vs pricing-card).
 */
export type HandoffSource = 'hero' | 'crescendo' | 'pricing' | 'nav';

/**
 * Build the admin signup URL with the standard handoff params.
 * Admin reads `from` + `via` to pick the matching opening animation.
 */
export function buildSignupUrl(via: HandoffSource): string {
  const u = new URL(ADMIN_SIGNUP_URL);
  u.searchParams.set('from', 'marketing');
  u.searchParams.set('via', via);
  return u.toString();
}

/**
 * Marketing-side trigger: animate the source element to fill the
 * viewport, THEN navigate. Caller passes the element and the via.
 *
 * Reduced-motion callers should skip the animation and call `navigate`
 * directly — see `useReducedMotion()` in `@/lib/preferences`.
 */
export function navigateToSignup(via: HandoffSource): void {
  if (typeof window === 'undefined') return;
  window.location.href = buildSignupUrl(via);
}
