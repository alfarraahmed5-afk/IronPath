// IronPath mobile NativeWind v4 configuration.
//
// Cinematic overhaul (PR A): tokens are sourced from
// `mobile/src/design-system/tokens/`. Tailwind classes (`bg-brand-500`,
// `text-ink-50`, `bg-surface-2`) and JS imports
// (`tokens.colors.brandDisplay`, `tokens.brand[500]`) now read from the
// SAME source. Token changes touch one file.
//
// Note: the design-system token files are TypeScript and pull from
// `react-native-reanimated` (motion.ts). Tailwind config runs in a Node
// build context that has no Metro / no RN; we therefore CANNOT
// `require('./src/design-system/tokens')` directly here -- it would
// transitively pull `react-native-reanimated` and crash.
//
// Instead: keep the color/font values inline but mirror the same hex
// codes the TS tokens export. A future improvement is a tiny build-time
// codegen step that reads colors.ts via ts-node and writes a plain JS
// `tokens.gen.js` for Tailwind to consume.

module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ----- Crimson scale (brand) -------------------------------------
        brand: {
          50:  '#FFF1F3',
          100: '#FFE4E8',
          200: '#FFC9D1',
          300: '#FF8FA1',
          350: '#FF6680',
          400: '#FF4566',
          450: '#FF1A3D',
          500: '#C8102E',
          600: '#A60D26',
          700: '#85091F',
          800: '#640618',
          900: '#430411',
          DEFAULT: '#C8102E',  // brand-500 (display)
          // Role aliases (also exposed at top-level under the same names).
          display: '#C8102E',
          text:    '#FF4566',
          focus:   '#FF6680',
          pressed: '#A60D26',
          hover:   '#FF8FA1',
          glow:    'rgba(200, 16, 46, 0.15)',
          ember:   'rgba(200, 16, 46, 0.60)',
        },

        // ----- Warm-ink scale (neutrals) ---------------------------------
        ink: {
          50:  '#FAFAFB',
          100: '#E5E5E7',
          200: '#D4D4DA',
          300: '#9A9AA1',
          400: '#A1A1AA',
          500: '#76767D',
          600: '#5A5A60',
          700: '#3A3A44',
          800: '#1F1F24',
          850: '#17171B',
          900: '#111114',
          950: '#0A0A0B',
        },

        // ----- Surfaces (semantic aliases over ink) ----------------------
        bg: '#0A0A0B',  // ink-950
        surface: {
          1: '#111114',  // ink-900
          2: '#17171B',  // ink-850
          3: '#1F1F24',  // ink-800
          4: '#2A2A32',
        },
        border: {
          DEFAULT: '#34343C',  // lens 9 lightened from #26262C
          subtle:  '#3A3A44',  // ink-700; lens 9 lightened from #1F1F25
        },

        // ----- Semantic colors -------------------------------------------
        success: {
          DEFAULT: '#10B981',  // marketing emerald
          dim:     'rgba(16, 185, 129, 0.15)',
        },
        danger: {
          DEFAULT: '#EF4444',
          dim:     'rgba(239, 68, 68, 0.15)',
        },
        warning: {
          DEFAULT: '#F59E0B',
          dim:     'rgba(245, 158, 11, 0.15)',
        },
        info: {
          DEFAULT: '#3B82F6',
          dim:     'rgba(59, 130, 246, 0.15)',
        },

        // ----- Text ------------------------------------------------------
        text: {
          primary:   '#F5F5F7',  // warm-shifted, NOT pure white (founder rule)
          secondary: '#A1A1AA',  // ink-400, AAA pass
          tertiary:  '#76767D',  // ink-500, lens 9 lightened
          disabled:  '#3A3A44',  // ink-700, lens 9 lightened
          'on-brand': '#FFFFFF',
        },

        // ----- Set-type colors (Q5 founder lock) -------------------------
        set: {
          normal:  '#9A9AA1',
          warmup:  '#3B82F6',
          dropset: '#FF7A3D',  // recolored from purple
          failure: '#FF1A3D',  // recolored to brand-450
        },

        // ----- Streak flame (Q6 documented exception) --------------------
        flame: {
          DEFAULT: '#FF7A3D',
          dim:     'rgba(255, 122, 61, 0.15)',
        },
      },
      fontFamily: {
        // Display + title (Mona Sans).
        display:  ['MonaSans-Bold'],
        'display-semi': ['MonaSans-SemiBold'],
        title:    ['MonaSans-SemiBold'],
        'title-bold': ['MonaSans-Bold'],

        // Body + caption (Barlow).
        body:     ['Barlow_400Regular'],
        medium:   ['Barlow_500Medium'],
        semibold: ['Barlow_600SemiBold'],
        bold:     ['Barlow_700Bold'],

        // Numerics (mono).
        mono: ['JetBrainsMono_500Medium'],

        // Arabic stack.
        ar:          ['IBMPlexSansArabic-Regular'],
        'ar-medium': ['IBMPlexSansArabic-Medium'],
        'ar-semi':   ['IBMPlexSansArabic-SemiBold'],
        'ar-bold':   ['IBMPlexSansArabic-Bold'],
      },
    },
  },
  plugins: [],
};
