import { useEffect, useState } from 'react';
import {
  QrCode,
  Download,
  Copy,
  Check,
  Mail,
  MessageSquare,
  Image as ImageIcon,
  ScrollText,
  Loader2,
} from 'lucide-react';
import api from '../lib/api';
import { Skeleton } from '@/components/ui/Skeleton';

interface InviteResp {
  data: {
    invites: { code: string; uses: number; max_uses: number | null; expires_at: string | null }[];
  };
}

type DownloadState = 'idle' | 'downloading' | 'error';

export default function GrowPage() {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloadStateA4, setDownloadStateA4] = useState<DownloadState>('idle');
  const [downloadStateA3, setDownloadStateA3] = useState<DownloadState>('idle');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<InviteResp>('/admin/invites');
        if (cancelled) return;
        const code = res.data.data.invites[0]?.code ?? null;
        setInviteCode(code);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(extractErr(err) ?? 'Could not load invite code.');
      } finally {
        if (!cancelled) setLoadingInvite(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function downloadPoster(size: 'a4' | 'a3') {
    const setState = size === 'a4' ? setDownloadStateA4 : setDownloadStateA3;
    setState('downloading');
    setError(null);
    try {
      const res = await api.get(`/admin/grow/poster?size=${size}`, { responseType: 'blob' });
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
      setState('idle');
    } catch (err: unknown) {
      setState('error');
      setError(extractErr(err) ?? 'Download failed.');
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
      // Clipboard denied — operator can hand-copy.
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Grow your gym</h1>
        <p className="text-gray-400 text-sm mt-1">
          Print the poster. Tape it on the wall. Watch members join.
        </p>
      </header>

      {error && (
        <div role="alert" className="bg-red-950/40 border border-red-800 text-red-300 rounded-md px-3 py-2 mb-6 text-sm">
          {error}
        </div>
      )}

      {/* QR Poster — primary card */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="bg-orange-500/10 rounded-md p-2.5 mt-0.5">
            <QrCode size={20} strokeWidth={1.75} className="text-orange-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-white">QR poster</h2>
            <p className="text-gray-400 text-sm mt-0.5">
              Branded with your logo and accent color. Members scan with their phone camera and land
              straight in your gym.
            </p>
          </div>
        </div>

        <div className="bg-gray-950 border border-gray-800 rounded-md px-4 py-3 mb-5 flex items-center gap-3">
          <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">Invite code</div>
          {loadingInvite ? (
            <Skeleton className="h-5 w-32 flex-1" />
          ) : inviteCode ? (
            <>
              <div className="font-mono text-base text-white tracking-wider flex-1">{inviteCode}</div>
              <button
                type="button"
                onClick={copyCode}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                aria-label="Copy invite code"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </>
          ) : (
            <div className="text-gray-400 text-sm">No invite code yet.</div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DownloadButton
            size="a4"
            label="Download A4"
            sub="Desk / counter print"
            state={downloadStateA4}
            disabled={!inviteCode}
            onClick={() => downloadPoster('a4')}
          />
          <DownloadButton
            size="a3"
            label="Download A3"
            sub="Wall poster"
            state={downloadStateA3}
            disabled={!inviteCode}
            onClick={() => downloadPoster('a3')}
          />
        </div>
      </section>

      {/* Future formats — placeholders so future PRs have an obvious slot */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PlaceholderCard
          Icon={Mail}
          title="Email blast template"
          subtitle="Pre-filled message + invite link, ready to paste into your email client."
        />
        <PlaceholderCard
          Icon={MessageSquare}
          title="SMS template"
          subtitle="160 chars, with the join link."
        />
        <PlaceholderCard
          Icon={ImageIcon}
          title="Instagram story"
          subtitle="1080×1920 PNG with QR overlay."
        />
        <PlaceholderCard
          Icon={ScrollText}
          title="Front-desk script"
          subtitle="Printable card: 'Hey, we just launched our app — scan this'."
        />
      </section>
    </div>
  );
}

function DownloadButton({
  size,
  label,
  sub,
  state,
  disabled,
  onClick,
}: {
  size: 'a4' | 'a3';
  label: string;
  sub: string;
  state: DownloadState;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || state === 'downloading'}
      className="flex items-center justify-between gap-3 px-4 py-3 rounded-md bg-orange-500 hover:bg-orange-600 text-gray-950 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      data-testid={`download-poster-${size}`}
    >
      <div className="text-left">
        <div className="font-semibold">{label}</div>
        <div className="text-xs font-normal opacity-80">{sub}</div>
      </div>
      {state === 'downloading' ? (
        <Loader2 size={18} className="animate-spin shrink-0" />
      ) : (
        <Download size={18} className="shrink-0" />
      )}
    </button>
  );
}

function PlaceholderCard({
  Icon,
  title,
  subtitle,
}: {
  Icon: typeof Mail;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 opacity-60">
      <div className="flex items-start gap-3 mb-1">
        <Icon size={16} strokeWidth={1.75} className="text-gray-500 mt-0.5 shrink-0" />
        <div>
          <h3 className="text-sm font-medium text-gray-200">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="mt-3 text-xs text-gray-500 italic">Coming soon</div>
    </div>
  );
}

function extractErr(err: unknown): string | null {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const r = (err as { response?: { data?: { error?: { message?: string } } } }).response;
    return r?.data?.error?.message ?? null;
  }
  return null;
}
