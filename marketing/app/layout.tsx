import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { inter, jetbrainsMono } from '@/lib/fonts';
import { LivePulseStrip } from '@/components/primitives/live-pulse-strip';
import { PreferencesBar } from '@/components/chrome/preferences-bar';
import './globals.css';

// STUB layout — Team Beta β1 owns the real header/footer + nav assembly.
// Provides chrome scaffolding (font CSS variables, viewport meta with
// safe-area, skip-to-content, LivePulseStrip, PreferencesBar) so other
// agents' pages render against the right shell from day one.

export const metadata: Metadata = {
  title: 'IronPath — Run your gym, not software',
  description:
    'For independent gym owners burned by Mindbody. Workouts in your members\' pockets. Members tracked, churn predicted. Starts at $49/mo.',
  metadataBase: new URL('https://ironpath.health'),
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0A0A0B',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-ink-950 text-ink-50 antialiased">
        <a href="#main" className="skip-to-content">Skip to content</a>
        <LivePulseStrip />
        <header className="sticky top-px z-40 flex items-center justify-between px-4 py-3 sm:px-6 backdrop-blur-md bg-ink-950/70 border-b border-ink-900">
          <Link href="/" className="font-display text-base font-semibold tracking-tight">IronPath</Link>
          <nav className="flex items-center gap-4 text-xs text-ink-300">
            <Link href="/pricing" className="hover:text-ink-100 transition-colors">Pricing</Link>
            <Link href="/blog" className="hover:text-ink-100 transition-colors">Blog</Link>
            <a
              href="https://admin.ironpath.health/login"
              className="hover:text-ink-100 transition-colors"
            >
              Sign in
            </a>
            <PreferencesBar />
          </nav>
        </header>
        <main id="main">{children}</main>
        <footer className="mt-24 px-4 py-12 sm:px-6 border-t border-ink-900 text-xs text-ink-400">
          <p>© {new Date().getFullYear()} IronPath</p>
        </footer>
      </body>
    </html>
  );
}
