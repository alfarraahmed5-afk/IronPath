import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import api, { STORAGE_KEYS } from '../lib/api';
import { ALLOWED_ROLES } from '../lib/session';

type Step = 'credentials' | 'totp';

interface ChallengeState {
  challenge_token: string;
  expires_at: number;
}

export default function LoginPage() {
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState<ChallengeState | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const navigate = useNavigate();

  function persistSession(access_token: string, refresh_token: string, user: unknown, totpEnabled: boolean) {
    localStorage.setItem(STORAGE_KEYS.accessToken, access_token);
    localStorage.setItem(STORAGE_KEYS.refreshToken, refresh_token);
    localStorage.setItem(
      STORAGE_KEYS.user,
      JSON.stringify({ ...(user as object), totp_enabled: totpEnabled })
    );
  }

  function routeAfterLogin(totpEnabled: boolean) {
    navigate(totpEnabled ? '/gyms' : '/2fa/setup');
  }

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const data = res.data.data;

      if (data.requires_2fa) {
        setChallenge({
          challenge_token: data.challenge_token,
          expires_at: Date.now() + (data.expires_in ?? 300) * 1000,
        });
        setStep('totp');
        return;
      }

      const { access_token, refresh_token, user } = data;
      if (!user || !(ALLOWED_ROLES as readonly string[]).includes(user.role)) {
        setError('Operator access required.');
        return;
      }
      persistSession(access_token, refresh_token, user, Boolean(user.totp_enabled));
      routeAfterLogin(Boolean(user.totp_enabled));
    } catch (err: unknown) {
      setError(extractErr(err) ?? 'Sign-in failed. Verify your credentials.');
    } finally {
      setLoading(false);
    }
  }

  async function handleTotp(e: React.FormEvent) {
    e.preventDefault();
    if (!challenge) return;
    setError('');
    setLoading(true);
    try {
      const body: Record<string, string> = { challenge_token: challenge.challenge_token };
      if (useRecovery) body.recovery_code = recoveryCode.trim();
      else body.totp_code = totpCode.trim();

      const res = await api.post('/auth/2fa/verify', body);
      const { access_token, refresh_token, user } = res.data.data;
      if (!user || !(ALLOWED_ROLES as readonly string[]).includes(user.role)) {
        setError('Operator access required.');
        return;
      }
      persistSession(access_token, refresh_token, user, true);
      navigate('/gyms');
    } catch (err: unknown) {
      setError(extractErr(err) ?? 'Verification failed. Try a fresh code.');
    } finally {
      setLoading(false);
    }
  }

  function handleRestart() {
    setStep('credentials');
    setChallenge(null);
    setTotpCode('');
    setRecoveryCode('');
    setUseRecovery(false);
    setError('');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-ink-50 tracking-tight">IronPath Console</h1>
          <p className="text-ink-300 mt-1 text-sm">Operator panel</p>
        </div>

        {step === 'credentials' && (
          <form onSubmit={handleCredentials} className="bg-ink-800 border border-ink-700 rounded-lg p-7 shadow-xl">
            <h2 className="text-base font-medium text-ink-50 mb-5">Sign in</h2>
            {error && <ErrorBox message={error} />}

            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="operator@ironpath.app"
                autoComplete="email"
                required
              />
            </Field>

            <Field label="Password" mb="mb-6">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputCls} font-mono`}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </Field>

            <PrimaryButton loading={loading}>{loading ? 'Signing in' : 'Sign in'}</PrimaryButton>
          </form>
        )}

        {step === 'totp' && challenge && (
          <form onSubmit={handleTotp} className="bg-ink-800 border border-ink-700 rounded-lg p-7 shadow-xl">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={16} strokeWidth={1.75} className="text-brand-400" />
              <h2 className="text-base font-medium text-ink-50">Two-factor verification</h2>
            </div>
            <p className="text-ink-300 text-xs mb-5">
              {useRecovery
                ? 'Enter one of the recovery codes you saved at enrollment.'
                : 'Enter the 6-digit code from your authenticator app.'}
            </p>

            {error && <ErrorBox message={error} />}

            {useRecovery ? (
              <Field label="Recovery code" mb="mb-5">
                <input
                  type="text"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value)}
                  className={`${inputCls} font-mono uppercase tracking-wider`}
                  placeholder="XXXX-XXXX"
                  autoComplete="one-time-code"
                  required
                  autoFocus
                />
              </Field>
            ) : (
              <Field label="Authenticator code" mb="mb-5">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  className={`${inputCls} font-mono text-center text-lg tracking-[0.4em]`}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  required
                  autoFocus
                />
              </Field>
            )}

            <PrimaryButton loading={loading}>{loading ? 'Verifying' : 'Verify'}</PrimaryButton>

            <div className="mt-4 flex justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setUseRecovery(!useRecovery);
                  setError('');
                  setTotpCode('');
                  setRecoveryCode('');
                }}
                className="text-brand-400 hover:text-brand-300 transition-colors"
              >
                {useRecovery ? 'Use authenticator app' : 'Use recovery code'}
              </button>
              <button
                type="button"
                onClick={handleRestart}
                className="text-ink-300 hover:text-ink-100 transition-colors"
              >
                Restart sign-in
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const inputCls =
  'w-full bg-ink-700 text-ink-50 rounded-md px-3 py-2 border border-ink-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/40 text-sm';

function Field({ label, mb = 'mb-4', children }: { label: string; mb?: string; children: React.ReactNode }) {
  return (
    <div className={mb}>
      <label className="block text-xs text-ink-300 mb-1.5 font-medium uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="bg-red-950/40 border border-red-800 text-red-300 rounded-md px-3 py-2 mb-4 text-sm"
    >
      {message}
    </div>
  );
}

function PrimaryButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full bg-brand-500 hover:bg-brand-600 text-ink-950 font-medium py-2.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
    >
      {children}
    </button>
  );
}

function extractErr(err: unknown): string | null {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const r = (err as { response?: { data?: { error?: { message?: string } } } }).response;
    return r?.data?.error?.message ?? null;
  }
  return null;
}
