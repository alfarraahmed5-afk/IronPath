export * from './models';
export * from './api';

// Unit conversion constants
export const LBS_TO_KG = 0.453592;
export const INCH_TO_CM = 2.54;
export const KG_TO_LBS = 1 / 0.453592;
export const CM_TO_INCH = 1 / 2.54;

// App constants
export const APP_NAME = 'IronPath';
export const DEEP_LINK_SCHEME = 'ironpath';
export const IOS_BUNDLE_ID = 'com.ironpath.app';
export const ANDROID_PACKAGE = 'com.ironpath.app';

// Invite code character set (excludes O, 0, I, 1)
export const INVITE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const INVITE_CODE_LENGTH = 6;

// Subscription tiers
export const SUBSCRIPTION_LIMITS: Record<string, number> = {
  starter: 50,
  growth: 200,
  unlimited: Infinity,
};

// Canonical subscription tier list. Use SubscriptionTier in code; keep
// SUBSCRIPTION_LIMITS above for legacy callers that already index by string.
export const SUBSCRIPTION_TIERS = ['starter', 'growth', 'unlimited'] as const;
export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[number];

// Per-tier hard cap on members. `null` means unlimited (no cap enforced).
export const TIER_MEMBER_CAPS: Record<SubscriptionTier, number | null> = {
  starter: 50,
  growth: 200,
  unlimited: null,
};

// Canonical onboarding checklist step keys for new gyms. Order is meaningful —
// the dashboard renders steps in this order. Keep in sync with the DB-stored
// step_key values in gym_onboarding_steps.
export const ONBOARDING_STEPS = [
  'profile',
  'logo',
  'first_invite',
  'first_member',
  'first_announcement',
  'subscription_chosen',
] as const;
export type OnboardingStepKey = typeof ONBOARDING_STEPS[number];

// Canonical user roles. `coach` will be added in Phase F — do NOT add it here
// until the role exists end-to-end (RLS, JWT hook, mobile UI).
export const USER_ROLES = ['member', 'gym_owner', 'super_admin'] as const;
export type UserRole = typeof USER_ROLES[number];

// Media limits
export const MAX_PHOTOS_PER_WORKOUT = 2;
export const MAX_VIDEOS_PER_WORKOUT = 1;
export const MAX_AVATAR_SIZE_MB = 5;
export const MAX_WORKOUT_PHOTO_SIZE_MB = 10;
export const MAX_WORKOUT_VIDEO_SIZE_MB = 30;

// Pagination defaults
export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 50;
export const DEFAULT_ADMIN_LIMIT = 25;
export const MAX_ADMIN_LIMIT = 100;
