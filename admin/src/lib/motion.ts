// Team Alpha α4 — real motion config: route transitions, list staggers,
// spring presets. Public API matches the original stub so beta agents'
// imports keep resolving; values refined per the "Make It Alive" spec.

/**
 * Vercel's signature easing curve — fast attack, soft settle. Use this for
 * any UI motion that should feel "premium" rather than mechanical.
 */
export const VERCEL_EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];

/**
 * Page-level transition for route changes. The 60ms delay on the incoming
 * page lets the outgoing page complete its exit before the new content
 * arrives — eliminates the jarring crossfade overlap.
 */
export const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.24, ease: VERCEL_EASE, delay: 0.06 },
};

/**
 * Parent variant container for list-stagger animations. Apply to the
 * <ul>/wrapper; pair with `listItem` on each child. Children animate in
 * 60ms apart for a tactile cascade.
 */
export const listStagger = {
  initial: 'hidden',
  animate: 'visible',
  variants: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
  },
};

/**
 * Child variant for items inside a `listStagger` container.
 */
export const listItem = {
  variants: {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
  },
  transition: { duration: 0.24, ease: VERCEL_EASE },
};

/**
 * Spring config for modal entrances and other "snap into place" motion.
 * Tuned for snappy arrival without overshoot.
 */
export const springModal = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 32,
};

/**
 * Soft spring used for cursor-tug magnetic effects (Button magnetic mode,
 * etc). Lower stiffness, higher damping — the cursor leads, the element
 * follows lazily.
 */
export const springMagnetic = {
  type: 'spring' as const,
  stiffness: 250,
  damping: 22,
};

/**
 * Hover-lift transition — instant up, slow back down. Used by cards and
 * the magnetic button.
 */
export const hoverLift = {
  duration: 0.18,
  ease: VERCEL_EASE,
};
