/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        lg: '2rem',
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '960px',
        xl: '1040px',
      },
    },
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9eaff',
          200: '#bcdaff',
          300: '#8ec2ff',
          400: '#589fff',
          500: '#3179fb',
          600: '#1d5bef',
          700: '#1848dc',
          800: '#1a3cb2',
          900: '#1b378c',
        },
      },
      boxShadow: {
        card: '0 12px 40px -12px rgba(15, 23, 42, 0.35)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.24s ease-out both',
      },
    },
  },
  plugins: [],
};
