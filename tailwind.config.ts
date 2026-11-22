import type { Config } from 'tailwindcss';

// Brand: tan #AB8D69 (from the logo). `brand-dark` is for text/buttons: #AB8D69 on white is only ~3:1 contrast.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#AB8D69', dark: '#7A5F3E', light: '#D9C7AE' },
        walnut: { DEFAULT: '#1E1611', soft: '#2B2118' },
        bone: '#F6F1EA',
        line: '#E6DCCF',
        ink: '#2B2118',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      boxShadow: { card: '0 1px 2px rgba(43,33,24,.06), 0 8px 24px rgba(43,33,24,.08)' },
    },
  },
  plugins: [],
};
export default config;
