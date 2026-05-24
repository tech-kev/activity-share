/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts,js}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark UI Palette
        ink: {
          950: '#0a0a0b',
          900: '#101013',
          850: '#15161a',
          800: '#1c1d22',
          700: '#26282f',
          600: '#363841',
          500: '#4b4e58',
          400: '#6c6f7a',
          300: '#9094a0',
          200: '#c4c7cf',
          100: '#e6e8ec',
        },
        accent: {
          DEFAULT: '#f97316',
          hover: '#ea580c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Bebas Neue', 'Impact', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
