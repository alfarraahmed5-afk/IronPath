import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * shadcn/ui-style class merger. Combines `clsx` (conditional class joining)
 * with `tailwind-merge` (de-duplicates conflicting Tailwind classes — last
 * one wins). Required by every shadcn primitive; also useful directly in
 * any component that takes a `className` prop.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
