import type { Metadata } from 'next';

export const SITE_URL = 'https://ironpath.health';
export const SITE_NAME = 'IronPath';
export const SITE_TITLE_DEFAULT = 'IronPath — Run your gym, not software';
export const SITE_DESCRIPTION =
  "For independent gym owners burned by Mindbody. Workouts in your members' pockets. Members tracked, churn predicted. Starts at $49/mo.";

export interface BuildMetadataInput {
  title?: string;
  description?: string;
  path?: string;
}

export function buildMetadata({
  title,
  description,
  path = '/',
}: BuildMetadataInput = {}): Metadata {
  const fullTitle = title ? `${title} · ${SITE_NAME}` : SITE_TITLE_DEFAULT;
  const desc = description ?? SITE_DESCRIPTION;
  const url = new URL(path, SITE_URL).toString();

  return {
    title: fullTitle,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      siteName: SITE_NAME,
      title: fullTitle,
      description: desc,
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
