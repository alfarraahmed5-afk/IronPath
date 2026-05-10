import { cn } from '@/lib/utils';

interface LogomarkProps {
  size?: number;
  className?: string;
  /** When true, the logo renders desaturated (used in disabled / split-brand
   *  contexts via a CSS grayscale filter). */
  monochrome?: boolean;
  /** Visual hint for screen-readers + alt text. */
  alt?: string;
}

/**
 * IronPath logomark — the actual app icon from `mobile/assets/icon.png`,
 * served from the admin public folder so the same artwork ships in mobile,
 * admin, and (later) console. Sourced once via <link rel="preload"> on
 * pages that lead with it.
 */
export function Logomark({
  size = 28,
  className,
  monochrome = false,
  alt = 'IronPath',
}: LogomarkProps) {
  return (
    <img
      src="/ironpath-logo.png"
      width={size}
      height={size}
      alt={alt}
      className={cn(
        'shrink-0 select-none object-contain',
        monochrome && 'grayscale opacity-80',
        className
      )}
      draggable={false}
    />
  );
}
