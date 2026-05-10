import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

// STUB — Team Alpha α4 replaces with the real magnetic primary button
// (cursor-proximity tug + 60ms compress on press + ember flash on release).
// Until then this is a basic styled button so beta agents can import + use it.

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export const PrimaryButton = forwardRef<HTMLButtonElement, PrimaryButtonProps>(
  ({ className, children, loading, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md',
          'bg-brand-500 hover:bg-brand-600 text-ink-950 font-medium text-sm',
          'transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
PrimaryButton.displayName = 'PrimaryButton';
