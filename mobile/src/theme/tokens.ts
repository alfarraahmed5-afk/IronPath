export const colors = {
  bg:        '#000000',
  surface1:  '#0A0A0B',
  surface2:  '#16161A',
  surface3:  '#1F1F25',
  surface4:  '#2A2A32',

  border:       '#26262C',
  borderSubtle: '#1F1F25',

  brand:       '#FF6B35',
  brandPressed:'#E55A28',
  brandGlow:   'rgba(255, 107, 53, 0.15)',

  success:    '#22C55E',
  successDim: 'rgba(34, 197, 94, 0.15)',
  danger:     '#EF4444',
  dangerDim:  'rgba(239, 68, 68, 0.15)',
  warning:    '#F59E0B',
  info:       '#3B82F6',

  textPrimary:   '#FFFFFF',
  textSecondary: '#A1A1A8',
  textTertiary:  '#5C5C66',
  textDisabled:  '#3D3D44',
  textOnBrand:   '#FFFFFF',

  setNormal:  '#A1A1A8',
  setWarmup:  '#3B82F6',
  setDropset: '#8B5CF6',
  setFailure: '#EF4444',
} as const;

export const spacing = {
  xxs:  2,
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   20,
  xl:   24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const;

export const radii = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  full: 9999,
} as const;

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  floating: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;

export const motion = {
  fast: 150,
  base: 220,
  slow: 320,
} as const;

export const type = {
  display1: { fontFamily: 'BarlowCondensed_900Black',      fontSize: 64, lineHeight: 64, letterSpacing: -1.5 },
  display2: { fontFamily: 'BarlowCondensed_800ExtraBold',  fontSize: 48, lineHeight: 52, letterSpacing: -1 },
  display3: { fontFamily: 'BarlowCondensed_700Bold',       fontSize: 36, lineHeight: 40, letterSpacing: -0.5 },
  title1:   { fontFamily: 'Barlow_700Bold',                fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  title2:   { fontFamily: 'Barlow_700Bold',                fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  title3:   { fontFamily: 'Barlow_600SemiBold',            fontSize: 17, lineHeight: 22 },
  body:     { fontFamily: 'Barlow_400Regular',             fontSize: 15, lineHeight: 22 },
  bodyEmphasis: { fontFamily: 'Barlow_600SemiBold',        fontSize: 15, lineHeight: 22 },
  label:    { fontFamily: 'Barlow_500Medium',              fontSize: 13, lineHeight: 18, letterSpacing: 0.1 },
  caption:  { fontFamily: 'Barlow_400Regular',             fontSize: 12, lineHeight: 16 },
  overline: { fontFamily: 'Barlow_600SemiBold',            fontSize: 11, lineHeight: 14, letterSpacing: 1.0, textTransform: 'uppercase' as const },
  numeric:  { fontFamily: 'BarlowCondensed_700Bold',       fontSize: 28, lineHeight: 32, fontVariant: ['tabular-nums'] as unknown[] as any },
  numericLarge: { fontFamily: 'BarlowCondensed_900Black',  fontSize: 56, lineHeight: 56, fontVariant: ['tabular-nums'] as unknown[] as any },
  mono:     { fontFamily: 'JetBrainsMono_500Medium',       fontSize: 14, lineHeight: 20 },
} as const;
