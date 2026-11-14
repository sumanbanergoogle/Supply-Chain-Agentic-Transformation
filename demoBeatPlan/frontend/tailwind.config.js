/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0d1117',
        surface: '#161b22',
        border: '#30363d',
        textMain: '#e6edf3',
        textMuted: '#8b949e',
        healthy: '#2ea043',
        warning: '#d29922',
        critical: '#f85149',
        accent: '#58a6ff',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', '"Noto Sans Devanagari"', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      keyframes: {
        wave: {
          '0%, 100%': { height: '6px' },
          '50%': { height: '22px' },
        },
      },
      animation: {
        wave: 'wave 1.1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
