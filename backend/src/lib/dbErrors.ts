/**
 * PostgREST returns this code on `.single()` when the query returned zero
 * rows. We treat it as "not found" and surface a 404; any other error code
 * means the database itself failed (RLS denial, missing column, conn drop)
 * and must be surfaced as 500 with the underlying error logged. Collapsing
 * the two paths into a single 404 was the bug that masked the
 * 036–042 schema-drift incident as "Gym not found" for hours during the
 * staging deploy on 2026-05-09.
 */
export const PGREST_NOT_FOUND_CODE = 'PGRST116';

export function isNotFoundError(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    (e as { code: unknown }).code === PGREST_NOT_FOUND_CODE
  );
}
