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

/**
 * Probe a SQL function by RPC. Used for migrations that ship a function
 * (not a column or table). The function must accept whatever args we
 * pass and return without 42883 (undefined function) -- we don't care
 * about the result, only that PostgREST can resolve the symbol.
 */
function probeFunction(fnName: string, args: Record<string, unknown>) {
  return async (): Promise<{ ok: true } | { ok: false; reason: string }> => {
    const { error } = await supabase.rpc(fnName, args);
    if (!error) return { ok: true };
    const code = (error as { code?: string }).code ?? 'ERROR';
    // 42883 = undefined_function. PGRST202 = function not found in
    // PostgREST schema cache. Both mean the migration is missing.
    // Anything else (e.g. a runtime data error) means the function
    // exists, which is all this probe checks for.
    if (code === '42883' || code === 'PGRST202') {
      return { ok: false, reason: `${code}: ${error.message}` };
    }
    return { ok: true };
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
  { migration: '044', description: 'gyms.onboarding_completed_at column', run: probeColumn('gyms', 'onboarding_completed_at') },
  { migration: '045', description: 'trial_emails_sent table', run: probeTable('trial_emails_sent') },
  { migration: '046', description: 'gym_milestones table', run: probeTable('gym_milestones') },
  { migration: '047', description: 'cancellation_log table', run: probeTable('cancellation_log') },
  { migration: '048', description: 'demo_sessions table', run: probeTable('demo_sessions') },
  { migration: '049', description: 'leads.member_count column', run: probeColumn('leads', 'member_count') },
  // BE-D (cinematic overhaul) -- streak day fields.
  { migration: '050', description: 'streaks.current_streak_days column', run: probeColumn('streaks', 'current_streak_days') },
  { migration: '050', description: 'streaks.longest_streak_days column', run: probeColumn('streaks', 'longest_streak_days') },
  { migration: '050', description: 'streaks.last_workout_at column', run: probeColumn('streaks', 'last_workout_at') },
  // BE-H (cinematic overhaul) -- gym_volume_percentile SQL function.
  // Probed with the all-zero UUID; the function returns NULL for
  // unknown users which is fine -- we only care that the symbol
  // resolves at boot.
  {
    migration: '051',
    description: 'gym_volume_percentile() function',
    run: probeFunction('gym_volume_percentile', { p_user_id: '00000000-0000-0000-0000-000000000000' }),
  },
  // BE-N (cinematic overhaul) -- streak tier ladder.
  { migration: '052', description: 'streak_tier_thresholds table', run: probeTable('streak_tier_thresholds') },
  { migration: '052', description: 'streak_tier_thresholds.threshold_days column', run: probeColumn('streak_tier_thresholds', 'threshold_days') },
  // BE-E (cinematic overhaul) -- monthly recaps.
  { migration: '053', description: 'monthly_recaps table', run: probeTable('monthly_recaps') },
  { migration: '053', description: 'monthly_recaps.period_key column', run: probeColumn('monthly_recaps', 'period_key') },
  // BE-F (cinematic overhaul) -- user goals.
  { migration: '054', description: 'user_goals table', run: probeTable('user_goals') },
  { migration: '054', description: 'user_goals.goal_type column', run: probeColumn('user_goals', 'goal_type') },
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
