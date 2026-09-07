/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0070F3', // Vercel blue
        primaryHover: '#0051B3',
        secondary: '#111827', // Deep text
        tertiary: '#6B7280', // Subdued text
        neutral: '#F9FAFB', // Background
        background: '#F9FAFB',
        surface: '#FFFFFF', // Cards
        surfaceHover: '#F3F4F6', // Card hover
        borderBase: '#E5E7EB', // Borders
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'saas': '0 0 0 1px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.05)',
        'saas-hover': '0 0 0 1px rgba(0, 0, 0, 0.05), 0 4px 12px rgba(0, 0, 0, 0.08)',
        'saas-lg': '0 0 0 1px rgba(0, 0, 0, 0.05), 0 12px 24px rgba(0, 0, 0, 0.08)',
      }
    },
  },
  plugins: [],
}
