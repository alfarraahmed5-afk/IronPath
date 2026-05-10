// STUB — Team Alpha α4 replaces with the real motion config: route
// transitions, list staggers, spring presets. Until then these are no-op
// objects so beta agents can import + reference without typecheck errors.

export const VERCEL_EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];

export const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.24, ease: VERCEL_EASE },
};

export const listStagger = {
  initial: 'hidden',
  animate: 'visible',
  variants: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06 } },
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
