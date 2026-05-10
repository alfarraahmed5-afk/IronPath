import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import api from '../lib/api';
import { isAllowedRole, readStoredUser } from '../lib/session';
import { Logomark } from '@/components/Logomark';
import { EmberSeam } from '@/components/EmberSeam';
import { PrimaryButton } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

// Where to send super_admin attempts. Static for now; if the console URL ever
// changes we can move this to a build-time env var.
const CONSOLE_URL = 'https://iron-path-console.vercel.app';

// "Gym Door" macro — a barbell with chalk dust mid-air, B&W after the
// grayscale filter is applied below. Chosen from the Unsplash chalk-dust /
// barbell-knurling search; wide enough (2400w) to survive a fullscreen left
// half on retina displays without visible compression artifacts.
const HERO_PHOTO_URL =
  'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=2400&q=80&auto=format&fit=crop';

// Sentinel so the logomark draw-in only plays once per tab. We intentionally
// use sessionStorage (not localStorage) so a fresh tab always gets the
// flourish — operators returning to a long-lived tab don't.
const LOGO_PLAYED_KEY = 'login.logomark.played.v1';

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
  const prefersReducedMotion = useReducedMotion();

  const reason = searchParams.get('reason');
  const next = sanitizeNext(searchParams.get('next'));
  const showSessionExpired = reason === 'session_expired';

  // Returning-operator greeting. Read once on mount; if the user JSON is
  // missing or malformed, stay quiet rather than render an empty pill.
  const storedUser = useMemo(() => readStoredUser(), []);
  const greetingGym = storedUser?.gym_name?.trim() || null;

  // Logomark "draw-in" — a single staggered reveal of each <rect> in the
  // logomark, gated on a sessionStorage flag so it only plays once per tab.
  // When the user prefers reduced motion we skip the animation entirely and
  // the logomark renders instantly (and we still write the sentinel so a
  // user who toggles their OS preference mid-session doesn't see a sudden
  // animation on the next load either).
  const [shouldDrawLogo, setShouldDrawLogo] = useState(false);
  useEffect(() => {
    let alreadyPlayed = false;
    try {
      alreadyPlayed = sessionStorage.getItem(LOGO_PLAYED_KEY) === '1';
    } catch {
      // sessionStorage can throw in privacy-mode Safari. Fall back to
      // "already played" so we err on the side of no surprise animation.
      alreadyPlayed = true;
    }
    if (!alreadyPlayed && !prefersReducedMotion) {
      setShouldDrawLogo(true);
    }
    try {
      sessionStorage.setItem(LOGO_PLAYED_KEY, '1');
    } catch {
      // ignore
    }
  }, [prefersReducedMotion]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const data = res.data.data;

      // 2FA-shape (introduced for super_admin login on the console). If we
      // see this here, the credentials belong to an operator account and
      // they're on the wrong app — point them at the console.
      if (data?.requires_2fa) {
        setError(`This account uses the operator console — sign in at ${CONSOLE_URL}`);
        return;
      }

      const { access_token, refresh_token, user } = data;
      if (!isAllowedRole(user?.role)) {
        // Most common case after dropping super_admin from ALLOWED_ROLES.
        // Same redirect message regardless of which non-gym_owner role hit.
        setError(
          user?.role === 'super_admin'
            ? `Super admin accounts sign in at ${CONSOLE_URL}`
            : 'Gym owner access required.'
        );
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

  // Each <rect> in the Logomark, in the order it should reveal. The fill
  // colors mirror Logomark.tsx so the staggered version reads as the same
  // mark mid-build. Kept inline (rather than refactoring Logomark to expose
  // a `motion` mode) per the spec's "wrap, don't replace" instruction.
  const drawnRects: Array<{ x: number; y: number; w: number; h: number; rx: number; fill: string }> = [
    { x: 6, y: 3, w: 16, h: 3.2, rx: 0.8, fill: '#D4D4DA' },
    { x: 12, y: 3, w: 4, h: 22, rx: 0.6, fill: '#8A8A95' },
    { x: 6, y: 21.8, w: 16, h: 3.2, rx: 0.8, fill: '#D4D4DA' },
    { x: 9, y: 12, w: 10, h: 4, rx: 1, fill: '#FF6B35' },
    { x: 7.5, y: 13, w: 2, h: 2, rx: 0.3, fill: '#D4D4DA' },
    { x: 18.5, y: 13, w: 2, h: 2, rx: 0.3, fill: '#D4D4DA' },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row surface-shell text-ink-50">
      {/* ============================================================
       * LEFT: the gym door — fullscreen B&W chalk-dust macro under a
       * slow Ken-Burns scale + ember vignette. On mobile we collapse
       * to a 240px banner so the form is always above the fold.
       * ============================================================ */}
      <div className="relative lg:w-1/2 h-60 lg:h-auto overflow-hidden bg-ink-950">
        <img
          src={HERO_PHOTO_URL}
          alt=""
          aria-hidden="true"
          className={cn(
            'absolute inset-0 w-full h-full object-cover',
            // Ken-Burns is a tailwind utility wired in α3's tailwind.config.js.
            // useReducedMotion clients skip it entirely.
            !prefersReducedMotion && 'animate-ken-burns'
          )}
          style={{
            filter: 'grayscale(100%) contrast(1.1)',
            transformOrigin: 'center',
          }}
          loading="eager"
        />

        {/* Top-left ember bloom — the brand's signature tint, kept faint
            so the photo's chalk dust still reads. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 0% 0%, rgba(255,107,53,0.18), transparent 40%)',
          }}
        />
        {/* Bottom-right fade to true black so the seam between photo and
            form vanishes on desktop without a hard edge. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom right, transparent 60%, #0A0A0B)',
          }}
        />

        {/* EmberSeam — hairline brand artifact at the seam edge. On
            desktop this is the bottom of the left column and visually
            doubles as the bottom edge of the photo band. */}
        <EmberSeam className="ember-seam absolute bottom-0 left-0 right-0" />
      </div>

      {/* ============================================================
       * RIGHT: minimal forged-ink form. Centered vertically; subtle
       * top-left ember radial so the surface doesn't read as flat black.
       * ============================================================ */}
      <div
        className="relative lg:w-1/2 flex items-center justify-center px-6 py-12 lg:py-0 surface-shell"
        style={{
          backgroundImage:
            'radial-gradient(120% 70% at 0% 0%, rgba(255,107,53,0.05) 0%, transparent 55%)',
        }}
      >
        <div className="w-full max-w-sm">
          {/* Logomark draw-in. On first visit (sessionStorage gate) and
              with motion enabled, each <rect> fades + slides in on a
              short stagger — feels like the mark is being struck.
              Otherwise we just render the canonical Logomark. */}
          <div className="flex flex-col items-center mb-8">
            {shouldDrawLogo ? (
              <motion.svg
                width={48}
                height={48}
                viewBox="0 0 28 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-label="IronPath"
                role="img"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: {
                    transition: { staggerChildren: 0.18, delayChildren: 0.12 },
                  },
                }}
              >
                {drawnRects.map((r, i) => (
                  <motion.rect
                    key={i}
                    x={r.x}
                    y={r.y}
                    width={r.w}
                    height={r.h}
                    rx={r.rx}
                    fill={r.fill}
                    variants={{
                      hidden: { opacity: 0, scale: 0.6 },
                      visible: { opacity: 1, scale: 1 },
                    }}
                    style={{ transformOrigin: '14px 14px' }}
                    transition={{ duration: 0.42, ease: [0.32, 0.72, 0, 1] }}
                  />
                ))}
              </motion.svg>
            ) : (
              <Logomark size={48} />
            )}

            {greetingGym && (
              <p className="mt-4 text-xs font-mono lowercase tracking-wide text-brand-400/60">
                welcome back to {greetingGym}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <h2 className="font-mono lowercase text-xl text-ink-50">open the gym</h2>
              <p className="mt-1 text-sm text-ink-400">
                sign in with your operator credentials.
              </p>
            </div>

            {showSessionExpired && !error && (
              <div className="rounded-md border border-ink-700 bg-ink-900/60 px-4 py-3 text-sm text-ink-200">
                your session ended. sign in to continue.
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-md border border-brand-500/40 bg-brand-500/10 px-4 py-3 text-sm text-brand-400"
                style={{
                  boxShadow: 'inset 0 0 0 1px rgba(255,107,53,0.06)',
                }}
              >
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-mono lowercase tracking-wide text-ink-400 mb-1.5"
              >
                email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn(
                  'w-full bg-ink-900/60 text-ink-50 rounded-md px-3.5 py-2.5 text-sm',
                  'border border-ink-700 placeholder:text-ink-600',
                  'transition-colors duration-200',
                  'focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30'
                )}
                placeholder="owner@yourgym.com"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-mono lowercase tracking-wide text-ink-400 mb-1.5"
              >
                password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(
                  'w-full bg-ink-900/60 text-ink-50 rounded-md px-3.5 py-2.5 text-sm',
                  'border border-ink-700 placeholder:text-ink-600',
                  'transition-colors duration-200',
                  'focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30'
                )}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            <PrimaryButton
              type="submit"
              loading={loading}
              className="w-full font-mono lowercase tracking-wide py-3"
              // Magnetic interaction is α4's responsibility; the stub forwards
              // unknown props to the underlying <button> harmlessly. Cast to
              // any so the prop survives the stub's narrower signature.
              {...({ magnetic: true } as any)}
            >
              {loading ? 'opening' : 'open the gym'}
            </PrimaryButton>
          </form>
        </div>
      </div>
    </div>
  );
}
