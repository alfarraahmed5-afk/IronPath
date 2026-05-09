import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { isAllowedRole } from '../lib/session';

// Only honor a `next` redirect if it's a same-origin path. Reject empty,
// protocol-relative (`//evil.com`), absolute URLs, and anything containing a
// backslash (some browsers normalize `\` → `/` in Location, opening a redirect
// hole if a future contributor swaps `navigate(next)` for `window.location.href`).
function sanitizeNext(raw: string | null): string {
  if (!raw) return '/dashboard';
  if (!raw.startsWith('/')) return '/dashboard';
  if (raw.startsWith('//')) return '/dashboard';
  if (raw.includes('\\')) return '/dashboard';
  return raw;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const reason = searchParams.get('reason');
  const next = sanitizeNext(searchParams.get('next'));
  const showSessionExpired = reason === 'session_expired';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { access_token, refresh_token, user } = res.data.data;

      if (!isAllowedRole(user?.role)) {
        setError('Admin access required. Use the mobile app to track workouts.');
        return;
      }

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(user));
      navigate(next, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">IronPath</h1>
          <p className="text-gray-400 mt-1">Gym Admin Panel</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl p-8 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-6">Sign In</h2>

          {showSessionExpired && !error && (
            <div className="bg-gray-800/60 border border-gray-700 text-gray-300 rounded-lg px-4 py-3 mb-4 text-sm">
              Your session ended. Sign in to continue.
            </div>
          )}

          {error && (
            <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none"
              placeholder="owner@yourgym.com"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:border-orange-500 focus:outline-none"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
