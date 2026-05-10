// STUB — Team Beta β2 owns the real implementation.
// Public API: a thin breathing crimson hairline. Pass `vertical` for
// rotated 90deg variants; pass className for sizing.

export interface EmberSeamProps {
  vertical?: boolean;
  className?: string;
}

export function EmberSeam({ vertical = false, className = '' }: EmberSeamProps) {
  return (
    <div
      aria-hidden
      className={[
        'pointer-events-none',
        vertical ? 'w-px h-full' : 'h-px w-full',
        'bg-gradient-to-r from-transparent via-brand-500/60 to-transparent',
        'animate-ember-breathe',
        className,
      ].join(' ')}
    />
  );
}
