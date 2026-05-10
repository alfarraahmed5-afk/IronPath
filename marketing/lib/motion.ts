// Ported verbatim from admin/src/lib/motion.ts.
// Marketing must inherit the same easing + spring presets; the brand's
// motion fingerprint is calibrated and cross-route layoutId morphs depend
// on identical curves. Do not adjust without coordinating with admin.

export const VERCEL_EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];

export const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.24, ease: VERCEL_EASE, delay: 0.06 },
};

export const listStagger = {
  initial: 'hidden',
  animate: 'visible',
  variants: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
  },
};

export const listItem = {
  variants: {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
  },
  transition: { duration: 0.24, ease: VERCEL_EASE },
};

export const springModal = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 32,
};

export const springMagnetic = {
  type: 'spring' as const,
  stiffness: 250,
  damping: 22,
};

export const hoverLift = {
  duration: 0.18,
  ease: VERCEL_EASE,
};
