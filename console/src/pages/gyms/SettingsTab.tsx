import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import { useGymQuery } from '../../lib/queries';

export default function SettingsTab() {
  const { gymId } = useParams<{ gymId: string }>();
  const { data } = useGymQuery(gymId);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!data) return null;
  const { gym } = data;

  return (
    <div className="space-y-6">
      <section className="border border-red-500/40 bg-red-500/5 rounded-lg p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} strokeWidth={1.75} className="text-red-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-ink-50">Danger zone</h2>
            <p className="text-xs text-ink-300 mt-1 leading-relaxed">
              Deleting this gym is permanent. All members, workouts, routines, custom
              exercises, announcements, leaderboards, payment history, and audit
              records for {gym.name} will be removed. The owner and every member
              will lose access to the mobile app immediately.
            </p>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-medium border border-red-500/30 transition-colors"
              data-testid="open-delete-gym-modal"
            >
              <Trash2 size={14} strokeWidth={1.75} />
              Delete gym
            </button>
          </div>
        </div>
      </section>

      {confirmOpen && (
        <DeleteGymModal
          gymId={gym.id}
          gymName={gym.name}
          onClose={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}

function DeleteGymModal({
  gymId,
  gymName,
  onClose,
}: {
  gymId: string;
  gymName: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, submitting]);

  const canSubmit = confirmText === 'DELETE' && !submitting;

  async function handleDelete() {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      await api.delete(`/super-admin/gyms/${gymId}`);
      queryClient.invalidateQueries({ queryKey: ['gyms'] });
      queryClient.removeQueries({ queryKey: ['gym', gymId] });
      navigate('/gyms', { replace: true });
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message
          : null;
      setError(msg ?? 'Could not delete gym. Try again.');
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-gym-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="w-full max-w-md bg-ink-900 border border-ink-700 rounded-lg shadow-2xl">
        <div className="p-5 border-b border-ink-700">
          <div className="flex items-center gap-2.5">
            <Trash2 size={18} strokeWidth={1.75} className="text-red-400" />
            <h2 id="delete-gym-title" className="text-base font-semibold text-ink-50">
              Delete {gymName}
            </h2>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-ink-200 leading-relaxed">
            This deletes every member account, workout, routine, custom exercise,
            announcement, leaderboard, payment record, and audit entry for this gym.
            It cannot be undone.
          </p>
          <div>
            <label htmlFor="delete-confirm" className="block text-xs text-ink-300 mb-1.5">
              Type <span className="font-mono text-ink-100">DELETE</span> to confirm.
            </label>
            <input
              id="delete-confirm"
              ref={inputRef}
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={submitting}
              autoComplete="off"
              spellCheck={false}
              className="w-full px-3 py-2 rounded-md bg-ink-800 border border-ink-700 text-ink-50 font-mono text-sm focus:outline-none focus:border-red-500/60 transition-colors disabled:opacity-50"
              data-testid="delete-gym-confirm-input"
            />
          </div>
          {error && (
            <p role="alert" className="text-xs text-red-400">{error}</p>
          )}
        </div>

        <div className="p-5 border-t border-ink-700 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-3 py-2 rounded-md text-xs text-ink-300 hover:text-ink-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="delete-gym-confirm-submit"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {submitting ? 'Deleting' : 'Delete forever'}
          </button>
        </div>
      </div>
    </div>
  );
}
