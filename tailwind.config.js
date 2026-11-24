/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#050505',
        card: '#121214',
        'card-elevated': '#161619',
        border: '#1E1E22',
        'pill-blue': '#2563EB',
        'pill-blue-hover': '#1D4ED8',
        'pill-amber': '#D97706',
        'raag-gray': '#8E8E93',
        'raag-dark': '#0A0A0C',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-blue': '0 0 25px rgba(37, 99, 235, 0.25)',
        'glow-amber': '0 0 25px rgba(217, 119, 6, 0.25)',
        'bottom-bar': '0 -4px 20px rgba(0, 0, 0, 0.7)',
        'card': '0 4px 20px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
};
