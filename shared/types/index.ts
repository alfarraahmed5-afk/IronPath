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
