/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#fef2f3', 100: '#fde3e5', 200: '#fbcbd0', 300: '#f7a1a9', 400: '#f06b78', 500: '#e43d4e', 600: '#c8102e', 700: '#a80d27', 800: '#8c1026', 900: '#771226' },
        navy: { 50: '#eef3ff', 100: '#dae4ff', 200: '#bdd0ff', 300: '#90b2fe', 400: '#5c88fa', 500: '#3660f5', 600: '#2041ea', 700: '#1b3a8c', 800: '#162f6e', 900: '#0f1f4a', 950: '#0a1430' },
        gold: { 300: '#fde68a', 400: '#fcd34d', 500: '#f5b301', 600: '#d99a00' },
      },
      fontFamily: {
        sans: ['Poppins', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', '"Noto Serif Devanagari"', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 10px 40px -12px rgba(15, 31, 74, 0.25)',
        glow: '0 0 0 1px rgba(200,16,46,.15), 0 12px 40px -10px rgba(200,16,46,.45)',
      },
      keyframes: {
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-14px)' } },
        blob: { '0%,100%': { borderRadius: '42% 58% 70% 30% / 45% 45% 55% 55%' }, '50%': { borderRadius: '70% 30% 46% 54% / 30% 39% 61% 70%' } },
        shine: { from: { backgroundPosition: '200% 0' }, to: { backgroundPosition: '-200% 0' } },
        spinslow: { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        marquee: 'marquee 40s linear infinite',
        float: 'float 6s ease-in-out infinite',
        blob: 'blob 12s ease-in-out infinite',
        shine: 'shine 3s linear infinite',
        spinslow: 'spinslow 30s linear infinite',
      },
    },
  },
  plugins: [],
};
