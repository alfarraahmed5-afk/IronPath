import { useEffect, useState } from 'react';
import api from '../lib/api';

interface Announcement {
  id: string;
  title: string;
  body: string;
  is_pinned: boolean;
  created_at: string;
}

interface FormState {
  title: string;
  body: string;
  is_pinned: boolean;
}

function emptyForm(): FormState {
  return { title: '', body: '', is_pinned: false };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/announcements');
      setItems(res.data.data.announcements ?? []);
    } catch {
      setError('Failed to load announcements.');
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

  function openEdit(item: Announcement) {
    setEditingId(item.id);
    setForm({ title: item.title, body: item.body, is_pinned: item.is_pinned });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  }

  async function handleSave() {
    if (!form.title.trim() || !form.body.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/admin/announcements/${editingId}`, form);
        setItems(prev => prev.map(a => a.id === editingId ? { ...a, ...form } : a));
      } else {
        const res = await api.post('/admin/announcements', form);
        setItems(prev => [res.data.data.announcement, ...prev]);
      }
      cancelForm();
    } catch (err) {
      const e = err as any;
      const msg = e?.response?.data?.error?.message ?? e?.message ?? 'Failed to save announcement.';
      alert(`Failed to save announcement: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await api.delete(`/admin/announcements/${id}`);
      setItems(prev => prev.filter(a => a.id !== id));
    } catch {
      alert('Failed to delete announcement.');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Announcements</h1>
          <p className="text-gray-400 text-sm mt-1">Post updates and notices to your gym members</p>
        </div>
        <button
          onClick={openNew}
          className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-colors"
        >
          + New Announcement
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-white font-semibold mb-4">
            {editingId ? 'Edit Announcement' : 'New Announcement'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Title</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                placeholder="Announcement title"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Body</label>
              <textarea
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 min-h-[6rem] resize-y"
                placeholder="Announcement content…"
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 accent-orange-500"
                checked={form.is_pinned}
                onChange={e => setForm(f => ({ ...f, is_pinned: e.target.checked }))}
              />
              <span className="text-gray-300 text-sm">Pin this announcement</span>
            </label>
          </div>
          <div className="flex gap-3 mt-5">
            <button
              onClick={handleSave}
              disabled={saving || !form.title.trim() || !form.body.trim()}
              className="px-5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold text-sm transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
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
              <div className="h-4 bg-gray-800 rounded w-1/3 mb-3" />
              <div className="h-3 bg-gray-800 rounded w-full mb-2" />
              <div className="h-3 bg-gray-800 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-red-400 text-center py-12">{error}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          No announcements yet. Create one to keep your members informed.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {item.is_pinned && <span title="Pinned">📌</span>}
                  <h3 className="text-white font-semibold">{item.title}</h3>
                </div>
                <span className="text-gray-500 text-xs shrink-0 ml-4">{formatDate(item.created_at)}</span>
              </div>
              <p className="text-gray-400 text-sm line-clamp-3 mb-4">{item.body}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => openEdit(item)}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-sm text-red-500 hover:text-red-400 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
