import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { sendTrialEmail, TrialEmailKey } from '../lib/trialEmails';

const ADMIN_URL = process.env.ADMIN_URL || 'https://iron-path-admin.vercel.app';

// Compute which trial-expiry emails are due to fire today across all trial gyms.
// Day reference points (per plan §4.4):
//   day_21 — 9 days left
//   day_25 — 5 days left
//   day_28 — 2 days left
//   day_30 — last day
//   day_31_locked — 1 day past expiry (panel locks)
//   day_37_member — 7 days past expiry (member-side notice)
//
// We compute days-until-expiry from gyms.subscription_expires_at instead of
// gym age — matches what the operator sees in the trial banner.
function emailKeyForDaysUntilExpiry(daysUntil: number): TrialEmailKey | null {
  if (daysUntil === 9) return 'day_21';
  if (daysUntil === 5) return 'day_25';
  if (daysUntil === 2) return 'day_28';
  if (daysUntil === 0) return 'day_30';
  if (daysUntil === -1) return 'day_31_locked';
  if (daysUntil === -7) return 'day_37_member';
  return null;
}

export async function runTrialEmailsJob(): Promise<{ scanned: number; sent: number }> {
  const { data: gyms, error } = await supabase
    .from('gyms')
    .select('id, name, subscription_status, subscription_expires_at')
    .eq('subscription_status', 'trial');
  if (error) {
    logger.error({ err: error }, 'Trial email cron: gym list failed');
    return { scanned: 0, sent: 0 };
  }
  let sent = 0;

  for (const gym of gyms ?? []) {
    if (!gym.subscription_expires_at) continue;
    const expires = new Date(gym.subscription_expires_at).getTime();
    const daysUntil = Math.round((expires - Date.now()) / 86400000);
    const key = emailKeyForDaysUntilExpiry(daysUntil);
    if (!key) continue;

    // Idempotency check: never double-send the same key to the same gym.
    const { data: alreadySent } = await supabase
      .from('trial_emails_sent')
      .select('id')
      .eq('gym_id', gym.id)
      .eq('email_key', key)
      .maybeSingle();
    if (alreadySent) continue;

    // Find the owner email (or members for the day_37 notice).
    let recipients: string[] = [];
    if (key === 'day_37_member') {
      const { data: members } = await supabase
        .from('users')
        .select('email')
        .eq('gym_id', gym.id)
        .eq('role', 'member')
        .eq('is_active', true)
        .is('deleted_at', null)
        .limit(500);
      recipients = (members ?? []).map(m => m.email).filter(Boolean) as string[];
    } else {
      const { data: owner } = await supabase
        .from('users')
        .select('email')
        .eq('gym_id', gym.id)
        .eq('role', 'gym_owner')
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle();
      if (owner?.email) recipients = [owner.email];
    }

    if (recipients.length === 0) continue;

    // Pull stats for the email body. Best-effort.
    const { count: memberCount } = await supabase.from('users').select('id', { count: 'exact', head: true })
      .eq('gym_id', gym.id).eq('role', 'member').eq('is_active', true).is('deleted_at', null);
    const { count: workoutCount } = await supabase.from('workouts').select('id', { count: 'exact', head: true })
      .eq('gym_id', gym.id).eq('is_completed', true);

    const ctx = {
      gymName: gym.name,
      ownerEmail: recipients[0],
      memberCount: memberCount ?? 0,
      workoutsLogged: workoutCount ?? 0,
      daysLeft: Math.max(0, daysUntil),
      upgradeUrl: `${ADMIN_URL}/subscription`,
    };

    let allSent = true;
    for (const to of recipients) {
      try {
        await sendTrialEmail(key, to, ctx);
      } catch {
        allSent = false;
      }
    }

    if (allSent) {
      await supabase.from('trial_emails_sent').insert({
        gym_id: gym.id, email_key: key, recipient_email: recipients[0], metadata: { recipients_count: recipients.length },
      });
      sent++;
    }
  }

  return { scanned: gyms?.length ?? 0, sent };
}
