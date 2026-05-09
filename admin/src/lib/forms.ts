import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

/**
 * Re-export the zod resolver so pages don't need to import the
 * resolver subpath directly.
 */
export { zodResolver };
export { z };

/**
 * Best-effort error message extractor for axios errors. Backend
 * shape is `{ error: { message } }` — fall back to the JS error
 * message, then the supplied default.
 */
export function extractError(err: unknown, fallback: string): string {
  const e = err as {
    response?: { data?: { error?: { message?: string } } };
    message?: string;
  };
  return (
    e?.response?.data?.error?.message ??
    e?.message ??
    fallback
  );
}

/**
 * Read the current admin's gym id from the user object stored at
 * login. Returns null if it isn't there — pages should render an
 * inline error rather than crash.
 */
export function getStoredGymId(): string | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { gym_id?: string };
    return parsed.gym_id ?? null;
  } catch {
    return null;
  }
}

/** Shared zod fragment for the gym profile / contact PATCH body. */
export const accentColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex color, like #FF6A00');

export const optionalUrl = z
  .string()
  .trim()
  .url('Enter a full URL, including https://')
  .or(z.literal(''))
  .optional();
