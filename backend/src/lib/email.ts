import { Resend } from 'resend';
import { logger } from './logger';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@ironpath.app';

export async function sendWelcomeEmail(params: {
  to: string;
  gymName: string;
  inviteCode: string;
  appDownloadUrl: string;
}): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: `Welcome to ${params.gymName} on IronPath!`,
      html: `
        <h1>Welcome to IronPath!</h1>
        <p>Your gym <strong>${params.gymName}</strong> is now live on IronPath.</p>
        <p>Share this invite code with your members: <strong>${params.inviteCode}</strong></p>
        <p><a href="${params.appDownloadUrl}">Download the IronPath app</a></p>
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
