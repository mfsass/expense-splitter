/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#007AFF',      // iOS blue
        success: '#34C759',      // green for 50/50
        warning: '#FF9500',      // orange for 70/30
        danger: '#FF3B30',       // red for personal
        background: {
          light: '#F2F2F7',     // background light
          DEFAULT: '#FFFFFF',   // background default
          dark: '#242424',      // background dark
        }
      },
      fontFamily: {
        sans: ['system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '6': '24px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.1)',
        'card-hover': '0 8px 25px rgba(0,0,0,0.15)',
        'soft': '0 2px 8px rgba(0,0,0,0.08)',
        'glow': '0 0 20px rgba(0, 122, 255, 0.3)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      }
    },
  },
  plugins: [],
};
