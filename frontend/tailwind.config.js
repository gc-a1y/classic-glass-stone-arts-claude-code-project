/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#FFFFFF',
        surface: {
          DEFAULT: '#FFFFFF',
          2: '#F5F5F5',
        },
        gold: {
          DEFAULT: '#B8973A',
          light: '#D4AF55',
          dark: '#8A6F2A',
        },
        border: '#E0E0E0',
        text: {
          DEFAULT: '#0A0A0A',
          muted: '#666666',
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
        gold: '0 0 20px rgba(184,151,58,0.15)',
        'gold-lg': '0 0 40px rgba(184,151,58,0.25)',
      },
    },
  },
  plugins: [],
}
