import { cn } from '@/lib/utils';

interface LogomarkProps {
  size?: number;
  className?: string;
  /** When true, the orange accent block on the centre bar is muted to ink. Used
   *  in disabled / split-brand contexts (e.g. login error states). */
  monochrome?: boolean;
}

/**
 * IronPath logomark — a forged "I" whose centre stroke evokes a barbell
 * collar (visual designer council brief: "monogram with a notched stroke
 * that doubles as a barbell collar"). The centre block is the brand orange
 * `#FF6B35`; the verticals are warm ink to read like cast steel against
 * the dark surface ladder. Pure inline SVG so there is no asset round-trip.
 */
export function Logomark({ size = 28, className, monochrome = false }: LogomarkProps) {
  const accent = monochrome ? '#3A3A44' : '#FF6B35';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-label="IronPath"
      role="img"
    >
      {/* Top serif / collar end */}
      <rect x="6" y="3" width="16" height="3.2" rx="0.8" fill="#D4D4DA" />
      {/* Vertical bar (the I) */}
      <rect x="12" y="3" width="4" height="22" rx="0.6" fill="#8A8A95" />
      {/* Center barbell collar — the orange accent block */}
      <rect x="9" y="12" width="10" height="4" rx="1" fill={accent} />
      {/* Tiny notch on each side of the collar — the "forged" detail */}
      <rect x="7.5" y="13" width="2" height="2" rx="0.3" fill="#D4D4DA" />
      <rect x="18.5" y="13" width="2" height="2" rx="0.3" fill="#D4D4DA" />
      {/* Bottom serif / collar end */}
      <rect x="6" y="21.8" width="16" height="3.2" rx="0.8" fill="#D4D4DA" />
    </svg>
  );
}
