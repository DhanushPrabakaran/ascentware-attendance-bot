/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2BB3E4',
        primaryHover: '#1B9AC9',
        secondary: '#F8FAFC',
        tertiary: '#94A3B8',
        neutral: '#0F172A',
        background: '#0F172A',
        surface: '#1E293B',
        surfaceHover: '#334155',
        borderBase: '#334155',
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
