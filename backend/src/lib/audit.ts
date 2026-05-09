import { Request } from 'express';
import { supabase } from './supabase';
import { logger } from './logger';

interface AuditEntry {
  action: string;
  target_type: string;
  target_id?: string;
  before?: unknown;
  after?: unknown;
}

export async function logAudit(req: Request, entry: AuditEntry): Promise<void> {
  // actor_user_id is NOT NULL on the table; if logAudit is called from a context
  // without req.user (defense-in-depth — every caller today is behind
  // requireSuperAdmin) we skip the insert and surface the gap in logs instead of
  // silently violating the constraint.
  if (!req.user?.id) {
    logger.error({ action: entry.action }, 'Audit skipped: no req.user');
    return;
  }

  try {
    await supabase.from('super_admin_audit_log').insert({
      actor_user_id: req.user.id,
      action: entry.action,
      target_type: entry.target_type,
      target_id: entry.target_id ?? null,
      before: entry.before ?? null,
      after: entry.after ?? null,
      ip: req.ip ?? null,
      user_agent: req.headers['user-agent'] ?? null,
    });
  } catch (err) {
    logger.error({ err, action: entry.action }, 'Audit insert failed');
  }
}
