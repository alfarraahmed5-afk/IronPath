/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Plan §3.2 ink scale — owns the dark surface ladder. The Tailwind
        // gray-* defaults skew blue (#111827, #030712); these are warmer +
        // closer to forged steel.
        ink: {
          50: '#FAFAFB',
          200: '#D4D4DA',
          400: '#8A8A95',
          600: '#3A3A44',
          700: '#2A2A31',
          800: '#1F1F24',
          850: '#17171B',
          900: '#111114',
          950: '#0A0A0B',
        },
        // Plan §3.2 brand orange. brand maps to brand-500 for backwards-compat
        // with existing className references.
        brand: {
          DEFAULT: '#FF6B35',
          400: '#FF8A5C',
          500: '#FF6B35',
          600: '#E55A28',
        },
      },
      fontFamily: {
        // Inter for UI, JetBrains Mono for numerics/IDs/timestamps. Wired here
        // so future components can write `font-display` / `font-mono` instead
        // of style={{ fontFamily: 'JetBrains Mono, monospace' }} (today's
        // anti-pattern in DashboardPage's tooltip).
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      keyframes: {
        // Skeleton shimmer per plan §3.7 — slow enough to avoid motion fatigue
        // on a dashboard the owner stares at daily (motion designer's call).
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        // Brand artifact: slow horizontal slide of the radial ember
        // gradient, paired with a gentle opacity breathe. Mirrors the
        // .ember-seam definition in src/index.css.
        'ember-breathe': {
          '0%, 100%': { backgroundPosition: '0% 0', opacity: '0.85' },
          '50%': { backgroundPosition: '100% 0', opacity: '1' },
        },
        // LivePulseStrip traveler — a 12%-wide ember sliver sweeping
        // across the parent. Mirrors the .pulse-travel definition in
        // src/index.css.
        'pulse-travel': {
          '0%': { left: '-12%' },
          '100%': { left: '100%' },
        },
        // Slow Ken Burns photo zoom for hero/marketing imagery — alternate
        // direction so the photo gently inhales/exhales without snapping
        // back to the start each loop.
        'ken-burns': {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.04)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s linear infinite',
        'ken-burns': 'ken-burns 12s ease-in-out infinite alternate',
      },
    },
  },
  plugins: [],
};
