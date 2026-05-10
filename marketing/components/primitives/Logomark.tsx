// Logomark — IronPath wordmark.
//
// Two variants:
//   dark  (default) — white "IronPath" wordmark on dark surfaces, with
//                     a crimson dot terminating the "h" baseline. Use
//                     this on the marketing dark shell.
//   light          — black "IronPath" wordmark on light surfaces, same
//                    crimson dot. Use on legal pages, light email
//                    templates, or anywhere on white.
//
// Sizing: `size` is the rendered height in pixels. Width auto-scales
// from the SVG viewBox aspect ratio (~4.5 : 1). Default 32px matches
// the marketing nav.
//
// The wordmark is set in inline SVG <text> using the display font
// stack (var(--font-mona-sans), Mona Sans, falling through to Inter
// and system sans). This keeps a single source of truth — when the
// font swap finishes loading the logomark visually upgrades alongside
// the rest of the page.

import type { CSSProperties } from 'react';

const BRAND_500 = '#C8102E';

export interface LogomarkProps {
  size?: number;
  variant?: 'light' | 'dark';
  className?: string;
  /** Optional title for screen readers. Defaults to "IronPath". */
  title?: string;
}

export function Logomark({
  size = 32,
  variant = 'dark',
  className,
  title = 'IronPath',
}: LogomarkProps) {
  const wordmarkColor = variant === 'dark' ? '#FFFFFF' : '#0A0A0B';

  // viewBox 0 0 180 40 — 4.5:1 aspect. Text baseline ~y=29.
  const aspect = 180 / 40;
  const width = Math.round(size * aspect);

  const textStyle: CSSProperties = {
    fontFamily:
      'var(--font-mona-sans), "Mona Sans", var(--font-inter), system-ui, -apple-system, sans-serif',
    fontWeight: 700,
    fontSize: '28px',
    letterSpacing: '-0.02em',
    fontFeatureSettings: '"ss01" on, "ss02" on',
  };

  return (
    <svg
      role="img"
      aria-label={title}
      width={width}
      height={size}
      viewBox="0 0 180 40"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <title>{title}</title>
      {/* The wordmark itself — uses currentColor-style fill via explicit
          variant token so the SVG renders correctly even when extracted
          (e.g. as an OG image / open-graph asset). */}
      <text x="0" y="29" fill={wordmarkColor} style={textStyle}>
        IronPath
      </text>
      {/* Crimson dot — the brand seam in punctuation form. Sits just
          past the "h" baseline. Coords are tuned for Mona Sans 700 at
          fontSize 28 and roughly survive a fallback to Inter. */}
      <circle cx="156" cy="30" r="3.5" fill={BRAND_500} />
    </svg>
  );
}
