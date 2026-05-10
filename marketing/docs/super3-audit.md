# Super Agent 3 audit log

Recovery sprint, 2026-05-10. Scope: EN content consistency + Hero blur fix
+ cross-page audit. Companion to Super Agents 1, 2, 4 working in parallel.

Base commit verified: `d90ad5b` (matches required minimum).

## Files touched

### `marketing/components/scenes/cold-open/Hero.tsx`
**Issue:** Framer Motion intro animation (`initial: blur(8px) -> 0`) re-fires
every time the visitor navigates back to `/` because the component remounts
and Framer's `initial` is a per-mount value. Founder feedback: jarring.

**Fix:** Session-scoped skip flag at `sessionStorage['ironpath-hero-played']`.
- Mount renders the SSR-default pre-animated state to avoid hydration
  mismatch.
- `useEffect` reads the flag; if `'true'`, all three child motion variants
  collapse to a static end-state (`duration: 0`, all initial == animate).
- After the first visit a second `useEffect` schedules a write of the flag
  1s after mount (longer than the 600ms intro so even a fast back-nav still
  records it).
- `try/catch` around storage so private-browsing visitors fall through to
  the original behavior (animation plays once per page load).

### `marketing/messages/en.json`
**Issue 1 (homepage Pricing scene <-> /pricing wording drift):** Starter
tier features in `scenes.pricing.tiers.starter.features` used different
wording from the canonical `pricing.tiers.starter.features` list.

| Before (scene) | After (canonical /pricing wording) |
|---|---|
| Member roster & attendance | Member app (iOS + Android) |
| Workout programming, 600+ movements | Workout builder, 600+ movements |
| QR poster forge | QR poster for the gym wall |
| Email support | Email support, 1 business day |

Growth + Unlimited scene wording already matched /pricing - no change.

**Issue 2 (FAQ Q6 timeline inaccuracy):** FAQ said "Class scheduling +
waitlists, churn dashboard, multi-location, and a member-import wizard are
all in the next two quarters." Roadmap reality:
- Bulk member-import wizard: Q3 2026 (next quarter - fine)
- Class scheduling + waitlists: Q4 2026 (start), Q1 2027 (finish)
- Churn risk dashboard: Q1 2027 (3 quarters out)
- Multi-location: Q2 2027 (4 quarters out - definitely not "next two")

Replaced with quarter-accurate breakdown. Cross-references the /roadmap
page where the same items are listed with the same target dates.

### `marketing/app/(site)/eg/page.tsx`
**Issue:** Three stray `,  ` artifacts (comma + double-space + content)
that look like remnants of an em-dash purge that left junk:
- L149: "follows up first ,  and you're"
- L194: "retention nudges ,  automated."
- L325: "in-person demo ,  usually within a week."

Replaced with clean comma punctuation. EGP pricing (1,350 / 2,750 / 5,300),
WhatsApp number (+20 10 3659 6238), and "Ahmed"-only naming all verified
unchanged.

## Files audited, no changes needed

- `marketing/app/(site)/pricing/page.tsx` - FAQ structure correct, all
  CTAs already point to `/start` (verified: lines 106, 177). Tier wording
  is the canonical reference.
- `marketing/app/(site)/roadmap/page.tsx` - Renders messages from JSON;
  no inline copy. Shipped list verified against `docs/DEV_LOG.md` (trial
  email sequence, cancellation save, activation milestones, custom
  branding all confirmed shipped per Phase C entry 2026-05-10).
- `marketing/app/(site)/for-gyms/page.tsx` - Pure JSON-driven; references
  `$49 / $99 / $199` matches canonical pricing.
- `marketing/app/(site)/blog/page.tsx`, `[slug]/page.tsx`, `start/page.tsx`
  - No issues. All "Start free trial" CTAs go to `/start`.
- `marketing/app/(legal)/privacy/page.tsx`, `terms/page.tsx` - Pure
  JSON-driven; legal copy unchanged.
- `marketing/content/blog/*.mdx` - No em dashes, no Mindbody/Glofox
  mentions, no founder full name, no "$49 / $99 / $199" inconsistency.
- `marketing/components/scenes/pricing/index.tsx`, `TierCard.tsx`,
  `parts/FeatureList.tsx` - No code changes; the JSON copy update flows
  through unchanged.

## Audit checks (negative results, all clean)

- `grep -n` for U+2014 EM DASH across owned files: 0 hits.
- `grep -n "Mindbody\|Glofox"` across `messages/`, `app/`, `components/`,
  `content/`: 0 hits in user-facing strings (only in `/docs/`
  research notes, which are not visitor-facing).
- `grep -n "text-brand-500"` for body emphasis: 0 hits in any owned
  file. (text-brand-500 is correctly used only as bg/border on CTAs and
  accents.)
- Founder full name search: 0 hits. Only "Ahmed" references.
- WhatsApp number consistency: `+20 10 3659 6238` everywhere
  (`/eg/page.tsx`, `/start/page.tsx`).
- All `Start free trial` / `Start trial` CTA hrefs route to `/start` -
  verified by reading every page in scope. None go to admin.ironpath.health.
- Tier name consistency: `Starter / Growth / Unlimited` everywhere on the
  EN side. The `/eg` page intentionally uses `Pro` for the EGP top tier
  per founder direction (file comment confirms).
- 30-day trial length consistency: every reference is "30-day". The
  blog post `30-day-trial-design.mdx` discusses 14-day as the rejected
  industry convention (correct contextual use, not a contradiction).
- en.json is valid JSON (validated via `node -e "JSON.parse(...)"`).

## Inconsistencies found and fixed: 5

1. Hero blur re-fires on every back-nav (sessionStorage skip flag).
2. Homepage Starter tier wording drift (4 features renamed to canonical).
3. FAQ Q6 quarterly target inaccuracy (rewritten with real dates).
4. Three `,  ` typo artifacts in /eg page (cleaned to plain commas).
5. (Verification) /pricing FAQ Q3 wording "Pricing scales with tier, not
   headcount" matches the per-tier price ladder - no contradiction with
   the brief's described "$49/$99/$199 fixed" phrasing (that phrasing
   does not exist in the current FAQ; brief was describing a prior
   version that was already cleaned up).

## Items flagged for founder approval

None - all changes either fix factual errors, resolve typo artifacts, or
align wording to existing canonical copy that the founder has already
approved (the /pricing page).
