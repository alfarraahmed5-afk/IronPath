/**
 * IronPath mobile typography tokens.
 *
 * Spec authority: skills/mobile-council/lens-02-visual-brand-director.md (P0-4)
 *                 skills/mobile-council/lens-10-rn-expo-architect.md (A5)
 *
 * Stack:
 *   - MonaSans-{Regular,Medium,SemiBold,Bold} -- display + title roles + hero numerics
 *   - Barlow_{400Regular,500Medium,600SemiBold,700Bold} -- body / label / caption / overline
 *   - JetBrainsMono_500Medium -- inline tabular numerics + mono
 *   - IBMPlexSansArabic_{Regular,Medium,SemiBold,Bold} -- AR locale companion
 *
 * Variable-axis interpolation is iOS-only and deferred (lens 10 risk #6).
 * Mona Sans is shipped as 4 named static cuts, all loaded from the same
 * variable WOFF2 -- expo-font snaps to the nearest static instance. See
 * `mobile/app/_layout.tsx` for the load entries.
 *
 * Every numeric variant carries `fontVariant: ['tabular-nums']` so digits
 * column-align inside StatCards.
 *
 * Dynamic Type caps (lens 9): display 1.4x, body 1.8x, caption uncapped.
 * Implementation lives on the `<Text>` primitive (Team B), not in tokens.
 */

// Latin (default) type scale.
//
// `as const` preserves literal keys for `keyof typeof typography`, which
// is what the `<Text variant=>` prop type relies on.
export const typography = {
  // Display (Mona Sans Bold/SemiBold). Hero numerics and login wordmarks.
  display1: { fontFamily: 'MonaSans-Bold',     fontSize: 56, lineHeight: 60, letterSpacing: -1.4 },
  display2: { fontFamily: 'MonaSans-Bold',     fontSize: 44, lineHeight: 48, letterSpacing: -1.0 },
  display3: { fontFamily: 'MonaSans-SemiBold', fontSize: 32, lineHeight: 36, letterSpacing: -0.6 },

  // Title (Mona Sans).
  title1:   { fontFamily: 'MonaSans-SemiBold',  fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
  title2:   { fontFamily: 'MonaSans-SemiBold',  fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  title3:   { fontFamily: 'Barlow_600SemiBold', fontSize: 17, lineHeight: 22 },

  // Body (Barlow).
  body:         { fontFamily: 'Barlow_400Regular',  fontSize: 15, lineHeight: 22 },
  bodyEmphasis: { fontFamily: 'Barlow_600SemiBold', fontSize: 15, lineHeight: 22 },
  label:        { fontFamily: 'Barlow_500Medium',   fontSize: 13, lineHeight: 18, letterSpacing: 0.1 },
  caption:      { fontFamily: 'Barlow_400Regular',  fontSize: 12, lineHeight: 16 },
  overline:     { fontFamily: 'Barlow_600SemiBold', fontSize: 11, lineHeight: 14, letterSpacing: 1.0, textTransform: 'uppercase' as const },

  // Numerics. Inline (mono) for tabular numbers in running text;
  // numericValue (Mona Sans) for StatCard small; numericHero for the
  // workout-finish "total volume" display.
  //
  // `fontVariant` is typed as the explicit literal-tuple cast below
  // because RN's TextStyle expects a MUTABLE `FontVariant[]` array, but
  // wrapping the outer `as const` would freeze it. The cast preserves
  // the literal element while leaving the array mutable for assignment.
  numericInline: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 14, lineHeight: 20, fontVariant: ['tabular-nums'] as Array<'tabular-nums'> },
  numericValue:  { fontFamily: 'MonaSans-Bold',           fontSize: 28, lineHeight: 32, letterSpacing: -0.2, fontVariant: ['tabular-nums'] as Array<'tabular-nums'> },
  numericHero:   { fontFamily: 'MonaSans-Bold',           fontSize: 56, lineHeight: 56, letterSpacing: -1.4, fontVariant: ['tabular-nums'] as Array<'tabular-nums'> },

  // Mono. Code, invite codes, exact dates.
  mono: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 14, lineHeight: 20 },
} as const;

// Backwards-compat aliases. Legacy code reads `type.numeric` and
// `type.numericLarge`; map them onto the new names so existing screens
// keep compiling.
export const type = {
  ...typography,
  numeric:      typography.numericValue,
  numericLarge: typography.numericHero,
} as const;

// AR locale (Arabic) type scale.
//
// IBM Plex Sans Arabic statics replace Mona Sans + Barlow for every glyph
// EXCEPT inline numerics: per the founder rule, numerics in Arabic stay
// JetBrains Mono with western digits (matches marketing's
// `[lang^="ar"] [data-numeric]` rule).
//
// Consumers select via `i18n.locale === 'ar' ? typographyAr : typography`.
// The `<Text>` primitive (Team B) wires this through ThemeProvider.isRTL.
export const typographyAr = {
  display1: { fontFamily: 'IBMPlexSansArabic-Bold',     fontSize: 56, lineHeight: 60, letterSpacing: -1.4 },
  display2: { fontFamily: 'IBMPlexSansArabic-Bold',     fontSize: 44, lineHeight: 48, letterSpacing: -1.0 },
  display3: { fontFamily: 'IBMPlexSansArabic-SemiBold', fontSize: 32, lineHeight: 36, letterSpacing: -0.6 },
  title1:   { fontFamily: 'IBMPlexSansArabic-SemiBold', fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
  title2:   { fontFamily: 'IBMPlexSansArabic-SemiBold', fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  title3:   { fontFamily: 'IBMPlexSansArabic-SemiBold', fontSize: 17, lineHeight: 22 },
  body:         { fontFamily: 'IBMPlexSansArabic-Regular',  fontSize: 15, lineHeight: 22 },
  bodyEmphasis: { fontFamily: 'IBMPlexSansArabic-SemiBold', fontSize: 15, lineHeight: 22 },
  label:        { fontFamily: 'IBMPlexSansArabic-Medium',   fontSize: 13, lineHeight: 18, letterSpacing: 0.1 },
  caption:      { fontFamily: 'IBMPlexSansArabic-Regular',  fontSize: 12, lineHeight: 16 },
  overline:     { fontFamily: 'IBMPlexSansArabic-SemiBold', fontSize: 11, lineHeight: 14, letterSpacing: 1.0, textTransform: 'uppercase' as const },
  // Numerics keep western digits via JetBrains Mono.
  numericInline: typography.numericInline,
  numericValue:  typography.numericValue,
  numericHero:   typography.numericHero,
  mono:          typography.mono,
} as const;

// Family-name constants for direct fontFamily props (e.g. when a screen
// passes fontFamily explicitly to a third-party chart label).
export const fontFamilies = {
  monaRegular:  'MonaSans-Regular',
  monaMedium:   'MonaSans-Medium',
  monaSemiBold: 'MonaSans-SemiBold',
  monaBold:     'MonaSans-Bold',

  barlowRegular:  'Barlow_400Regular',
  barlowMedium:   'Barlow_500Medium',
  barlowSemiBold: 'Barlow_600SemiBold',
  barlowBold:     'Barlow_700Bold',

  mono: 'JetBrainsMono_500Medium',

  arRegular:  'IBMPlexSansArabic-Regular',
  arMedium:   'IBMPlexSansArabic-Medium',
  arSemiBold: 'IBMPlexSansArabic-SemiBold',
  arBold:     'IBMPlexSansArabic-Bold',
} as const;

export type Typography = typeof typography;
export type TypographyAr = typeof typographyAr;
