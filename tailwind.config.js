/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2A7C6F',
          light: '#E8F5F1',
          dark: '#1E5D53',
          50: '#E8F5F1',
          100: '#D1EBE3',
          200: '#A3D7C7',
          300: '#75C3AB',
          400: '#47AF8F',
          500: '#2A7C6F',
          600: '#226359',
          700: '#1A4A43',
          800: '#11312D',
          900: '#091917',
        },
        secondary: {
          DEFAULT: '#7C6DAF',
          light: '#F0ECF8',
          dark: '#5B4E8A',
          50: '#F0ECF8',
          100: '#E1D9F1',
          200: '#C3B3E3',
          300: '#A58DD5',
          400: '#8767C7',
          500: '#7C6DAF',
          600: '#63578C',
          700: '#4A4169',
          800: '#312C46',
          900: '#191623',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          dark: '#1E293B',
        },
        background: {
          DEFAULT: '#FAFBFC',
          dark: '#0F172A',
        },
        text: {
          primary: '#1E293B',
          secondary: '#64748B',
          dark: '#F1F5F9',
        },
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px rgba(0, 0, 0, 0.06)',
        'soft-lg': '0 8px 30px rgba(0, 0, 0, 0.08)',
        'soft-xl': '0 12px 40px rgba(0, 0, 0, 0.1)',
        'glow': '0 0 20px rgba(42, 124, 111, 0.15)',
        'glow-lg': '0 0 40px rgba(42, 124, 111, 0.2)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}
