export default {
  content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        pink: { DEFAULT: '#F0288C', deep: '#C4146E', hover: '#F54A9E' },
        ink: '#0A0A0A',
        ivory: '#FAF8F6',
        blush: '#F9E5ED',
        champagne: '#E8D8C5',
        gold: '#C5A46D',
        charcoal: '#292529',
        muted: '#88838A',
        subtle: '#6B666D',
        line: '#E9E3DE',
        canvas: '#F5F4F3',
        whatsapp: { DEFAULT: '#1F7A4D', hover: '#18643F' },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
      transitionTimingFunction: {
        lux: 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(10,10,10,0.04), 0 8px 24px -12px rgba(10,10,10,0.12)',
        lift: '0 24px 60px -20px rgba(10,10,10,0.35)',
      },
    },
  },
  plugins: [],
};
