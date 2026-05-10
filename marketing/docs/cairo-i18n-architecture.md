# Cairo i18n Architecture — Lens 3 of 4

Frontend i18n architect's plan to take `ironpath.health` from English-only to EN + AR (Egyptian Arabic) with RTL.

## TL;DR

- **Subpath routing under `next-intl@3`** — `/en/*` + `/ar/*`, root stays EN, AR is opt-in. Smallest infra delta, full RSC support, ~12 KB gz.
- **Detection: cookie > URL > geo (`x-vercel-ip-country`) > Accept-Language > EN.** Never auto-redirect a returning visitor; `NEXT_LOCALE` cookie wins absolutely.
- **IBM Plex Sans Arabic** — variable, self-hosted, OFL, ~38 KB subsetted, AR-only preload. Pairs visually with Inter.
- **Fork the cinematic scenes, don't mirror them** — Hero, Capability (GSAP `xPercent` flip), Pricing, EmberSeam, LivePulseStrip all need locale-aware variants. **v1 effort: medium (≈12 dev-days, 3 PRs).**

---

## 1. Routing strategy

**Decision: Option A — subpath (`/en`, `/ar`).** Subdomains (B) need DNS work and split crawl budgets for v1 traffic that's likely <50 AR sessions/day. Domain swap (C) is a permanent split-brain SEO problem. Subpath is what Next 15's App Router was built for; `next-intl`'s `<Link>` rewrites existing hrefs to the active locale.

**Concrete changes:**

1. Restructure `app/(site)/*` → `app/[locale]/(site)/*`. The `(legal)` group moves the same way. `app/api/*`, `app/sitemap.ts`, `app/robots.ts` stay locale-agnostic at root.
2. `next.config.ts` gets a `withNextIntl()` wrapper. No Pages-Router-style `i18n` block (Next 15 App Router does not use it).
3. `middleware.ts`: compose `createMiddleware({ locales: ['en','ar'], defaultLocale: 'en', localePrefix: 'as-needed' })` *before* the existing tracking-strip + AB-cookie logic. `as-needed` keeps `/pricing` as the EN canonical (no `/en/` prefix), preserving all inbound links.

---

## 2. Locale detection + persistence

**Decision tree, top wins:**

1. **`NEXT_LOCALE` cookie** (set by switcher or by first explicit `/ar/*` visit). Honored absolutely.
2. **URL-locked locale** — `/ar/...` or `/en/...` wins for the request and updates the cookie.
3. **Vercel geo** (`x-vercel-ip-country`) — `EG, SA, AE, JO, KW, QA, BH, OM, LB, MA, TN, DZ` → `ar`. One-line extension to the existing `x-vercel-ip-city` read in `middleware.ts:101`.
4. **Accept-Language** — `ar*` → `ar`, else `en`.
5. **Default `en`.**

**Edge cases:**

- *Cairo IP, French browser* → geo wins (`ar`). User can switch; cookie sticks.
- *Returning AR visitor hits `/`* → server-side 307 to `/ar`, no flicker.
- *Crawler with no signals* (Googlebot/US) → `en`. AR pages indexed via `<link rel="alternate" hreflang="ar-EG">`.
- *AR-cookie user types `/en/pricing` directly* → URL wins, cookie updates to `en`. Explicit URL = explicit choice.

**Switcher placement:** in `PreferencesBar` (`components/chrome/preferences-bar.tsx:11`) next to Sound and Motion toggles. Same visual language. Header location = reachable on every page including the cinematic landing. Never a footer-only switcher (mobile users won't scroll 6 viewports).

Optional 4-second toast on the AR build for visitors with `Accept-Language: en` ("تفضل بالإنجليزية؟ Switch to English") — common among gym owners with international training. Shown once, suppressed thereafter.

---

## 3. RTL support

**Library: native CSS + Tailwind built-in `rtl:` variants.** No `tailwindcss-rtl` plugin (deprecated; v3.3+ ships `rtl:`/`ltr:` variants matching `[dir="rtl"]` ancestor).

**Refactor strategy: opportunistic logical-properties migration.**

- New code uses `ms-*` / `me-*` / `ps-*` / `pe-*` / `start-*` / `end-*`.
- Existing physical utilities (`ml-*`, `mr-*`) flip when touched. After PR-Z all new commits are logical-by-default.
- `text-left`/`text-right` → `text-start`/`text-end`. These are the visual-break risk if missed — grep first (~20 hits).

**Cinematic scene quirks (NOT free):**

| Scene | What flips | Effort |
|---|---|---|
| `live-pulse-strip.tsx` | 12% sweep travels L→R via `translateX(-100%) → 900%`. Add parallel keyframe `live-pulse-sweep-rtl` going R→L, select via `[dir=rtl] &`. | small |
| `ember-seam.tsx` | `linear-gradient(90deg, ...)` and `breathe` `backgroundPosition: 0%→100%`. Under RTL flip to `270deg` and `100%→0%`. | small |
| `capability/index.tsx` (GSAP) | `gsap.to(track, { x: () => -(track.scrollWidth - section.clientWidth) })` translates negative X. RTL natural reading is R→L, so flip the sign (positive X). ~6 lines. Preserves DOM panel order. | medium |
| Sliding sidebar `layoutId` pills | Framer Motion `layoutId` derives from final layout — RTL just works. Verify only. | none |
| `HeroPoster` Ken Burns | If any `clip-path` or directional pan, needs RTL counterpart. Audit. | small |
| `pulse-travel` keyframe in `tailwind.config.ts:60` | Same fix as LivePulseStrip. | small |

**Number formatting:** `Intl.NumberFormat(locale, { style: 'currency', currency: 'EGP', numberingSystem: 'latn' })`. **Latin digits in Arabic text** — Egyptian web convention; Arabic-Indic digits read as old-fashioned. `tabular-nums` stays (both Inter and Plex Arabic support tabular figures).

---

## 4. Content fork

**Library: `next-intl@3` (~12 KB gz, app-router-native, RSC-first).**

Why not the alternatives:

- `next-i18next` (~30 KB, Pages-Router patterns) — wrong era.
- `react-i18next` (~22 KB + i18next ~15 KB) — server-component story is bolted on.
- Custom `useLocale()` + `t()` — tempting at ~150 strings, but reinvents ICU pluralization. Arabic has 6 plural forms (zero/one/two/few/many/other) — skip.
- `next-intl`: server-component translations strip from client bundle entirely. Native ICU MessageFormat. Canonical Next 15 choice.

**File structure:**

```
marketing/
  i18n/
    request.ts     // next-intl config — locale detection + load messages
    routing.ts     // shared routing config
  messages/
    en.json
    ar.json
```

**Pattern — RSC (preferred):** `const t = await getTranslations('pricing'); <h1>{t('headline')}</h1>` — zero client cost.

**Pattern — client (cinematic scenes):** wrap once with `<NextIntlClientProvider messages={...}>` in the locale layout, then `useTranslations('scene.hero')` inside.

**Message structure:** namespace by scene/page (`hero`, `inciting`, `capability.roster`, `pricing.faq`). EN and AR mirror 1:1; `next-intl`'s eslint plugin flags drift.

**Pluralization:** marketing surfaces few user-facing numbers. Recommend keeping mock numerics ("142 active members", "17 active now") as visual texture and translating only the *labels* — sidesteps the dual/plural complexity entirely.

---

## 5. Arabic font

**Decision: IBM Plex Sans Arabic (variable, self-hosted, OFL).**

Reasoning vs alternatives:

- **Tajawal** — popular, but heavy next to Inter; no variable cut means ~120 KB+ across weights.
- **Noto Sans Arabic** — too neutral / institutional. We're a premium brand; Noto reads as "Wikipedia."
- **Cairo** — derivative of Tajawal, same weight problem.
- **IBM Plex Sans Arabic** — variable (single ~80 KB woff2, ~38 KB subsetted gz), pairs with IBM Plex Sans which shares Inter's geometric humanist DNA. Egyptian gym owners read it as confident and modern, not generic.

**Loading strategy:**

1. Self-host at `marketing/public/fonts/ibm-plex-sans-arabic-variable.woff2` (parallel to Mona Sans in `lib/fonts.ts:33`).
2. Add `ibmPlexSansArabic` export in `lib/fonts.ts` via `localFont`, `preload: false` by default.
3. In `app/[locale]/layout.tsx`, conditionally inject `<link rel="preload" as="font" type="font/woff2" crossOrigin="anonymous" />` only when `locale === 'ar'`. EN visitors never download it.
4. Tailwind `fontFamily.sans` resolved via CSS:

   ```
   html        { font-family: var(--font-inter), system-ui, sans-serif; }
   html[lang="ar"] { font-family: var(--font-plex-arabic), var(--font-inter), system-ui, sans-serif; }
   ```

   For headlines under `[lang=ar]`, prepend `var(--font-plex-arabic)` so Plex Arabic renders the heavy weights instead of Inter's mediocre Arabic fallback (Mona Sans has no Arabic glyphs).

5. **AR fallback stack:** `'IBM Plex Sans Arabic', 'Geeza Pro', 'Tahoma', 'Arial', sans-serif`.

---

## 6. Component migration order

| Component | Effort | Notes |
|---|---|---|
| `app/layout.tsx` | small | `lang`/`dir` from segment param. Conditional Plex preload. |
| `app/[locale]/(site)/layout.tsx` | small | New file. Wrap `MotionRoot` with `NextIntlClientProvider`. |
| `lib/fonts.ts` | small | Add `ibmPlexSansArabic`. |
| `tailwind.config.ts` | small | `rtl:` is built-in; add custom dir-aware variants if needed. |
| `lib/seo.ts` | small | `buildMetadata` accepts `locale`, emits `alternates.languages`. |
| `app/sitemap.ts` | small | Each route × 2 locales with hreflang. |
| `middleware.ts` | small | Compose `next-intl`; geo→locale default. |
| `components/chrome/preferences-bar.tsx` | small | Add `LocaleToggle`. |
| `components/scenes/denouement/Footer.tsx` | small | ~10 strings. |
| `components/scenes/pricing/*` | medium | Translate + locale-aware Tier objects + EGP formatter. |
| `app/[locale]/(site)/pricing/page.tsx` | medium | ~80 strings + comparison table. |
| `components/scenes/reveal/*` | medium | Bento + dashboard mocks. Mostly copy. |
| `components/scenes/cold-open/Hero.tsx` + `HeroPoster.tsx` | medium | Headline/subhead/CTA + Ken Burns audit. |
| `components/scenes/inciting-incident/parts/*` | medium | 4 parts. Spreadsheet fragment may need digit consideration. |
| `components/primitives/live-pulse-strip.tsx` | small | RTL keyframe. |
| `components/primitives/ember-seam.tsx` | small | Flip gradient direction. |
| `components/scenes/capability/index.tsx` (GSAP) | **large** | Sign-flip `x` translation; smoke-test mobile + desktop + reduced-motion. |
| `components/lead-form.tsx` | medium | Translate labels + add `locale` to POST. |
| `app/api/lead/route.ts` | small (interface) | Accept `locale`. (γ4 implements.) |
| `app/(site)/blog/*` | — | **Defer to v2.** Keep blog EN-only with `<html lang="en">` override. |

---

## 7. SEO + sitemap diff

**Per-page metadata** in `lib/seo.ts`:

```
alternates: {
  canonical: `${SITE_URL}/${locale}${path}`,
  languages: {
    'en':        `${SITE_URL}/en${path}`,
    'ar-EG':     `${SITE_URL}/ar${path}`,
    'x-default': `${SITE_URL}/en${path}`,
  },
},
```

`x-default` is critical — tells Google which locale to serve in untargeted countries.

**Sitemap** (`app/sitemap.ts`): emit each `staticRoutes` entry twice (`/en/...` and `/ar/...`) with an `alternates` block. Next 15's `MetadataRoute.Sitemap` supports this natively.

**`<html>` attribute:** `<html lang={locale === 'ar' ? 'ar-EG' : 'en'} dir={locale === 'ar' ? 'rtl' : 'ltr'}>`. `ar-EG` (not just `ar`) — search engines rank-boost dialect-tagged pages for Egyptian queries.

**robots.txt:** no change.

---

## 8. Backend interface changes (γ4 follow-up)

Proposed contract changes; γ4 implements.

1. **`POST /api/lead` payload gains `locale: 'en' | 'ar'`** (required). Drives welcome-email language and onboarding flow.
2. **Lead row schema:** add `locale TEXT NOT NULL DEFAULT 'en'`. Backfill existing rows to `'en'`.
3. **Demo deep-link:** `console.ironpath.health/?demo_token=...` accepts optional `&lang=ar`. Honor for the welcome flow before trial gym sets a preference. Without it, default by Accept-Language.
4. **Welcome email:** AR variant needed. γ4 + Lens 2 handoff.
5. **`/api/lead` `redirect_url`:** append `?lang=${locale}` to the admin signup URL when `locale==='ar'`.

Marketing-side code is not blocked on these landing first; the lead form *will* send `locale` starting on PR-Y, so γ4 should accept-and-ignore until schema lands.

---

## 9. v1 implementation plan

**PR-X — Foundation (≈ 4 dev-days):**
- Install `next-intl`; restructure `app/(site)` → `app/[locale]/(site)`.
- Compose middleware (locale + existing tracking strip).
- `messages/en.json` + `messages/ar.json` skeleton (keys mirror current EN copy).
- IBM Plex Sans Arabic, conditional preload.
- Tailwind `[dir]` confirmed working.
- `<html lang dir>` correct.
- Locale switcher in `PreferencesBar`.
- `lib/seo.ts` + `app/sitemap.ts` emit alternates.
- **Done = EN site byte-identical, AR site renders English copy with Arabic font and `dir=rtl`. Visual smoke only.**

**PR-Y — Content + EGP pricing (≈ 5 dev-days):**
- All copy translated (Lens 2 delivers).
- Locale-aware `TIERS` array — EGP for AR, USD for EN. Thin `lib/pricing.ts` exporting `getTiers(locale)`.
- Pricing page and in-flow Pricing scene consume from the same source.
- `/api/lead` payload gains `locale`. Coordinate with γ4.
- All scenes other than Capability migrated to logical properties.
- **Done = AR site reads end-to-end. Capability still ships horizontal-scroll wrong-direction (acknowledged).**

**PR-Z — RTL polish (≈ 3 dev-days):**
- GSAP `xPercent` flip in Capability.
- `LivePulseStrip` + `EmberSeam` + `pulse-travel` RTL variants.
- `HeroPoster` Ken Burns audit.
- QA sweep: mobile, desktop, reduced-motion, slow 3G LCP.
- Keyboard tab-order under RTL (focus rings follow visual flow).
- **Done = AR feels native, not bolted-on.**

Total: ≈ **12 dev-days** for one engineer including buffer. Compresses to ~8 days if Lens 2's copy lands ahead of PR-Y.

---

## 10. Bundle / perf impact

- **`next-intl@3`:** ~12 KB gz on client routes using `useTranslations`. Server-only routes pay zero.
- **Plex Arabic woff2:** ~38 KB gz, AR-only.
- **Translation JSON:** ~6 KB gz per locale, lazy-loaded per namespace.
- **Middleware:** ~0.3 ms additional (negligible).
- **Net for EN visitor:** ~+4 KB gz initial route (locale detection + switcher). LCP unchanged.
- **Net for AR visitor:** ~+50 KB gz initial route. LCP +120 ms on slow 3G — acceptable, cached on subsequent navigations.

vs `react-i18next` + non-variable Tajawal (~22 + 18 + 120 = ~160 KB) this stack is **roughly 3× lighter** on AR first-load.

---

## 11. Things NOT to do

- **Don't auto-redirect a returning visitor based on geo without honoring the cookie.** #1 i18n hostility complaint.
- **Don't build a footer-only switcher.** Cinematic landing is full-screen story; users won't scroll 6 viewports for a flag.
- **Don't use country flags in the switcher.** Egyptian flag for Arabic excludes Saudi/Emirati owners. Use language names: "EN" / "العربية".
- **Don't mirror photographic assets.** Ken Burns pan can flip; faces and product shots stay oriented as-shot. RTL is reading order, not literal mirror.
- **Don't translate the brand name.** "IronPath" stays Latin script in AR copy. Optional transliterated subtitle ("آيرن باث") on first AR visit. Lens 2 call.
- **Don't ship Arabic-Indic numerals (٠١٢٣٤٥) by default.** Egyptian SaaS convention is Latin digits.
- **Don't use `tailwindcss-rtl` plugin.** Built-in `rtl:` variants + logical properties cover everything.
- **Don't half-ship.** AR with broken Capability scene is worse than no AR. PR-Z is non-optional for launch.
- **Don't translate the blog in v1.** Diluted authorship effort, low ROI. Decide in v2 based on actual traffic.
- **Don't forget the favicon / OG image.** Both currently EN-branded. If `app/opengraph-image.tsx` has English text overlays, generate an AR variant.

---

*Lens 3 / 4 — Frontend i18n Architect. Synthesizes with Lens 1 (market research → EGP tiers), Lens 2 (copy → translation source), Lens 4 (GTM → launch sequencing).*
