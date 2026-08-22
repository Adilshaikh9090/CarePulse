/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 950: '#070d1f', 900: '#0a1229', 800: '#101a38', 700: '#182450', 600: '#223064' },
        accent: { DEFAULT: '#38bdf8', soft: '#7dd3fc' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
