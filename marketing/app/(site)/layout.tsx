// EN site layout. Wraps the English route tree in:
//   - SharedShell    -- header/footer/locale switcher (locale='en')
//   - MotionRoot     -- every client motion subtree's LazyMotion + reducedMotion
//   - CairoBanner    -- Egyptian-IP nudge to /ar (hides itself on /eg or /ar)
//   - NextIntlClientProvider -- message catalog for client `useTranslations`
//
// EN visitors hit this layout. The Plex Arabic font is NOT loaded; the EN
// payload stays free of Arabic typography costs.

import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { MotionRoot } from '@/components/MotionRoot';
import { CairoBanner } from '@/components/CairoBanner';
import { SharedShell } from '@/components/chrome/shared-shell';

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Tell next-intl this subtree renders the English locale. Must be called
  // once per request before any getTranslations() -- SharedShell calls it
  // internally too.
  setRequestLocale('en');
  const messages = await getMessages({ locale: 'en' });

  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <SharedShell locale="en">
        <MotionRoot>
          <CairoBanner />
          {children}
        </MotionRoot>
      </SharedShell>
    </NextIntlClientProvider>
  );
}
