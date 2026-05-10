import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx,mdx}', './components/**/*.{ts,tsx}', './content/**/*.mdx'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Crimson scale -- admin parity with a11y additions.
        // brand-500 #C8102E fails WCAG AA body on ink-900 (3.36:1) -- never use for body text on dark.
        // brand-400 #FF4566 (5.93:1) is the body-on-dark companion.
        // brand-350 #FF6680 (7.03:1 AAA) is the focus-ring color.
        brand: {
          DEFAULT: '#C8102E',
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
        },
        // Warm ink scale -- admin parity, extended with 950.
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
        // Semantic
        success: '#10B981',
        warn:    '#F59E0B',
        error:   '#EF4444',
        info:    '#3B82F6',
      },
      fontFamily: {
        // Arabic font variable leads each stack; it's only set on the <html>
        // when locale === 'ar' (see app/ar/layout.tsx). For EN visitors the
        // var resolves to its empty default and the browser skips straight
        // to Inter / Mona Sans / system fonts. Net cost on EN: zero bytes,
        // zero CSS recompute.
        sans: [
          'var(--font-plex-arabic)',
          'var(--font-inter)',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
        mono: ['var(--font-jetbrains-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        display: [
          'var(--font-plex-arabic)',
          'var(--font-mona-sans)',
          'var(--font-inter)',
          'system-ui',
          'sans-serif',
        ],
      },
      keyframes: {
        'ember-breathe': {
          '0%, 100%': { backgroundPosition: '0% 50%', opacity: '0.6' },
          '50%':      { backgroundPosition: '100% 50%', opacity: '1.0' },
        },
        'pulse-travel': {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(900%)' },
        },
        'ken-burns': {
          '0%':   { transform: 'scale(1.0) translate(0, 0)' },
          '100%': { transform: 'scale(1.04) translate(-1%, -1%)' },
        },
      },
      animation: {
        'ember-breathe': 'ember-breathe 8s ease-in-out infinite',
        'pulse-travel':  'pulse-travel 1.2s linear infinite',
        'ken-burns':     'ken-burns 12s ease-out forwards',
      },
    },
  },
  plugins: [],
};

export default config;
