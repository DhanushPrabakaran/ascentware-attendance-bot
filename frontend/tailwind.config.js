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
        secondary: '#FFFFFF',
        tertiary: '#004B66',
        neutral: '#001A24',
        background: '#001A24',
        surface: 'rgba(255, 255, 255, 0.05)',
        borderBase: 'rgba(255, 255, 255, 0.1)',
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
