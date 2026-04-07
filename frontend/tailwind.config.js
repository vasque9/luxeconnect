/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0f',
        surface: '#131320',
        card: '#16162a',
        border: '#2a2a45',
        gold: { DEFAULT: '#c9a84c', light: '#e8d48b', dark: '#a07e2e' },
        crimson: { DEFAULT: '#c43b5c', light: '#e85d7e' },
        purple: { DEFAULT: '#7b5ea7', light: '#9d7ed0' },
        muted: '#8e8ca0',
        dim: '#5c5a6e',
      },
      fontFamily: { sans: ['Outfit', 'sans-serif'] },
    },
  },
  plugins: [],
};
