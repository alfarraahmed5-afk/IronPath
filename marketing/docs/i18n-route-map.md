# i18n route map

Single source of truth for the parallel locale tree. Every public route
exists in BOTH locales. The English route is the un-prefixed canonical;
the Arabic route lives under `/ar`. Cross-link between locales via the
`LocaleSwitcher` (header) or by hand-coding hreflang-aware `<Link>`s
when the surrounding context is locale-pinned.

## Route table

| Purpose                | EN canonical (`en`)     | AR mirror (`ar-EG`)        | Status            |
| ---------------------- | ----------------------- | -------------------------- | ----------------- |
| Cinematic landing      | `/`                     | `/ar`                      | Both shipped      |
| Pricing                | `/pricing`              | `/ar/pricing`              | Both shipped      |
| Blog index             | `/blog`                 | `/ar/blog`                 | Both shipped      |
| Blog post detail       | `/blog/[slug]`          | `/ar/blog/[slug]`          | Both shipped      |
| For gyms (long-form)   | `/for-gyms`             | `/ar/for-gyms`             | Both shipped      |
| Roadmap                | `/roadmap`              | `/ar/roadmap`              | Both shipped      |
| Cairo wedge / EGP      | `/eg`                   | `/ar/eg`                   | Both shipped      |
| Start (lead intake)    | `/start`                | `/ar/start`                | Both shipped      |
| Privacy                | `/privacy`              | `/ar/privacy`              | Both shipped      |
| Terms                  | `/terms`                | `/ar/terms`                | Both shipped      |

The middleware matcher (`marketing/middleware.ts`) excludes `/api/*`,
Next internals, and any path with a file extension. API routes are
locale-agnostic and stay un-mirrored.

## File ownership (this sprint)

- AR pages under `marketing/app/ar/*` are owned by **Super Agent 1**
  (this PR, the i18n architecture overhaul).
- EN pages under `marketing/app/(site)/*` and `marketing/app/(legal)/*`
  are owned by **Super Agent 3** (audits) and **Super Agent 2** (AR
  mirroring + Cairo wedge content).
- The shared header/footer chrome (`SharedShell`, `LocaleSwitcher`,
  `PreferencesBar`) is owned by **Super Agent 1**.

## URL is the source of truth

The single non-negotiable rule: **the URL determines the rendered
locale, period.** A visitor on `/ar/pricing` ALWAYS gets the AR pricing
page, even if the `NEXT_LOCALE` cookie says `en`. A visitor on
`/pricing` ALWAYS gets the EN pricing page, even if the cookie says
`ar`. Middleware rewrites the cookie to match the URL on every request
to keep cookie-driven downstream readers (`lib/i18n.ts` `getLocale()`,
the legal pages) consistent with the URL.

The cookie is therefore a **first-visit hint** only. It tells the
locale-switcher (header) which locale to land in when a visitor arrives
on `/` for the very first time. Once the visitor clicks a locale-pinned
link (or the URL itself is locale-prefixed), the URL takes over.

## Locale switcher decision tree

```
User clicks the LocaleSwitcher's inactive label.
├─ Read current pathname via usePathname()
├─ Compute target path via localizedPath(targetLocale, pathname)
│   ├─ EN selected, current is /ar/pricing → target /pricing
│   ├─ AR selected, current is /pricing    → target /ar/pricing
│   ├─ EN selected, current is /ar         → target /
│   └─ AR selected, current is /            → target /ar
├─ Persist NEXT_LOCALE cookie via document.cookie (1 year, SameSite=Lax)
└─ Navigate via <Link href={target}> -- triggers RSC re-render

Middleware then sees the new URL, re-confirms the cookie, RSC layout
reads x-pathname, sets <html lang dir>, page renders with the new locale
catalog. End-to-end round-trip is one navigation, no flicker (RSC
streams the new HTML before the client mounts).
```

## Hreflang sitemap shape

`marketing/app/sitemap.ts` emits two entries per route (EN + AR), each
with the same `alternates.languages` block:

```ts
{
  url: 'https://ironpath.health/pricing',
  alternates: {
    languages: {
      en: 'https://ironpath.health/pricing',
      'ar-EG': 'https://ironpath.health/ar/pricing',
      'x-default': 'https://ironpath.health/pricing',
    },
  },
}
```

Next.js serializes `alternates.languages` into the standard
`xhtml:link rel="alternate" hreflang="..."` form Google expects. We
emit the EN URL as `x-default` so untargeted MENA SERPs surface the
international page rather than auto-routing to `/ar`.

## How AR pages are wired

Each AR page is a thin RSC at `marketing/app/ar/<route>/page.tsx`
that:

1. Calls `setRequestLocale('ar')` from `next-intl/server` so any
   nested client component using `useTranslations` resolves against
   the AR catalog.
2. Calls `getMessages('ar')` directly from `lib/i18n.ts` (skipping the
   cookie-based `getLocale()` so first-visit cookie absence cannot
   cause an EN-content-under-AR-chrome flicker).
3. Renders the page body inline, with `dir="rtl" lang="ar"` on the
   root and all internal `<Link>`s pointing at `/ar/*` paths.

This deliberately duplicates the body markup of each EN page rather
than extracting a shared body component, because the EN pages are
owned by a different agent in this sprint and a refactor would
collide with their work in flight. When this sprint lands, a
follow-up PR can consolidate to a `_shared` body component.

## Cross-team coordination notes

- **Super Agent 2** (AR content + Cairo wedge): the `/ar/eg` page in
  this PR uses native Egyptian Arabic copy inlined directly in the
  page file. If you restructure `/eg`, mirror the changes here.
- **Super Agent 3** (EN audits): the EN pages still use cookie-based
  `getLocale()`. The middleware now rewrites the cookie to match the
  URL on every request, so the cookie-vs-URL mismatch bug is fixed.
  No changes needed on your side.
- **Super Agent 4** (scenes + lead form): `/ar/start` reuses your
  `LeadForm` component as-is. The component already uses
  `useTranslations` for its labels, so wrapping it in the AR layout's
  `NextIntlClientProvider` is enough.

## Verification checklist

- [ ] `npm install` runs clean
- [ ] `npm run -w marketing build` passes with all `/ar/*` routes
      prerendering
- [ ] Locale switcher round-trips on every page (EN → AR → EN keeps
      the visitor on the same logical page)
- [ ] Sitemap emits hreflang alternates for every page
- [ ] No internal link in either locale resolves to a 404
