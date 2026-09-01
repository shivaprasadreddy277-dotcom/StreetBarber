/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        barberDark: {
          950: '#060913', // Deepest background
          900: '#0B0F19', // Main panels
          800: '#151C2C', // Cards
          700: '#1F293D', // Hovered cards
          600: '#374151',
        },
        electric: {
          500: '#3b82f6',
          400: '#60a5fa',
          300: '#93c5fd',
        },
        neonPurple: {
          500: '#8b5cf6',
          400: '#a78bfa',
          300: '#c4b5fd',
        },
        coral: {
          500: '#f97316',
          400: '#fb923c',
          300: '#fdba74',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'neon-blue': '0 0 15px rgba(59, 130, 246, 0.4)',
        'neon-purple': '0 0 15px rgba(139, 92, 246, 0.4)',
        'neon-coral': '0 0 15px rgba(249, 115, 22, 0.4)',
      }
    },
  },
  plugins: [],
}
