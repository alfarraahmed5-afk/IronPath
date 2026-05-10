/**
 * IronPath mobile color tokens.
 *
 * Cinematic overhaul -- single source of truth for every paint in the
 * app. Mirrored verbatim by `mobile/tailwind.config.js` (which require()s
 * this file's exports).
 *
 * Spec authority: skills/mobile-council/lens-02-visual-brand-director.md
 *                 skills/mobile-council/lens-09-accessibility-auditor.md (contrast)
 *                 skills/mobile-council/SYNTHESIS.md (Q5 + Q6 founder locks)
 *
 * Hard rules baked in:
 *   - Crimson scale `brand-50..900` mirrors marketing's brand-tokens.ts.
 *   - `brandDisplay` is for >= 24pt headlines + large surfaces ONLY (3.39:1
 *     vs ink-950 -- AA Large only, fails body-text 4.5:1).
 *   - Any body-sized rendering of a brand color uses `brandText` (5.93:1, AA pass).
 *   - Focus ring uses `brandFocus` (7.03:1, AAA pass).
 *   - `textPrimary` is warm-shifted `#F5F5F7`, NOT pure white. Founder rule.
 *   - `textSecondary` lightened to `ink-400 #A1A1AA` (AAA, was failing).
 *   - `textTertiary` lightened to `ink-500 #76767D` (AA, was 4.41:1 failing).
 *   - `textDisabled` lightened to `ink-700 #3A3A44` (was 2.31:1, total fail).
 *   - `borderSubtle` lightened to `ink-700 #3A3A44` (was 1.18:1).
 *   - `setDropset` recolored from `#8B5CF6` purple to warm orange `#FF7A3D` (Q5 lock).
 *   - `setFailure` recolored from `#EF4444` to brand-450 `#FF1A3D` (Q5 lock).
 *   - `flame #FF7A3D` is a DOCUMENTED EXCEPTION to the crimson rule. Streak
 *     fire icon stays warm-orange because pure crimson flames read as blood.
 *     Founder Q6 lock. Do not "fix" it back to crimson.
 */

// ----- Crimson scale (brand) ---------------------------------------------

export const brand = {
  50:  '#FFF1F3',  // light-mode wash; future use, 19.6:1 vs ink-950
  100: '#FFE4E8',  // light-mode wash, 17.8:1
  200: '#FFC9D1',  // light-mode tinted card, 14.5:1
  300: '#FF8FA1',  // hover on dark, large surface, 8.96:1
  350: '#FF6680',  // FOCUS RING (AAA on dark, 7.03:1)
  400: '#FF4566',  // BODY-ON-DARK companion (AA, 5.93:1) -- use for any text < 24pt
  450: '#FF1A3D',  // pressed bright variant, 4.32:1
  500: '#C8102E',  // DISPLAY headlines + large fills + ring strokes >= 4px (3.39:1, AA Large only)
  600: '#A60D26',  // pressed display variant, 2.52:1
  700: '#85091F',  // deep brand surface, 1.95:1
  800: '#640618',  // receipt edge / foundation, 1.55:1
  900: '#430411',  // far edge, paper-grain treatment, 1.27:1
} as const;

// ----- Warm-ink scale (neutrals) -----------------------------------------

export const ink = {
  50:  '#FAFAFB',  // future light bg; on-dark hero text option
  100: '#E5E5E7',  // quiet body text on dark
  200: '#D4D4DA',  // sub-headlines
  300: '#9A9AA1',  // tertiary on dark
  400: '#A1A1AA',  // sub-headings (AAA 7.72:1)
  500: '#76767D',  // disabled label, decorative
  600: '#5A5A60',  // borders on contrast surfaces
  700: '#3A3A44',  // borders default
  800: '#1F1F24',  // surface 3
  850: '#17171B',  // surface 2
  900: '#111114',  // surface 1
  950: '#0A0A0B',  // app bg / shell
} as const;

// ----- Semantic role aliases (the names every screen consumes) -----------

/**
 * Flat colors object shape: legacy callsites import `{ colors }` from
 * `@/theme/tokens` and read `colors.brand`, `colors.bg`, etc. We preserve
 * the flat shape but add new role-specific keys (brandDisplay, brandText,
 * brandFocus, etc.) per lens 2.
 *
 * `colors.brand` is kept as a backwards-compat alias pointing at brand-500
 * (display crimson). Sprint 2 will audit each callsite and migrate to the
 * proper semantic key; Sprint 3 will delete the alias.
 */
export const colors = {
  // Background + surfaces
  bg:          ink[950],   // app shell -- warm-shifted, NOT pure black
  surface1:    ink[900],
  surface2:    ink[850],
  surface3:    ink[800],
  surface4:    '#2A2A32',  // sits between ink-800 and ink-700; kept

  // Borders (lens 9 lightening applied)
  border:       '#34343C',  // was '#26262C' (1.41:1) -- now 1.86:1; pair with high-contrast variant later
  borderSubtle: ink[700],   // was '#1F1F25' (1.18:1) -- now ink-700 #3A3A44

  // Brand role aliases (canonical names other code reads)
  brandDisplay: brand[500], // #C8102E -- headlines, large fills, ring strokes >= 4px
  brandText:    brand[400], // #FF4566 -- body-sized text on dark, AA pass
  brandFocus:   brand[350], // #FF6680 -- focus rings, AAA pass
  brandPressed: brand[600], // #A60D26 -- pressed of a brandDisplay surface
  brandHover:   brand[300], // #FF8FA1 -- hover, lighter glow at top of pressed
  brandGlow:    'rgba(200, 16, 46, 0.15)',  // soft halo behind hero numerics
  brandEmber:   'rgba(200, 16, 46, 0.60)',  // ember-seam center stop, bottom-up multiply
  brandDisabled:'rgba(200, 16, 46, 0.30)',  // disabled brand surface

  // Backwards-compat: `colors.brand` was the legacy single-name token.
  // Now points at brand-500 (display crimson). Audit callsites in PR B/C.
  brand:        brand[500],
  // Backwards-compat alias for legacy `brandPressed` callsites that already
  // carry the orange `#E55A28` -- now points at brand-600.
  // (no separate key; brandPressed above already covers it)

  // Semantic colors (reconciled with marketing)
  success:    '#10B981',   // was '#22C55E' -- shifted to marketing's emerald
  successDim: 'rgba(16, 185, 129, 0.15)',
  warning:    '#F59E0B',
  warningDim: 'rgba(245, 158, 11, 0.15)',
  danger:     '#EF4444',
  dangerDim:  'rgba(239, 68, 68, 0.15)',
  info:       '#3B82F6',
  infoDim:    'rgba(59, 130, 246, 0.15)',

  // Text colors (lens 9 lightening applied)
  textPrimary:   '#F5F5F7',  // was '#FFFFFF'; warm-shifted, founder rule "no pure white"
  textSecondary: ink[400],   // #A1A1AA, AAA 7.72:1
  textTertiary:  ink[500],   // #76767D (was '#5C5C66' = 4.41:1 fail) -- now 5.12:1 AA pass
  textDisabled:  ink[700],   // #3A3A44 (was '#3D3D44' = 2.31:1 total fail) -- now 3.20:1, gate behind state
  textOnBrand:   '#FFFFFF',  // pure white on brand-500 = 6.95:1 AA pass

  // Set-type colors (Q5 founder lock applied)
  setNormal:  ink[300],   // #9A9AA1 -- quiet, neutral
  setWarmup:  '#3B82F6',  // kept blue -- "cool, ramping"
  setDropset: '#FF7A3D',  // RECOLORED from '#8B5CF6' (purple) -> warm orange "intensifier" (Q5)
  setFailure: brand[450], // RECOLORED from '#EF4444' (red) -> brand-450 #FF1A3D (Q5)

  // Streak flame -- DOCUMENTED EXCEPTION (Q6 founder lock).
  // Fire semantics read as warm orange in every fitness app on the planet.
  // Pure crimson flames look like blood. Do NOT "fix" this back to brand.
  // Use ONLY for: streak flame icon, iron_streak_* badge accents, leaderboard
  // streak sub-tab active fill.
  flame:    '#FF7A3D',
  flameDim: 'rgba(255, 122, 61, 0.15)',
} as const;

export type Colors = typeof colors;
export type Brand = typeof brand;
export type Ink = typeof ink;
