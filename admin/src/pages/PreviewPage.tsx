import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Logomark } from '../components/Logomark';

/**
 * Landing page for the lightweight "preview as owner" mint (Q2 council
 * decision). The operator clicks "Preview as owner" in the console;
 * Supabase verifies the magic link and redirects here with
 * `#access_token=...&refresh_token=...&type=magiclink`. We store the
 * tokens, call /admin/me to fetch the owner's profile, then land in
 * the dashboard as that owner.
 *
 * No persistent banner yet — that polish is Phase D's full impersonation
 * (plan §5.9). For now the operator just remembers they're in a separate
 * tab and closes it when done.
 */
function parseHashParams(): URLSearchParams {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  return new URLSearchParams(hash);
}

export default function PreviewPage() {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const params = parseHashParams();
      const errorCode = params.get('error_code') || params.get('error');
      if (errorCode) {
        setError('Preview link expired or invalid. Generate a fresh one from the console.');
        return;
      }
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (!accessToken) {
        setError('Preview token missing. Generate a fresh one from the console.');
        return;
      }

      // Stash tokens FIRST so the /admin/me call carries the new session.
      localStorage.setItem('access_token', accessToken);
      if (refreshToken) localStorage.setItem('refresh_token', refreshToken);

      try {
        const meRes = await api.get('/admin/me');
        if (cancelled) return;
        const user = meRes.data?.data?.user;
        if (!user || user.role !== 'gym_owner') {
          setError('Preview session is not bound to a gym owner. Try again from the console.');
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          return;
        }
        localStorage.setItem('user', JSON.stringify(user));
        // Clear the hash so a refresh doesn't re-enter the magic-link flow.
        window.history.replaceState({}, document.title, window.location.pathname);
        navigate('/dashboard', { replace: true });
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.response?.data?.error?.message || 'Could not start preview session.');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-900 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2.5 mb-2">
            <Logomark size={28} />
            <span className="text-ink-50 font-semibold text-xl tracking-tight">IronPath</span>
          </div>
        </div>

        {!error ? (
          <div className="surface-card p-7 text-center text-ink-300 text-sm">
            Starting preview session…
          </div>
        ) : (
          <div className="surface-card p-7">
            <h2 className="text-base font-medium text-ink-50 mb-2">Preview unavailable</h2>
            <p className="text-ink-300 text-sm mb-5">{error}</p>
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className="w-full bg-brand-500 hover:bg-brand-600 text-ink-950 font-medium py-2.5 rounded-md transition-colors text-sm"
            >
              Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
