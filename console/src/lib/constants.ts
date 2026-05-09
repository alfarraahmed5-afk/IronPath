// Mirrors shared/types ONBOARDING_STEPS — duplicated here because the
// console doesn't currently consume @ironpath/shared at runtime.
export const ONBOARDING_STEP_KEYS = [
  'profile',
  'logo',
  'first_invite',
  'first_member',
  'first_announcement',
  'subscription_chosen',
] as const;
export type OnboardingStepKey = typeof ONBOARDING_STEP_KEYS[number];
