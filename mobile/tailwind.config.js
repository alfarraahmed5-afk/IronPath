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
        bg:  '#000000',
        surface: {
          1: '#0A0A0B',
          2: '#16161A',
          3: '#1F1F25',
          4: '#2A2A32',
        },
        border: {
          DEFAULT: '#26262C',
          subtle:  '#1F1F25',
        },
        brand: {
          DEFAULT: '#FF6B35',
          pressed: '#E55A28',
          glow:    'rgba(255, 107, 53, 0.15)',
        },
        success: {
          DEFAULT: '#22C55E',
          dim:     'rgba(34, 197, 94, 0.15)',
        },
        danger: {
          DEFAULT: '#EF4444',
          dim:     'rgba(239, 68, 68, 0.15)',
        },
        warning: '#F59E0B',
        info:    '#3B82F6',
        text: {
          primary:   '#FFFFFF',
          secondary: '#A1A1A8',
          tertiary:  '#5C5C66',
          disabled:  '#3D3D44',
        },
      },
      fontFamily: {
        display:      ['BarlowCondensed_900Black'],
        'display-eb': ['BarlowCondensed_800ExtraBold'],
        'display-b':  ['BarlowCondensed_700Bold'],
        title:        ['Barlow_700Bold'],
        'title-semi': ['Barlow_600SemiBold'],
        body:         ['Barlow_400Regular'],
        medium:       ['Barlow_500Medium'],
        semibold:     ['Barlow_600SemiBold'],
        bold:         ['Barlow_700Bold'],
        mono:         ['JetBrainsMono_500Medium'],
      },
    },
  },
  plugins: [],
};
