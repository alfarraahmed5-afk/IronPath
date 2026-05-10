// Arabic site layout -- mirrors the EN site layout one tree over.
//
// Strategic call (per the file ownership boundary in this PR): the AR tree
// lives at `app/ar/*` rather than `app/[locale]/*`. Reasons:
//   - The other translation agent owns subroute pages (pricing, blog,
//     for-gyms, privacy, terms, roadmap, eg). Restructuring the whole app
//     into a [locale] segment would collide with their work in flight.
//   - `/` stays the EN canonical (preserves all inbound links + SEO).
//   - When the other agent adds AR variants of their owned pages, they drop
//     them in here at `app/ar/pricing/page.tsx`, etc., and the chrome +
//     locale switcher already work without further wiring.
//
// This layout sets:
//   - `lang="ar-EG"` and `dir="rtl"` on a SharedShell wrapper (browsers
//     respect lang/dir on any element, not only <html>).
//   - The Plex Arabic CSS font variable (preload tag is in the root layout
//     when locale is detected -- but to keep the root statically renderable
//     we instead include it here as a non-critical preload that the browser
//     picks up before first paint).
//   - The AR message catalog via NextIntlClientProvider so client cinematic
//     scenes can pull from `useTranslations`.

import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { MotionRoot } from '@/components/MotionRoot';
import { CairoBanner } from '@/components/CairoBanner';
import { SharedShell } from '@/components/chrome/shared-shell';

// AR-only metadata override; the title/description in lang=ar tags should
// be Arabic so SERPs render the right language tag in MENA results.
export const metadata: Metadata = {
  title: 'IronPath · شغّل الجيم، مش جروبات الواتساب',
  description:
    'لأصحاب الجيمات في القاهرة اللي تعبوا من جروبات الواتساب والإكسل. التمارين في جيب الأعضاء، المتابعة أوتوماتيك، والانسحاب متوقّع.',
};

export default async function ArabicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  setRequestLocale('ar');
  const messages = await getMessages({ locale: 'ar' });

  return (
    <>
      {/* Plex Arabic preload. Only injected on /ar/* renders so EN visitors
          never request the Arabic WOFF2. The Plex Arabic CSS font variable
          itself is added on <html> by the root layout when locale === 'ar'. */}
      <link
        rel="preload"
        href="/fonts/ibm-plex-sans-arabic-regular.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      <NextIntlClientProvider locale="ar" messages={messages}>
        <SharedShell locale="ar">
          <MotionRoot>
            {/* CairoBanner hides itself on /ar (the visitor is already in
                the locale the banner pitches). Keep the import for parity
                with the EN tree, if a future AR page wants to show it
                we already have it threaded. */}
            <CairoBanner />
            {children}
          </MotionRoot>
        </SharedShell>
      </NextIntlClientProvider>
    </>
  );
}
