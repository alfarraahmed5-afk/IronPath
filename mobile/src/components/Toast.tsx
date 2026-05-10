/**
 * Toast -- legacy import path. Now re-exports the design-system
 * primitive (Team B-2 PR B rewrite). Queue-based, swipe-up-to-dismiss,
 * haptic-paired, accessibilityLiveRegion-aware. See
 * `src/design-system/primitives/Toast.tsx`.
 */
export {
  ToastProvider,
  useToast,
  type ToastType,
  type ToastShowOptions,
  type ToastContextValue,
} from '../design-system/primitives/Toast';
