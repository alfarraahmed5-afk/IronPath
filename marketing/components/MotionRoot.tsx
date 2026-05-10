'use client';

// Canonical motion wrapper — every other α agent and β1 imports this.
//
// Why this file exists:
//   - LazyMotion + `strict` cuts the initial framer-motion bundle from
//     ~30kb to ~5kb. Strict mode forbids the full `<motion.*>` API and
//     forces every consumer to use `<m.*>` instead, which keeps the
//     light bundle from getting silently re-bloated.
//   - MotionConfig with `reducedMotion="user"` honors the OS / in-app
//     preference (see `@/lib/preferences`) for every animation in the
//     tree without per-component plumbing.
//
// IMPORTANT: do not change the imports below without coordinating across
// teams — `domAnimation` is the bare minimum that supports `layout`,
// spring transitions, variants, and gesture animations, all of which the
// scenes rely on. `domMax` would re-add ~25kb (drag, layoutGroup, etc.).

import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion';
import type { ReactNode } from 'react';

export interface MotionRootProps {
  children: ReactNode;
}

export function MotionRoot({ children }: MotionRootProps) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

export default MotionRoot;
