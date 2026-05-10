// Quiet, credits-roll style footer.
//
// Creative-director's hard rule: NO secondary CTA here. The Crescendo
// CTA is the page's only ask; a second one would dilute it. This footer
// is intentionally information-dense and visually light.

import Link from 'next/link';

const FOUNDER_NAME = 'Ahmed Alfarra';
const FOUNDER_LINKEDIN = 'https://www.linkedin.com/in/ahmed-alfarra';
const FOUNDER_CAL = 'https://cal.com/ahmed-alfarra/15min';
const CONTACT_EMAIL = 'hello@ironpath.health';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="border-t border-ink-900 px-6 py-12 sm:px-10 sm:py-16 text-xs text-ink-400"
      aria-label="Site footer"
    >
      <div className="mx-auto max-w-6xl grid gap-8 sm:grid-cols-3 sm:items-start">
        {/* Left — wordmark + copyright */}
        <div className="flex flex-col gap-2">
          <span className="font-display text-sm font-semibold tracking-tight text-ink-200">
            IronPath
          </span>
          <span>© {year} IronPath. All rights reserved.</span>
        </div>

        {/* Center — thin links, no surface, no buttons */}
        <nav
          className="flex flex-wrap justify-start sm:justify-center gap-x-5 gap-y-2"
          aria-label="Footer navigation"
        >
          <Link href="/privacy" className="hover:text-ink-100 transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-ink-100 transition-colors">
            Terms
          </Link>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="hover:text-ink-100 transition-colors"
          >
            Contact
          </a>
          <Link href="/status" className="hover:text-ink-100 transition-colors">
            Status
          </Link>
          <Link href="/blog" className="hover:text-ink-100 transition-colors">
            Blog
          </Link>
        </nav>

        {/* Right — founder credit */}
        <div className="flex flex-col gap-2 sm:items-end">
          <a
            href={FOUNDER_LINKEDIN}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`${FOUNDER_NAME} on LinkedIn`}
            className="inline-flex items-center gap-1.5 hover:text-ink-100 transition-colors"
          >
            {/* Inline LinkedIn glyph — avoid pulling an icon library
                just for one mark. 14px, currentColor for hover parity. */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
              focusable="false"
            >
              <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.28 2.38 4.28 5.47v6.27zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0z" />
            </svg>
            <span>LinkedIn</span>
          </a>
          <span>Built by {FOUNDER_NAME}</span>
          <a
            href={FOUNDER_CAL}
            target="_blank"
            rel="noreferrer noopener"
            className="hover:text-ink-100 transition-colors"
          >
            Book a 15-min chat
          </a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
