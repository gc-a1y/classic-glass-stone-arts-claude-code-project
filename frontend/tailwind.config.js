/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#FAFAF8',
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
        card: '0 1px 3px rgba(26,23,20,0.06), 0 1px 2px rgba(26,23,20,0.04)',
        'card-hover': '0 6px 20px rgba(26,23,20,0.09), 0 2px 6px rgba(26,23,20,0.05)',
        modal: '0 24px 64px rgba(26,23,20,0.18), 0 8px 24px rgba(26,23,20,0.08)',
      },
      animation: {
        'fade-in': 'fadeIn 0.18s ease-out',
        'slide-up': 'slideUp 0.24s cubic-bezier(0.16,1,0.3,1)',
        'slide-in-left': 'slideInLeft 0.24s cubic-bezier(0.16,1,0.3,1)',
        'scale-in': 'scaleIn 0.18s cubic-bezier(0.16,1,0.3,1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
