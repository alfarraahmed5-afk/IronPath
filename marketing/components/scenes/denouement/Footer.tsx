// Quiet, credits-roll style footer.
//
// Creative-director's hard rule: NO secondary CTA here. The Crescendo
// CTA is the page's only ask; a second one would dilute it. This footer
// is intentionally information-dense and visually light.

import Link from 'next/link';

const CONTACT_EMAIL = 'hello@ironpath.health';
const CAL_LINK = 'https://cal.com/ironpath/15min';

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
          <Link href="/blog" className="hover:text-ink-100 transition-colors">
            Blog
          </Link>
        </nav>

        {/* Right — single quiet CTA, no founder credit */}
        <div className="flex flex-col gap-2 sm:items-end">
          <a
            href={CAL_LINK}
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
