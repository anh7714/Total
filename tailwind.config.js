/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        xl: '1280px',
      },
    },
    extend: {
      fontFamily: {
        pt: ['"PT Sans"', 'sans-serif'],
        noto: [
          'Noto Sans KR',
          'Apple SD Gothic Neo',
          'Malgun Gothic',
          'sans-serif',
        ],
      },
      colors: {
        background: 'hsl(0,0%,96.1%)',
        primary: 'hsl(231,48%,48%)',
        'primary-foreground': 'hsl(0,0%,98%)',
      },
    },
  },
  plugins: [],
}