// Team Alpha α3 — Onboarding wizard, Step 2: print and post the QR poster.
//
// Plan §17 names this the single most important activation step: until the
// poster is on the wall, the gym has no acquisition channel. The UI here is
// deliberately one-thing-at-a-time — generate/show the invite code, give
// two prominent download buttons (A4 + A3), then a hard commitment toggle
// ("I've posted it") that the operator must press themselves. We never
// auto-advance on download, because downloading a PDF is not the goal —
// the goal is the physical taping of paper to the wall.

import { useEffect, useState } from 'react';
import { Download, Loader2, Check, Copy } from 'lucide-react';
import api from '@/lib/api';
import { EmberSeam } from '@/components/EmberSeam';
import { PrimaryButton } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export interface Step2PosterProps {
  onComplete: () => void;
  gym: { id: string; name?: string; invite_code?: string };
}

interface InviteResp {
  data: {
    invites: { code: string }[];
  };
}

type DownloadState = 'idle' | 'downloading' | 'done' | 'error';
type PaperSize = 'a4' | 'a3';

function extractErr(err: unknown): string | null {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const r = (err as { response?: { data?: { error?: { message?: string } } } }).response;
    return r?.data?.error?.message ?? null;
  }
  return null;
}

export function Step2Poster({ onComplete, gym }: Step2PosterProps) {
  // Resolve the invite code: prefer the value the wizard already passed in
  // via `gym.invite_code`. Fall back to a fresh `GET /admin/invites` if it
  // isn't there (e.g. reload mid-wizard).
  const [inviteCode, setInviteCode] = useState<string | null>(
    gym.invite_code ?? null,
  );
  const [loadingInvite, setLoadingInvite] = useState(!gym.invite_code);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloadStateA4, setDownloadStateA4] = useState<DownloadState>('idle');
  const [downloadStateA3, setDownloadStateA3] = useState<DownloadState>('idle');
  const [submitting, setSubmitting] = useState(false);

  // Has the operator downloaded at least once? Used to subtly highlight the
  // commitment button — they obviously can't tape something they haven't
  // printed, so we wait for at least one download click before nudging them
  // to confirm.
  const downloaded =
    downloadStateA4 === 'done' || downloadStateA3 === 'done';

  useEffect(() => {
    if (gym.invite_code) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<InviteResp>('/admin/invites');
        if (cancelled) return;
        const code = res.data.data.invites[0]?.code ?? null;
        setInviteCode(code);
      } catch (err) {
        if (cancelled) return;
        setError(extractErr(err) ?? 'Could not load invite code.');
      } finally {
        if (!cancelled) setLoadingInvite(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gym.invite_code]);

  async function downloadPoster(size: PaperSize) {
    const setState = size === 'a4' ? setDownloadStateA4 : setDownloadStateA3;
    setState('downloading');
    setError(null);
    try {
      const res = await api.get(`/admin/grow/poster?size=${size}`, {
        responseType: 'blob',
      });
      const blob = res.data as Blob;
      const dispo = res.headers['content-disposition'] as string | undefined;
      const match = dispo?.match(/filename="?([^";]+)"?/);
      const filename = match?.[1] ?? `ironpath-poster-${size}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setState('done');
    } catch (err) {
      setState('error');
      setError(extractErr(err) ?? 'Download failed. Try again.');
      setTimeout(() => setState('idle'), 2500);
    }
  }

  async function copyCode() {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard denied — operator can hand-copy from the visible text.
    }
  }

  function handleConfirmPosted() {
    setSubmitting(true);
    // Parent owns the API call (POST /admin/onboarding/:stepKey/complete)
    // — we just signal intent. We leave `submitting` true so the button
    // doesn't double-fire while the parent advances the wizard.
    onComplete();
  }

  return (
    <div className="max-w-2xl mx-auto">
      <header className="mb-2">
        <h1 className="text-2xl font-semibold text-white tracking-tight">
          Print and post your QR code
        </h1>
        <p className="text-gray-400 text-sm mt-1 max-w-prose">
          This is the single most important step. Members scan, install, and
          join your gym in seconds.
        </p>
      </header>
      <EmberSeam className="mb-6" />

      {error && (
        <div
          role="alert"
          className="bg-red-950/40 border border-red-800 text-red-300 rounded-md px-3 py-2 mb-5 text-sm"
        >
          {error}
        </div>
      )}

      {/* Invite code tile — large, mono, click-to-copy. */}
      <div className="surface-card px-5 py-5 mb-6">
        <div className="text-[11px] text-gray-500 uppercase tracking-wider font-medium mb-2">
          Your gym's invite code
        </div>
        {loadingInvite ? (
          <div className="h-10 w-56 bg-ink-850 rounded animate-pulse" />
        ) : inviteCode ? (
          <button
            type="button"
            onClick={copyCode}
            className={cn(
              'group flex items-center gap-3 -ml-2 px-2 py-1 rounded',
              'hover:bg-ink-800 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-brand-500/40',
            )}
            aria-label="Copy invite code"
          >
            <span
              className="font-mono text-3xl sm:text-4xl text-white tracking-[0.2em]"
              data-numeric
            >
              {inviteCode}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-400 group-hover:text-gray-200 transition-colors">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </span>
          </button>
        ) : (
          <div className="text-gray-400 text-sm">
            No invite code yet. Refresh and try again.
          </div>
        )}
        <p className="text-xs text-gray-500 mt-3">
          Members enter this code (or scan the QR) inside the IronPath app
          to join {gym.name ?? 'your gym'}.
        </p>
      </div>

      {/* Download buttons — A4 (desk) + A3 (wall). */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-white mb-1">
          Download your poster
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          A4 fits on a desk or counter. A3 is the proper wall poster.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <PrimaryButton
            type="button"
            onClick={() => downloadPoster('a4')}
            disabled={
              !inviteCode ||
              downloadStateA4 === 'downloading' ||
              downloadStateA3 === 'downloading'
            }
            data-testid="onboarding-download-a4"
            className="min-w-[180px]"
          >
            {downloadStateA4 === 'downloading' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : downloadStateA4 === 'done' ? (
              <Check size={16} />
            ) : (
              <Download size={16} />
            )}
            <span>Download A4</span>
          </PrimaryButton>

          <PrimaryButton
            type="button"
            onClick={() => downloadPoster('a3')}
            disabled={
              !inviteCode ||
              downloadStateA4 === 'downloading' ||
              downloadStateA3 === 'downloading'
            }
            data-testid="onboarding-download-a3"
            className="min-w-[180px]"
          >
            {downloadStateA3 === 'downloading' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : downloadStateA3 === 'done' ? (
              <Check size={16} />
            ) : (
              <Download size={16} />
            )}
            <span>Download A3</span>
          </PrimaryButton>
        </div>
      </div>

      {/* Commitment block — explicit confirmation, never auto-advance. */}
      <div
        className={cn(
          'surface-card px-5 py-5 mb-4 transition-opacity duration-300',
          downloaded ? 'opacity-100' : 'opacity-80',
        )}
      >
        <p className="text-sm text-gray-300 mb-3">
          Once you've taped one to the wall, mark this step complete.
        </p>
        <PrimaryButton
          type="button"
          onClick={handleConfirmPosted}
          disabled={submitting || !inviteCode}
          data-testid="onboarding-poster-complete"
          className="min-w-[180px]"
        >
          {submitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Check size={16} />
          )}
          <span>I've posted it</span>
        </PrimaryButton>
      </div>

      <button
        type="button"
        onClick={onComplete}
        className="text-xs text-gray-500 hover:text-gray-300 transition-colors underline-offset-2 hover:underline"
      >
        Skip for now
      </button>
    </div>
  );
}
