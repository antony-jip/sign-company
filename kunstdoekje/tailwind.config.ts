import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Voorlopige merkkleuren — verfijnen na scrape van de huisstijl
        ink: '#141414',
        canvas: '#faf8f4',
        accent: '#b08d57', // warm goud, past bij kunst/velvet
      },
      fontFamily: {
        sans: ['system-ui', 'Inter', 'sans-serif'],
        serif: ['Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
export default config
