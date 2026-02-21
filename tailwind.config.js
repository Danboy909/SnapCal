/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'selector',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'premium-bg': '#F8F9FB',
        'premium-border': '#E6E8EC',
        'premium-bg-dark': '#0f172a', // Slate 900
        'premium-border-dark': '#1e293b', // Slate 800
        'premium-card-dark': '#1e293b', // Slate 800
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

