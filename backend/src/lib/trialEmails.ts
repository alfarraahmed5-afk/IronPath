import { Resend } from 'resend';
import { logger } from './logger';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@ironpath.health';

export const TRIAL_EMAIL_KEYS = [
  'day_21',
  'day_25',
  'day_28',
  'day_30',
  'day_31_locked',
  'day_37_member',
] as const;
export type TrialEmailKey = typeof TRIAL_EMAIL_KEYS[number];

interface TrialEmailContext {
  gymName: string;
  ownerEmail: string;
  memberCount: number;
  workoutsLogged: number;
  daysLeft: number;
  upgradeUrl: string;
}

// Each template returns { subject, html }. Copy follows plan §4.4 + plan §3.8 voice
// (verbs first, no exclamations, no "Oops!", warm but not chatty).
function template(key: TrialEmailKey, ctx: TrialEmailContext): { subject: string; html: string } {
  switch (key) {
    case 'day_21':
      return {
        subject: `9 days left on your IronPath trial`,
        html: `<h1>9 days left.</h1>
          <p>${ctx.gymName} has logged ${ctx.workoutsLogged} workouts. ${ctx.memberCount} members are using IronPath right now.</p>
          <p>Here's what you'd lose if the trial expires:</p>
          <ul>
            <li>The leaderboard</li>
            <li>Member workout history</li>
            <li>Your QR poster + invite kit</li>
          </ul>
          <p><a href="${ctx.upgradeUrl}" style="display:inline-block;background:#C8102E;color:#0A0A0B;padding:12px 20px;border-radius:8px;font-weight:600;text-decoration:none;">Upgrade your plan</a></p>`,
      };
    case 'day_25':
      return {
        subject: `Your gym's progress on IronPath`,
        html: `<h1>5 days left.</h1>
          <p>${ctx.memberCount} members. ${ctx.workoutsLogged} workouts logged. The data tells a story — your gym uses this.</p>
          <p>The math: even at $49/month, IronPath costs less than one drop-off member per year. Your members are showing up. The product's earning its keep.</p>
          <p><a href="${ctx.upgradeUrl}" style="display:inline-block;background:#C8102E;color:#0A0A0B;padding:12px 20px;border-radius:8px;font-weight:600;text-decoration:none;">Continue with IronPath</a></p>`,
      };
    case 'day_28':
      return {
        subject: `2 days left — keep your members on IronPath`,
        html: `<h1>2 days left.</h1>
          <p>${ctx.memberCount} members will lose access if your trial expires. The leaderboard, workout history, all of it.</p>
          <p>Members keep read-only access for 7 days after expiry, but new workouts won't log.</p>
          <p><a href="${ctx.upgradeUrl}" style="display:inline-block;background:#C8102E;color:#0A0A0B;padding:12px 20px;border-radius:8px;font-weight:600;text-decoration:none;">Don't lose the data</a></p>`,
      };
    case 'day_30':
      return {
        subject: `Your IronPath trial ends today`,
        html: `<h1>Last call.</h1>
          <p>Your trial ends in a few hours. After that, your panel locks to billing only.</p>
          <p>${ctx.memberCount} members · ${ctx.workoutsLogged} workouts · 30 days of momentum. Don't reset that to zero.</p>
          <p><a href="${ctx.upgradeUrl}" style="display:inline-block;background:#C8102E;color:#0A0A0B;padding:12px 20px;border-radius:8px;font-weight:600;text-decoration:none;">Convert to paid</a></p>`,
      };
    case 'day_31_locked':
      return {
        subject: `Your IronPath panel is locked`,
        html: `<h1>Trial ended.</h1>
          <p>Your panel is locked to billing only. Members keep read-only access for 7 more days — after that, they'll see "${ctx.gymName} needs to renew."</p>
          <p><a href="${ctx.upgradeUrl}" style="display:inline-block;background:#C8102E;color:#0A0A0B;padding:12px 20px;border-radius:8px;font-weight:600;text-decoration:none;">Reactivate ${ctx.gymName}</a></p>`,
      };
    case 'day_37_member':
      // Note: this email goes to MEMBERS, not the owner. The cron caller chooses the recipient list.
      return {
        subject: `${ctx.gymName} on IronPath — needs a renewal`,
        html: `<h1>${ctx.gymName} needs to renew.</h1>
          <p>Your gym's IronPath subscription has expired. Workouts you've logged are still here — but new ones won't save until the gym reactivates.</p>
          <p>If you'd like to nudge them: tell your gym owner about IronPath.</p>`,
      };
  }
}

export async function sendTrialEmail(key: TrialEmailKey, to: string, ctx: TrialEmailContext): Promise<void> {
  try {
    const { subject, html } = template(key, ctx);
    await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
  } catch (err) {
    logger.error({ err, key, to }, 'Trial email send failed');
    throw err;
  }
}
