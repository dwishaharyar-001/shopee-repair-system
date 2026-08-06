/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
        },
        shopee: {
          orange: '#ee4d2d',
          dark: '#1e293b',
          sidebar: '#1e222d',
        }
      }
    },
  },
  plugins: [],
}
