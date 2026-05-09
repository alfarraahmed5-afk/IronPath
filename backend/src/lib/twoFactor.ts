import { authenticator } from 'otplib';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import QRCode from 'qrcode';

// ─── TOTP ──────────────────────────────────────────────────────────────────

// otplib defaults: SHA1, 30s step, 6 digits — these are the values every
// authenticator app (Google Authenticator, Authy, 1Password, Bitwarden) treats
// as defaults. window=1 lets a code from the previous OR next 30s slot pass to
// account for clock skew without widening the brute-force surface meaningfully.
authenticator.options = { window: 1 };

const ISSUER = 'IronPath';

export interface TotpEnrollment {
  secret: string;
  otpauth_url: string;
  qr_data_url: string;
}

export async function createTotpEnrollment(accountLabel: string): Promise<TotpEnrollment> {
  const secret = authenticator.generateSecret();
  const otpauth_url = authenticator.keyuri(accountLabel, ISSUER, secret);
  const qr_data_url = await QRCode.toDataURL(otpauth_url, { margin: 1, scale: 6 });
  return { secret, otpauth_url, qr_data_url };
}

export function verifyTotp(secret: string, token: string): boolean {
  if (!/^\d{6}$/.test(token)) return false;
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}

// ─── Recovery codes ────────────────────────────────────────────────────────

// 8 chars, upper hex, hyphen-broken: "A3F2-91CD". Avoids 0/O/1/I confusion by
// using hex; collision space is 16^8 (~4.3B) per code which is fine for a
// per-user 10-code list. Hashed with sha256 before storage; raw codes are
// shown to the operator exactly once.
const RECOVERY_CODE_COUNT = 10;

export function generateRecoveryCodes(count: number = RECOVERY_CODE_COUNT): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const buf = randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${buf.slice(0, 4)}-${buf.slice(4, 8)}`);
  }
  return codes;
}

export function hashRecoveryCode(raw: string): string {
  return createHash('sha256').update(raw.toUpperCase().replace(/\s+/g, '')).digest('hex');
}

export function normalizeRecoveryCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

// ─── Challenge tokens (login bridge) ───────────────────────────────────────

// 32 random bytes → 64-char hex. The challenge token is the bearer the client
// holds between password-success and TOTP-success; only its sha256 hash sits
// on disk. 5-minute TTL is well past any human-paced TOTP entry but short
// enough to keep the leaked-token blast radius tight.
export const CHALLENGE_TTL_SECONDS = 300;

export function generateChallengeToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashChallengeToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

// Constant-time compare for code-lookup paths where the input shape is fully
// controlled (sha256 hex strings of equal length). Falls back to false if
// lengths differ rather than throwing — caller treats as a miss.
export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}
