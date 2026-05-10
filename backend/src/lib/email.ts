import { Resend } from 'resend';
import { logger } from './logger';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@ironpath.health';

export async function sendWelcomeEmail(params: {
  to: string;
  gymName: string;
  inviteCode: string;
  appDownloadUrl: string;
  setupUrl?: string;       // Magic-link-on-create (Q1 council vote 4-0). When
                           //   present, render a primary "Set your password"
                           //   CTA at the top of the email — the owner has
                           //   no password yet and this is their only path in.
  posterTeaserUrl?: string; // Once they sign in they should land within one
                           //   click of the QR poster (plan §17 — the
                           //   activation event the whole funnel is
                           //   downstream of).
}): Promise<void> {
  try {
    const setupBlock = params.setupUrl
      ? `
        <p style="margin: 24px 0 8px;"><strong>Step 1 — set your password:</strong></p>
        <p style="margin: 0 0 24px;">
          <a href="${params.setupUrl}"
             style="display: inline-block; background: #FF6B35; color: #0A0A0B; padding: 12px 20px; border-radius: 8px; font-weight: 600; text-decoration: none;">
            Set your password
          </a>
        </p>
        <p style="color: #8A8A95; font-size: 13px; margin: 0 0 24px;">
          This link expires in 1 hour. If it expires, ask your IronPath contact for a fresh one.
        </p>
      `
      : '';

    const posterTeaserBlock = params.posterTeaserUrl
      ? `
        <p style="margin: 24px 0 8px;"><strong>Step 2 — print your wall poster:</strong></p>
        <p style="margin: 0 0 24px;">
          Once signed in, head to <em>Grow → QR poster</em> and download the A3
          wall version. Tape it to the gym wall — that single act is the most
          reliable thing you can do this week to get members on the app.
        </p>
      `
      : '';

    await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: `Welcome to ${params.gymName} on IronPath`,
      html: `
        <h1 style="margin: 0 0 8px;">Welcome to IronPath</h1>
        <p style="margin: 0 0 16px;">Your gym <strong>${params.gymName}</strong> is now live.</p>
        ${setupBlock}
        ${posterTeaserBlock}
        <p style="margin: 24px 0 8px;"><strong>Your invite code:</strong> <code style="background: #1F1F24; color: #FAFAFB; padding: 4px 8px; border-radius: 4px;">${params.inviteCode}</code></p>
        <p style="margin: 0 0 24px;">Share it with your members so they can join.</p>
        <p><a href="${params.appDownloadUrl}">Download the IronPath mobile app</a></p>
      `,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to send welcome email');
  }
}

export async function sendPasswordResetEmail(params: {
  to: string;
  resetUrl: string;
}): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: 'Reset your IronPath password',
      html: `
        <h1>Reset Your Password</h1>
        <p>Click the link below to reset your password. This link expires in 1 hour.</p>
        <p><a href="${params.resetUrl}">Reset Password</a></p>
        <p>If you did not request this, ignore this email.</p>
      `,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to send password reset email');
  }
}

export async function sendInviteEmail(params: {
  to: string;
  gymName: string;
  inviteCode: string;
  appDownloadUrl: string;
}): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: `You're invited to join ${params.gymName} on IronPath`,
      html: `
        <h1>You're invited to IronPath!</h1>
        <p><strong>${params.gymName}</strong> has invited you to join their workout community on IronPath.</p>
        <p>Use invite code: <strong>${params.inviteCode}</strong></p>
        <p><a href="${params.appDownloadUrl}">Download IronPath</a></p>
      `,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to send invite email');
  }
}
