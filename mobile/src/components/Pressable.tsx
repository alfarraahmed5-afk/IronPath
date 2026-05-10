/**
 * Legacy Pressable -- shim that re-exports the design-system Pressable.
 *
 * The legacy file is preserved at this path so existing imports across
 * the app continue to resolve. The design-system version fixes the
 * haptic-on-press-in scroll-spam bug (lens 8 row 6) and adds
 * android_ripple forwarding.
 */
export { Pressable } from '../design-system/primitives/Pressable';
export type { IronPressableProps as PressableProps } from '../design-system/primitives/Pressable';
