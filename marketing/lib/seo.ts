import type { Metadata } from 'next';
import type { Locale } from '@/lib/locale';

export const SITE_URL = 'https://ironpath.health';
export const SITE_NAME = 'IronPath';
export const SITE_TITLE_DEFAULT = 'IronPath -- Run your gym, not software';
export const SITE_DESCRIPTION =
  "For independent gym owners tired of running everything from spreadsheets and WhatsApp groups. Workouts in your members' pockets. Members tracked, churn predicted. Starts at $49/mo.";

// Arabic-locale defaults. Used when buildMetadata is called with locale='ar'
// but no explicit title/description override. Egyptian colloquial, native
// dialect. The brand wordmark stays Latin.
export const SITE_TITLE_DEFAULT_AR =
  'IronPath · شغّل الجيم، مش جروبات الواتساب';
export const SITE_DESCRIPTION_AR =
  'لأصحاب الجيمات في القاهرة اللي تعبوا من جروبات الواتساب والإكسل. التمارين في جيب الأعضاء، المتابعة أوتوماتيك، والانسحاب متوقّع.';

export interface BuildMetadataInput {
  title?: string;
  description?: string;
  path?: string;
  /**
   * Locale for the metadata. Defaults to 'en'. AR variants render an Arabic
   * suffix in the title and pull AR fallback copy when no override is given,
   * and emit hreflang alternates so SERPs in MENA route to the AR page.
   */
  locale?: Locale;
}

/**
 * Build a Metadata object that includes `alternates.languages` (hreflang)
 * pairing EN with AR-EG. The architect's spec mandates `x-default` so Google
 * has an explicit fallback for untargeted countries.
 */
export function buildMetadata({
  title,
  description,
  path = '/',
  locale = 'en',
}: BuildMetadataInput = {}): Metadata {
  const isAr = locale === 'ar';
  const defaultTitle = isAr ? SITE_TITLE_DEFAULT_AR : SITE_TITLE_DEFAULT;
  const defaultDesc = isAr ? SITE_DESCRIPTION_AR : SITE_DESCRIPTION;

  const fullTitle = title ? `${title} · ${SITE_NAME}` : defaultTitle;
  const desc = description ?? defaultDesc;

  // Path is always given as the EN canonical (e.g. '/pricing'). The AR
  // equivalent is `/ar${path}`; root EN path becomes '/ar' for the AR side.
  const enPath = path === '/ar' ? '/' : path.replace(/^\/ar(\/|$)/, '/');
  const arPath = enPath === '/' ? '/ar' : `/ar${enPath}`;
  const currentPath = isAr ? arPath : enPath;

  const url = new URL(currentPath, SITE_URL).toString();
  const enUrl = new URL(enPath, SITE_URL).toString();
  const arUrl = new URL(arPath, SITE_URL).toString();

  return {
    title: fullTitle,
    description: desc,
    alternates: {
      canonical: url,
      languages: {
        en: enUrl,
        'ar-EG': arUrl,
        // x-default tells Google which locale to surface in untargeted
        // countries. Per the i18n architect's spec, the international EN
        // page is the default.
        'x-default': enUrl,
      },
    },
    openGraph: {
      type: 'website',
      url,
      siteName: SITE_NAME,
      title: fullTitle,
      description: desc,
      locale: isAr ? 'ar_EG' : 'en_US',
      images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: desc,
      images: [`${SITE_URL}/opengraph-image`],
    },
  };
}
