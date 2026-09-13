/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg': '#0D1117',
        'bg2': '#161B22',
        'bg3': '#1C2128',
        'accent': '#00E5B0',
        'border': 'rgba(255,255,255,0.08)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}