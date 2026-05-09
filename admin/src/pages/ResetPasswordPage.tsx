import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Logomark } from '../components/Logomark';

/**
 * Final leg of the magic-link-on-create flow (Phase C onboarding, Q1
 * council vote 4-0). The owner clicks "Set your password" in their welcome
 * email → Supabase verifies the token, redirects here with
 * `#access_token=...&refresh_token=...&type=recovery` in the URL hash →
 * we POST {access_token, new_password} to the backend, then store the
 * session and land in the dashboard.
 *
 * Hash fragments don't get sent to the server, so this page is the only
 * place the recovery tokens exist client-side.
 */
function parseHashParams(): URLSearchParams {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  return new URLSearchParams(hash);
}

export default function ResetPasswordPage() {
  const [stage, setStage] = useState<'loading' | 'form' | 'submitting' | 'expired' | 'success'>('loading');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const params = parseHashParams();
    const token = params.get('access_token');
    const errorCode = params.get('error_code') || params.get('error');
    if (errorCode === 'otp_expired' || errorCode === 'access_denied') {
      setStage('expired');
      return;
    }
    if (!token) {
      setStage('expired');
      return;
    }
    setAccessToken(token);
    setStage('form');
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!accessToken) {
      setError('Recovery token missing. Open the link from your email again.');
      return;
    }
    setStage('submitting');
    try {
      const res = await api.post('/auth/set-password', {
        access_token: accessToken,
        new_password: password,
      });
      const { access_token, user } = res.data.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      // Clear the hash so a refresh doesn't re-enter the recovery flow.
      window.history.replaceState({}, document.title, window.location.pathname);
      setStage('success');
      setTimeout(() => navigate('/dashboard', { replace: true }), 800);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Could not set password. Try again.');
      setStage('form');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-900 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2.5 mb-2">
            <Logomark size={28} />
            <span className="text-ink-50 font-semibold text-xl tracking-tight">IronPath</span>
          </div>
          <p className="text-ink-400 text-sm">Set your password</p>
        </div>

        {stage === 'loading' && (
          <div className="surface-card p-7 text-center text-ink-400 text-sm">
            Verifying recovery link…
          </div>
        )}

        {stage === 'expired' && (
          <div className="surface-card p-7">
            <h2 className="text-base font-medium text-ink-50 mb-2">Recovery link expired</h2>
            <p className="text-ink-300 text-sm mb-5">
              The link you clicked has expired or was already used. Ask your IronPath
              contact to send a fresh one.
            </p>
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className="w-full bg-brand-500 hover:bg-brand-600 text-ink-950 font-medium py-2.5 rounded-md transition-colors text-sm"
            >
              Back to sign in
            </button>
          </div>
        )}

        {(stage === 'form' || stage === 'submitting') && (
          <form onSubmit={handleSubmit} className="surface-card p-7">
            <h2 className="text-base font-medium text-ink-50 mb-5">Choose a password</h2>

            {error && (
              <div role="alert" className="bg-red-950/40 border border-red-800 text-red-300 rounded-md px-3 py-2 mb-4 text-sm">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-xs text-ink-300 mb-1.5 font-medium uppercase tracking-wider">
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-ink-800 text-ink-50 rounded-md px-3 py-2 border border-ink-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/40 text-sm font-mono"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                required
                autoFocus
                minLength={8}
              />
            </div>

            <div className="mb-6">
              <label className="block text-xs text-ink-300 mb-1.5 font-medium uppercase tracking-wider">
                Confirm password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-ink-800 text-ink-50 rounded-md px-3 py-2 border border-ink-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/40 text-sm font-mono"
                placeholder="Re-enter the same password"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              disabled={stage === 'submitting'}
              className="w-full bg-brand-500 hover:bg-brand-600 text-ink-950 font-medium py-2.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {stage === 'submitting' ? 'Saving' : 'Save password and continue'}
            </button>
          </form>
        )}

        {stage === 'success' && (
          <div className="surface-card p-7 text-center">
            <h2 className="text-base font-medium text-ink-50 mb-2">Password saved</h2>
            <p className="text-ink-300 text-sm">Taking you to the dashboard…</p>
          </div>
        )}
      </div>
    </div>
  );
}
