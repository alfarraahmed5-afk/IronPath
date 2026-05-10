/**
 * Motion transitions barrel.
 *
 * Re-exports the page / modal / shared-element transition helpers so
 * consumers have one import path:
 *
 *   import { pageTransition, modalTransition, useSharedTag } from
 *     '@/design-system/motion/transitions';
 */
export {
  pageTransition,
  pageTransitionReduced,
  fadeTransition,
  PAGE_ENTRY_MS,
  PAGE_EXIT_MS,
} from './page';

export {
  modalTransition,
  bottomSheetModal,
  modalTransitionReduced,
  MODAL_DURATION_MS,
} from './modal';

export {
  useSharedTag,
  sharedTag,
  SHARED_TAG_PREFIXES,
  SHARED_TAG_PAIRS,
  type SharedTagPrefix,
} from './shared-element';
