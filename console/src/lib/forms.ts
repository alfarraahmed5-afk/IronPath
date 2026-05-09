import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

/**
 * Re-export the zod resolver so pages don't need to import the
 * resolver subpath directly. Mirrors `admin/src/lib/forms.ts`.
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
 * Convert a dollars input (number or string from <input type="number">)
 * to integer cents. Cents are the canonical unit on the wire — see
 * PLATFORM_PLAN §7.6.
 */
export function dollarsToCents(value: number | string): number {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** Inverse of `dollarsToCents`. Used when seeding form defaults from API. */
export function centsToDollars(cents: number | null | undefined): number {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) return 0;
  return Math.round(cents) / 100;
}
