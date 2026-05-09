/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Cyan accent — operator console identity (NOT orange — that's the gym admin app).
        // 400/500/600 follow PLATFORM_PLAN §3.2 verbatim:
        //   cyan-400 #67E8F9     cyan-500 #22D3EE (canonical primary)     cyan-600 #0EA5C4
        // Pre-review the scale was shifted one shade lighter, so every `bg-brand-500`
        // primary CTA was actually rendering at #06B6D4 (Tailwind's cyan-600). Phase B
        // plan-adherence review caught this; this remap restores the canonical hex.
        // 300 is intentionally NOT moved — `text-brand-300` is used widely for hover /
        // active accents and #67E8F9 is the right intensity there.
        brand: {
          DEFAULT: '#22D3EE',
          50:  '#ECFEFF',
          100: '#CFFAFE',
          200: '#A5F3FC',
          300: '#67E8F9',
          400: '#67E8F9',
          500: '#22D3EE',
          600: '#0EA5C4',
          700: '#0E7490',
          800: '#155E75',
          900: '#164E63',
        },
        // Console near-black background (distinct from admin's gray-950)
        canvas: '#0A0A0B',
        // Named neutrals per PLATFORM_PLAN §3.2
        ink: {
          50:  '#FAFAFA',
          100: '#E5E5E7',
          200: '#C4C4C8',
          300: '#9A9AA1',
          400: '#6B6B72',
          500: '#3F3F46',
          600: '#27272A',
          700: '#1C1C1F',
          800: '#141416',
          900: '#0A0A0B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        // §3.4 — tighter radius set than admin
        xs: '4px',
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '18px',
      },
    },
  },
  plugins: [],
};
