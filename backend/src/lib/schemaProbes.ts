import { supabase } from './supabase';
import { logger } from './logger';

/**
 * Schema-drift detection. Phase B.5 #4.
 *
 * The 2026-05-09 staging deploy revealed that production was missing
 * migrations 036–042 even though the code shipping against them had been on
 * master for months. The first symptom was a misleading 404 ("Gym not
 * found") because a SELECT failed on a missing column and the handler
 * collapsed every read error into "not found". We've since split that
 * handler (B.5 #5) AND we now refuse to boot the backend if the schema
 * doesn't carry the expected columns / tables — a schema-behind production
 * fails loudly at startup instead of silently serving 500s.
 *
 * Each probe is a one-shot SELECT keyed to the column or table introduced
 * by a specific migration. If the probe fails for any reason other than
 * "row not found" (PostgREST PGRST116), the migration is presumed missing.
 *
 * When adding a new migration that introduces a column or table, add a
 * probe here. The marginal cost is one round-trip at boot; the safety net
 * is large.
 */

interface SchemaProbe {
  migration: string;
  description: string;
  // Each probe runs a tiny SELECT; a generic "column does not exist" /
  // "relation does not exist" error means the migration is missing.
  run: () => Promise<{ ok: true } | { ok: false; reason: string }>;
}

function probeColumn(table: string, column: string) {
  return async (): Promise<{ ok: true } | { ok: false; reason: string }> => {
    const { error } = await supabase.from(table).select(column).limit(1);
    if (!error) return { ok: true };
    // PGRST116 = "no rows" (still means table + column exist). Any other
    // error code means the structure is missing or unreadable.
    if ((error as { code?: string }).code === 'PGRST116') return { ok: true };
    return { ok: false, reason: `${(error as { code?: string }).code ?? 'ERROR'}: ${error.message}` };
  };
}

function probeTable(table: string) {
  return async (): Promise<{ ok: true } | { ok: false; reason: string }> => {
    const { error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (!error) return { ok: true };
    if ((error as { code?: string }).code === 'PGRST116') return { ok: true };
    return { ok: false, reason: `${(error as { code?: string }).code ?? 'ERROR'}: ${error.message}` };
  };
}

const PROBES: SchemaProbe[] = [
  { migration: '036', description: 'gyms.mrr_cents column', run: probeColumn('gyms', 'mrr_cents') },
  { migration: '036', description: 'gyms.timezone column', run: probeColumn('gyms', 'timezone') },
  { migration: '036', description: 'gyms.logo_url column', run: probeColumn('gyms', 'logo_url') },
  { migration: '037', description: 'subscription_payments table', run: probeTable('subscription_payments') },
  { migration: '038', description: 'gym_onboarding_steps table', run: probeTable('gym_onboarding_steps') },
  { migration: '039', description: 'leads table', run: probeTable('leads') },
  { migration: '040', description: 'super_admin_audit_log table', run: probeTable('super_admin_audit_log') },
  { migration: '041', description: 'gyms.last_modified_by column', run: probeColumn('gyms', 'last_modified_by') },
  { migration: '041', description: 'gyms.last_modified_at column', run: probeColumn('gyms', 'last_modified_at') },
  { migration: '043', description: 'users.totp_secret column', run: probeColumn('users', 'totp_secret') },
  { migration: '043', description: 'users.totp_enabled_at column', run: probeColumn('users', 'totp_enabled_at') },
  { migration: '043', description: 'super_admin_recovery_codes table', run: probeTable('super_admin_recovery_codes') },
  { migration: '043', description: 'super_admin_2fa_challenges table', run: probeTable('super_admin_2fa_challenges') },
];

export interface SchemaCheckResult {
  ok: boolean;
  total: number;
  failures: { migration: string; description: string; reason: string }[];
}

export async function runSchemaProbes(): Promise<SchemaCheckResult> {
  const results = await Promise.all(
    PROBES.map(async p => {
      const r = await p.run();
      return { probe: p, result: r };
    })
  );
  const failures = results
    .filter(r => !r.result.ok)
    .map(r => ({
      migration: r.probe.migration,
      description: r.probe.description,
      reason: (r.result as { ok: false; reason: string }).reason,
    }));
  return { ok: failures.length === 0, total: PROBES.length, failures };
}

/**
 * Convenience wrapper for backend boot. Logs the result and, in production,
 * exits the process if any probe failed — Railway will surface the failed
 * deploy instead of letting the new code serve traffic against a stale DB.
 */
export async function assertSchemaReady(opts: { failHard: boolean }): Promise<void> {
  const result = await runSchemaProbes();
  if (result.ok) {
    logger.info({ probes: result.total }, 'Schema check passed');
    return;
  }
  logger.error({ failures: result.failures }, `Schema check failed: ${result.failures.length}/${result.total} probes returned an error — production may be missing migrations`);
  if (opts.failHard) {
    process.exit(1);
  }
}
