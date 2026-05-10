import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
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
import { EmberSeam } from '@/components/EmberSeam';
import { PrimaryButton } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { getStoredGymId } from '../lib/forms';

interface InviteResp {
  data: {
    invites: { code: string; uses: number; max_uses: number | null; expires_at: string | null }[];
  };
}

interface Gym {
  id: string;
  name: string;
  accent_color: string | null;
  logo_url: string | null;
}

type DownloadState = 'idle' | 'downloading' | 'error';
type PaperSize = 'a4' | 'a3';

// Concrete-wall texture from Unsplash (raw concrete close-up). We compose a
// dark-room atmosphere on top so the poster reads as the focal element and
// the wall feels like the backdrop, not the subject.
const CONCRETE_WALL_URL =
  'https://images.unsplash.com/photo-1617791160505-6f00504e3519?w=2400&q=80&auto=format&fit=crop';

const DEFAULT_ACCENT = '#FF6B35';

export default function GrowPage() {
  const prefersReducedMotion = useReducedMotion();
  const gymId = getStoredGymId();

  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloadStateA4, setDownloadStateA4] = useState<DownloadState>('idle');
  const [downloadStateA3, setDownloadStateA3] = useState<DownloadState>('idle');

  const [gym, setGym] = useState<Gym | null>(null);

  // Hover state for tilt — which size button is the operator examining?
  const [hovered, setHovered] = useState<PaperSize | null>(null);
  // Active size for the live preview (A4 by default).
  const [previewSize, setPreviewSize] = useState<PaperSize>('a4');

  // Bumped each time a download fires, used as a React key on the poster
  // wrapper so the parabolic-arc animation can play and then snap back.
  const [flightKey, setFlightKey] = useState(0);
  const [flying, setFlying] = useState(false);

  // Existing invite-code fetch — preserved.
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

  // Gym fetch — for accent color, name, logo. Failure here is silent;
  // the poster simply falls back to brand defaults.
  useEffect(() => {
    if (!gymId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/gyms/${gymId}`);
        if (cancelled) return;
        const g = (res.data?.data ?? res.data) as Gym;
        setGym(g);
      } catch {
        // No-op — poster degrades gracefully.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gymId]);

  const accent = gym?.accent_color || DEFAULT_ACCENT;
  const gymName = gym?.name || 'Your Gym';

  const qrSrc = useMemo(() => {
    if (!inviteCode) return null;
    const url = `https://ironpath.app/join/${encodeURIComponent(inviteCode)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=0&data=${encodeURIComponent(url)}`;
  }, [inviteCode]);

  // Existing download logic — preserved verbatim for the network call,
  // wrapped to also kick off the flight animation.
  async function downloadPoster(size: PaperSize) {
    const setState = size === 'a4' ? setDownloadStateA4 : setDownloadStateA3;
    setState('downloading');
    setError(null);

    // Sync the preview to the size being downloaded so the flying poster
    // matches the button the operator just clicked.
    setPreviewSize(size);

    // Kick off animation immediately, in parallel with the network call.
    setFlying(true);

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

  // When flight completes (or the reduced-motion shortcut fires), snap the
  // poster back into place by bumping the React key + clearing flying flag.
  function onFlightComplete() {
    setFlying(false);
    setFlightKey((k) => k + 1);
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

  // Tilt for the poster — baseline + per-hover nudge. On mobile we drop
  // perspective entirely (handled by the md: breakpoint on the wrapper).
  const tiltY = hovered === 'a4' ? -2 : hovered === 'a3' ? -6 : -4;

  // A3 is roughly √2 larger than A4 — bump the preview size when toggled.
  const widthPx = previewSize === 'a3' ? 520 : 420;

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-2">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Grow your gym</h1>
        <p className="text-gray-400 text-sm mt-1">
          Print the poster. Tape it on the wall. Watch members join.
        </p>
      </header>
      <EmberSeam className="mb-8" />

      {error && (
        <div
          role="alert"
          className="bg-red-950/40 border border-red-800 text-red-300 rounded-md px-3 py-2 mb-6 text-sm"
        >
          {error}
        </div>
      )}

      {/* Poster Forge — concrete wall + live preview, full bleed within
          the page container so the Layout shell remains the chrome. */}
      <section
        className="relative overflow-hidden rounded-xl border border-ink-800 mb-6"
        style={{
          backgroundImage: `url(${CONCRETE_WALL_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Brightness/contrast wash so the wall reads as backdrop, not focal. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundColor: 'rgba(0,0,0,0.45)',
            backdropFilter: 'brightness(0.55) contrast(1.05)',
          }}
        />
        {/* Vignette — pulls eye to centre. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(60% 50% at 50% 45%, transparent 0%, rgba(0,0,0,0.55) 100%)',
          }}
        />

        <div className="relative px-6 py-12 sm:px-10 sm:py-16 flex flex-col items-center gap-8">
          {/* Stage — fixed height so the parabolic arc has room to fly. */}
          <div className="relative flex items-end justify-center w-full" style={{ minHeight: 540 }}>
            <AnimatePresence mode="wait" onExitComplete={onFlightComplete}>
              {!flying && (
                <PosterPreview
                  key={flightKey}
                  widthPx={widthPx}
                  tiltY={tiltY}
                  accent={accent}
                  gymName={gymName}
                  inviteCode={inviteCode}
                  qrSrc={qrSrc}
                  loadingInvite={loadingInvite}
                  prefersReducedMotion={!!prefersReducedMotion}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Action row */}
          <div className="w-full flex flex-col items-center gap-4">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <PrimaryButton
                onMouseEnter={() => setHovered('a4')}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered('a4')}
                onBlur={() => setHovered(null)}
                onClick={() => downloadPoster('a4')}
                disabled={!inviteCode || downloadStateA4 === 'downloading' || flying}
                data-testid="download-poster-a4"
                className="min-w-[180px]"
              >
                {downloadStateA4 === 'downloading' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                <span>Download A4</span>
              </PrimaryButton>

              <PrimaryButton
                onMouseEnter={() => setHovered('a3')}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered('a3')}
                onBlur={() => setHovered(null)}
                onClick={() => downloadPoster('a3')}
                disabled={!inviteCode || downloadStateA3 === 'downloading' || flying}
                data-testid="download-poster-a3"
                className="min-w-[180px]"
              >
                {downloadStateA3 === 'downloading' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                <span>Download A3</span>
              </PrimaryButton>
            </div>

            <p className="text-xs text-gray-300/80 max-w-md text-center">
              A4 fits on a desk or counter. A3 is the wall poster. Both are branded with your accent
              color and live invite code.
            </p>

            {/* Invite code — restyled, mono + numeric. */}
            <div className="w-full max-w-md surface-card px-4 py-3 flex items-center gap-3">
              <div className="text-[11px] text-gray-500 uppercase tracking-wider font-medium shrink-0">
                Invite code
              </div>
              {loadingInvite ? (
                <Skeleton className="h-5 w-32 flex-1" />
              ) : inviteCode ? (
                <>
                  <div
                    className="font-mono text-base text-white tracking-wider flex-1"
                    data-numeric
                  >
                    {inviteCode}
                  </div>
                  <button
                    type="button"
                    onClick={copyCode}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-gray-300 hover:text-white hover:bg-ink-800 transition-colors"
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
          </div>
        </div>
      </section>

      {/* Future formats — placeholders for the rest of plan §4.5 kit. */}
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

// ---------- Poster preview ----------

interface PosterPreviewProps {
  widthPx: number;
  tiltY: number;
  accent: string;
  gymName: string;
  inviteCode: string | null;
  qrSrc: string | null;
  loadingInvite: boolean;
  prefersReducedMotion: boolean;
}

/**
 * The CSS-rendered "paper" mocked onto the concrete wall. Sits inside an
 * AnimatePresence so the parent can trigger the parabolic arc by simply
 * unmounting it; on remount (key bump) it snaps back to the baseline tilt.
 */
function PosterPreview({
  widthPx,
  tiltY,
  accent,
  gymName,
  inviteCode,
  qrSrc,
  loadingInvite,
  prefersReducedMotion,
}: PosterPreviewProps) {
  // Baseline tilt — interpolated by Framer when tiltY changes (hover).
  // On mobile we flatten by removing the perspective wrapper transform.
  const initialTilt = useRef(true);
  const initial = initialTilt.current
    ? { opacity: 0, y: 12, rotateY: tiltY, rotateX: 8 }
    : false;
  initialTilt.current = false;

  // Parabolic arc on exit — y goes up then way up, x slides right, scale
  // shrinks, opacity fades. Reduced-motion: just a quick fade.
  const exit = prefersReducedMotion
    ? { opacity: 0, transition: { duration: 0.18 } }
    : {
        y: [0, -200, -400],
        x: [0, 100, 200],
        scale: [1, 0.9, 0.4],
        opacity: [1, 0.8, 0],
        rotateZ: [0, 8, 18],
        transition: { duration: 0.8, ease: 'easeOut' as const, times: [0, 0.55, 1] },
      };

  return (
    <motion.div
      className="relative md:[perspective:1200px]"
      initial={initial}
      animate={{ opacity: 1, y: 0, rotateY: tiltY, rotateX: 8 }}
      exit={exit}
      transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* The "paper" itself */}
      <div
        className={cn(
          'relative bg-white shadow-2xl shadow-black/60 overflow-hidden',
          'aspect-[210/297] flex flex-col',
        )}
        style={{
          width: widthPx,
          // Subtle paper grain — layered noise via gradients, free of network.
          backgroundImage:
            'radial-gradient(120% 80% at 0% 0%, rgba(0,0,0,0.04) 0%, transparent 60%), radial-gradient(120% 80% at 100% 100%, rgba(0,0,0,0.06) 0%, transparent 60%)',
        }}
      >
        {/* Accent header band */}
        <div
          className="px-6 py-4 text-white flex items-center justify-between"
          style={{ backgroundColor: accent }}
        >
          <div className="text-[11px] font-semibold tracking-[0.2em] uppercase">
            Join on IronPath
          </div>
          <div className="text-[10px] font-mono opacity-80" data-numeric>
            {inviteCode ?? '——————'}
          </div>
        </div>

        {/* Gym name */}
        <div className="px-6 pt-6 pb-2">
          <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-1">
            Welcome to
          </div>
          <h2 className="text-3xl font-bold text-gray-900 leading-tight tracking-tight">
            {gymName}
          </h2>
        </div>

        {/* QR — the focal element */}
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="relative">
            {qrSrc ? (
              <img
                src={qrSrc}
                alt=""
                aria-hidden="true"
                width={240}
                height={240}
                className="block"
                style={{ imageRendering: 'pixelated' }}
                onError={(e) => {
                  // If the QR service is offline, fall back to a stylised
                  // placeholder block so the poster never collapses to empty.
                  e.currentTarget.style.display = 'none';
                  const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
                  if (fb) fb.style.display = 'block';
                }}
              />
            ) : (
              <div
                className="bg-gray-900"
                style={{ width: 240, height: 240 }}
                aria-hidden="true"
              />
            )}
            {/* Hidden fallback (revealed by onError above) */}
            <div
              className="bg-gray-900"
              style={{ width: 240, height: 240, display: 'none' }}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Invite code — bottom slab */}
        <div className="px-6 pb-6 pt-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-1 text-center">
            Invite code
          </div>
          {loadingInvite ? (
            <div className="h-8 mx-auto w-40 bg-gray-200 animate-pulse rounded" />
          ) : (
            <div
              className="font-mono text-2xl font-bold text-gray-900 tracking-[0.25em] text-center"
              data-numeric
            >
              {inviteCode ?? '— — — — — —'}
            </div>
          )}
          <div className="mt-2 text-[10px] text-center text-gray-500">
            Scan the QR or enter the code in the IronPath app.
          </div>
        </div>

        {/* Accent foot stripe — visual rhythm with the header band */}
        <div className="h-1.5" style={{ backgroundColor: accent }} />
      </div>
    </motion.div>
  );
}

// ---------- Placeholders ----------

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
    <div className="surface-card p-5 opacity-60 transition-all duration-200 hover:opacity-80 hover:-translate-y-0.5">
      <div className="flex items-start gap-3 mb-1">
        <Icon size={16} strokeWidth={1.75} className="text-gray-500 mt-0.5 shrink-0" />
        <div>
          <h3 className="text-sm font-medium text-gray-200">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-gray-500 italic uppercase tracking-wider">
        <QrCode size={10} className="opacity-50" />
        Coming soon
      </div>
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
