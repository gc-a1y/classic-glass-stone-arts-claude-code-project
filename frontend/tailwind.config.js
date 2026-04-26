/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#FFFFFF',
        surface: {
          DEFAULT: '#FFFFFF',
          2: '#F7F6F3',
        },
        gold: {
          DEFAULT: '#C9A84C',
          light: '#E0BF6F',
          dark: '#A88930',
        },
        border: '#E5E2DC',
        text: {
          DEFAULT: '#1A1714',
          muted: '#6B6560',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        input: '8px',
      },
      boxShadow: {
        gold: '0 0 20px rgba(201,168,76,0.15)',
        'gold-lg': '0 0 40px rgba(201,168,76,0.25)',
      },
    },
  },
  plugins: [],
}
