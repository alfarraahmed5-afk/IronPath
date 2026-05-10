// EmberSeam — a thin breathing crimson hairline.
//
// The brand's "seam" — a 1px crimson gradient hairline that subtly breathes.
// Used as a visual separator/seam between dark surfaces. Pairs with the
// `.ember-seam` CSS class in app/globals.css for the keyframed breathe.
//
// Props:
//   vertical — rotates the gradient 90deg for vertical 1px seams
//              (sidebar dividers, etc.)
//   glow     — adds a 12px crimson drop-shadow halo around the seam
//              (use sparingly — for hero-section transitions)
//   className — escape hatch for sizing / margin overrides

import type { CSSProperties } from 'react';

export interface EmberSeamProps {
  vertical?: boolean;
  glow?: boolean;
  className?: string;
}

export function EmberSeam({
  vertical = false,
  glow = false,
  className = '',
}: EmberSeamProps) {
  // For the vertical orientation we can't reuse the .ember-seam class
  // (its gradient is 90deg / horizontal). Use an inline style with a
  // rotated 180deg gradient so the breathing background-position shift
  // sweeps top-to-bottom instead of left-to-right.
  const style: CSSProperties | undefined = vertical
    ? {
        width: '1px',
        background:
          'linear-gradient(180deg, transparent 0%, rgba(200, 16, 46, 0.6) 50%, transparent 100%)',
        backgroundSize: '100% 200%',
        animation: 'ember-breathe 8s ease-in-out infinite',
        ...(glow && { boxShadow: '0 0 12px rgba(200, 16, 46, 0.3)' }),
      }
    : glow
      ? { boxShadow: '0 0 12px rgba(200, 16, 46, 0.3)' }
      : undefined;

  return (
    <div
      aria-hidden
      style={style}
      className={[
        'pointer-events-none',
        vertical ? 'h-full' : 'ember-seam w-full',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    />
  );
}
