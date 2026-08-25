/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          950: v('n950'), 900: v('n900'), 800: v('n800'),
          700: v('n700'), 600: v('n600'),
        },
        slate: {
          50: v('s50'), 100: v('s100'), 200: v('s200'), 300: v('s300'),
          400: v('s400'), 500: v('s500'), 600: v('s600'),
        },
        sky: { 200: v('sky200'), 300: v('sky300'), 400: v('sky400') },
        rose: { 200: v('rose200'), 300: v('rose300'), 400: v('rose400') },
        amber: { 200: v('amber200'), 300: v('amber300'), 400: v('amber400') },
        emerald: { 200: v('em200'), 300: v('em300'), 400: v('em400') },
        violet: { 200: v('vio200'), 300: v('vio300') },
        line: 'var(--line)',
        linestrong: 'var(--linestrong)',
        subtle: 'var(--subtle)',
        hoverc: 'var(--hoverc)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
