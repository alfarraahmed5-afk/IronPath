import { useEffect, useState } from 'react';
import api from '../lib/api';

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  metric: 'total_volume' | 'workout_count' | 'exercise_volume' | 'exercise_1rm';
  exercise_id: string | null;
  starts_at: string;
  ends_at: string;
  status: 'upcoming' | 'active' | 'completed';
}

interface FormState {
  title: string;
  description: string;
  metric: string;
  starts_at: string;
  ends_at: string;
}

const METRIC_LABELS: Record<string, string> = {
  total_volume: 'Total Volume',
  workout_count: 'Workout Count',
  exercise_volume: 'Exercise Volume',
  exercise_1rm: 'Exercise 1RM',
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  upcoming: { label: 'UPCOMING', cls: 'bg-blue-500/20 text-blue-400' },
  active: { label: 'ACTIVE', cls: 'bg-green-500/20 text-green-400' },
  completed: { label: 'COMPLETED', cls: 'bg-gray-700 text-gray-400' },
};

function formatDateRange(start: string, end: string) {
  const fmt = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

function toLocalDatetime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyForm(): FormState {
  return { title: '', description: '', metric: 'total_volume', starts_at: '', ends_at: '' };
}

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/challenges');
      setChallenges(res.data.data.challenges ?? []);
    } catch {
      setError('Failed to load challenges.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(c: Challenge) {
    setEditingId(c.id);
    setForm({
      title: c.title,
      description: c.description ?? '',
      metric: c.metric,
      starts_at: toLocalDatetime(c.starts_at),
      ends_at: toLocalDatetime(c.ends_at),
    });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  }

  async function handleSave() {
    if (!form.title.trim() || !form.starts_at || !form.ends_at) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        metric: form.metric,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
      };
      if (editingId) {
        await api.patch(`/admin/challenges/${editingId}`, payload);
        setChallenges(prev => prev.map(c =>
          c.id === editingId ? { ...c, title: payload.title, description: payload.description, starts_at: payload.starts_at, ends_at: payload.ends_at } : c
        ));
      } else {
        const res = await api.post('/admin/challenges', payload);
        setChallenges(prev => [res.data.data.challenge, ...prev]);
      }
      cancelForm();
    } catch (err) {
      const e = err as any;
      const msg = e?.response?.data?.error?.message ?? e?.message ?? 'Failed to save challenge.';
      alert(`Failed to save challenge: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this challenge? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/challenges/${id}`);
      setChallenges(prev => prev.filter(c => c.id !== id));
    } catch {
      alert('Failed to delete challenge.');
    }
  }

  const canEdit = (c: Challenge) => c.status === 'upcoming';

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Challenges</h1>
          <p className="text-gray-400 text-sm mt-1">Create competitive challenges for your gym members</p>
        </div>
        <button
          onClick={openNew}
          className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-colors"
        >
          + New Challenge
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-white font-semibold mb-4">
            {editingId ? 'Edit Challenge' : 'New Challenge'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-gray-400 text-sm mb-1">Title</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                placeholder="Challenge title"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-400 text-sm mb-1">Description (optional)</label>
              <textarea
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 resize-y"
                rows={3}
                placeholder="Describe the challenge…"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            {!editingId && (
              <div>
                <label className="block text-gray-400 text-sm mb-1">Metric</label>
                <select
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                  value={form.metric}
                  onChange={e => setForm(f => ({ ...f, metric: e.target.value }))}
                >
                  {Object.entries(METRIC_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-gray-400 text-sm mb-1">Start Date</label>
              <input
                type="datetime-local"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                value={form.starts_at}
                onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">End Date</label>
              <input
                type="datetime-local"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                value={form.ends_at}
                onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button
              onClick={handleSave}
              disabled={saving || !form.title.trim() || !form.starts_at || !form.ends_at}
              className="px-5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold text-sm transition-colors"
            >
              {saving ? 'Saving…' : 'Save Challenge'}
            </button>
            <button
              onClick={cancelForm}
              className="px-5 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-900 rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-gray-800 rounded w-1/2 mb-3" />
              <div className="h-3 bg-gray-800 rounded w-1/4 mb-2" />
              <div className="h-3 bg-gray-800 rounded w-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-red-400 text-center py-12">{error}</div>
      ) : challenges.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          No challenges yet. Create one to motivate your members!
        </div>
      ) : (
        <div className="space-y-4">
          {challenges.map(c => {
            const badge = STATUS_BADGE[c.status] ?? STATUS_BADGE.completed;
            return (
              <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-white font-semibold">{c.title}</h3>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>
                      {badge.label}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
                      {METRIC_LABELS[c.metric] ?? c.metric}
                    </span>
                  </div>
                </div>
                <p className="text-gray-500 text-sm mb-2">{formatDateRange(c.starts_at, c.ends_at)}</p>
                {c.description && (
                  <p className="text-gray-400 text-sm mb-3">{c.description}</p>
                )}
                {canEdit(c) ? (
                  <div className="flex gap-3">
                    <button
                      onClick={() => openEdit(c)}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-sm text-red-500 hover:text-red-400 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                ) : (
                  <p className="text-gray-600 text-xs italic">
                    {c.status === 'active' ? 'Challenge in progress — editing locked' : 'Challenge completed'}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
