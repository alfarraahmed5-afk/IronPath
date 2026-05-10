// Team Alpha α4 — the magnetic primary button. Layers:
//   1. `press-compress` — scale-down on :active (CSS, built by α3)
//   2. `hover-lift` — 1px translateY on hover (smaller than card lift)
//   3. inner ember box-shadow on hover (subtle warm glow)
//   4. spinner (Loader2) when `loading` — replaces text content
//   5. optional `magnetic` prop — cursor-proximity tug via framer-motion
//      springs. Disabled when prefers-reduced-motion.
//
// API matches the original stub (`forwardRef`, `loading`, `className`,
// standard button props) so beta agents' imports keep resolving. The
// `magnetic` prop is additive and defaults to `false`.

import { forwardRef } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
  type HTMLMotionProps,
} from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { springMagnetic } from '@/lib/motion';

interface PrimaryButtonProps
  extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  loading?: boolean;
  /**
   * When true, the button gently follows the cursor when nearby
   * (cursor-proximity tug). Default false. Automatically disabled
   * when the user prefers reduced motion.
   */
  magnetic?: boolean;
}

export const PrimaryButton = forwardRef<HTMLButtonElement, PrimaryButtonProps>(
  (
    {
      className,
      children,
      loading,
      disabled,
      magnetic = false,
      onMouseMove,
      onMouseLeave,
      ...props
    },
    ref
  ) => {
    const reduced = useReducedMotion();
    const magneticActive = magnetic && !reduced;

    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const springX = useSpring(x, springMagnetic);
    const springY = useSpring(y, springMagnetic);

    function handleMouseMove(e: React.MouseEvent<HTMLButtonElement>) {
      if (magneticActive) {
        const rect = e.currentTarget.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        // 0.18 = how strongly the button follows the cursor. Subtle.
        x.set(dx * 0.18);
        y.set(dy * 0.18);
      }
      onMouseMove?.(e);
    }

    function handleMouseLeave(e: React.MouseEvent<HTMLButtonElement>) {
      if (magneticActive) {
        x.set(0);
        y.set(0);
      }
      onMouseLeave?.(e);
    }

    return (
      <motion.button
        ref={ref}
        disabled={disabled || loading}
        style={magneticActive ? { x: springX, y: springY } : undefined}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={cn(
          'press-compress hover-lift',
          'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md',
          'bg-brand-500 hover:bg-brand-600 text-ink-950 font-medium text-sm',
          'transition-[background-color,box-shadow,transform] duration-150',
          // Subtle inner ember glow on hover — warm, low-opacity, doesn't
          // bleed past the button's edges.
          'hover:shadow-[inset_0_0_12px_rgba(200, 16, 46,0.35)]',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none',
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2
            aria-hidden="true"
            className="h-4 w-4 animate-spin"
          />
        ) : (
          children
        )}
      </motion.button>
    );
  }
);
PrimaryButton.displayName = 'PrimaryButton';
