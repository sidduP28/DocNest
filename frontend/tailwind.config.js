/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'dn-mint-lightest': '#C8EEE8',
        'dn-mint-light':    '#A8E4DC',
        'dn-teal-soft':     '#80D5CE',
        'dn-teal':          '#5EC4C4',
        'dn-teal-mid':      '#4EB0C8',
        'dn-blue-mid':      '#6898CC',
        'dn-blue-slate':    '#7882CC',
        'dn-indigo':        '#7070CC',
        'dn-indigo-deep':   '#6060C0',
        'dn-purple-mid':    '#5050B4',
        'dn-purple':        '#4040A8',
        'dn-navy':          '#302090',
        'dn-navy-dark':     '#201470',
        'dn-navy-darkest':  '#100A50',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 2s linear infinite',
        'bounce-gentle': 'bounce 2s infinite',
        'fadeIn': 'fadeIn 0.3s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #100A50 0%, #302090 50%, #4EB0C8 100%)',
        'gradient-card':  'linear-gradient(135deg, #C8EEE8 0%, #A8E4DC 100%)',
      },
    },
  },
  plugins: [],
};
