/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#080a0f',
        foreground: '#f3f4f6',
        card: '#10131c',
        muted: '#1a2030',
        border: '#28324a',
        primary: '#22d3ee',
        accent: '#60a5fa',
        success: '#22c55e',
        danger: '#ef4444'
      },
      boxShadow: {
        glow: '0 0 30px rgba(34,211,238,.15)'
      }
    }
  },
  plugins: []
};
