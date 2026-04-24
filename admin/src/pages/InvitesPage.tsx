import { useEffect, useState } from 'react';
import api from '../lib/api';

interface Invite {
  id: string;
  code: string;
  created_at: string;
  expires_at: string | null;
  uses: number;
  max_uses: number | null;
  is_active: boolean;
}

export default function InvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInvites();
  }, []);

  async function fetchInvites() {
    try {
      setLoading(true);
      const res = await api.get('/admin/invites');
      setInvites(res.data.data.invites);
    } catch (err) {
      setError('Failed to load invite codes.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body: { max_uses?: number; expires_at?: string } = {};
      if (maxUses) body.max_uses = parseInt(maxUses, 10);
      if (expiresAt) body.expires_at = expiresAt;
      const res = await api.post('/admin/invites', body);
      const newInvite: Invite = res.data.data.invite;
      setInvites((prev) => [newInvite, ...prev]);
      setShowForm(false);
      setMaxUses('');
      setExpiresAt('');
    } catch (err) {
      setError('Failed to create invite code.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!window.confirm('Revoke this invite code? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/invites/${id}`);
      setInvites((prev) => prev.filter((inv) => inv.id !== id));
    } catch (err) {
      setError('Failed to revoke invite code.');
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Invite Codes</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Generate New
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-semibold mb-4">New Invite Code</h2>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-400">Max Uses</label>
              <input
                type="number"
                min={1}
                placeholder="Unlimited"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-400">Expires At</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                {submitting ? 'Creating…' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setMaxUses('');
                  setExpiresAt('');
                }}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="text-gray-400">Loading invite codes…</div>
      ) : invites.length === 0 ? (
        <div className="text-gray-500 text-center py-16">No active invite codes</div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 uppercase text-xs tracking-wider">
                <th className="text-left px-5 py-3">Code</th>
                <th className="text-left px-5 py-3">Uses</th>
                <th className="text-left px-5 py-3">Expires</th>
                <th className="text-left px-5 py-3">Created</th>
                <th className="text-left px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((invite, idx) => (
                <tr
                  key={invite.id}
                  className={`border-b border-gray-800 last:border-0 ${idx % 2 === 0 ? '' : 'bg-gray-900/50'}`}
                >
                  <td className="px-5 py-4">
                    <span className="font-mono font-bold text-orange-500 tracking-wider">
                      {invite.code}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-300">
                    {invite.uses} / {invite.max_uses != null ? invite.max_uses : '∞'}
                  </td>
                  <td className="px-5 py-4 text-gray-300">{formatDate(invite.expires_at)}</td>
                  <td className="px-5 py-4 text-gray-300">{formatDate(invite.created_at)}</td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => handleRevoke(invite.id)}
                      className="text-red-400 hover:text-red-300 font-medium transition-colors"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
