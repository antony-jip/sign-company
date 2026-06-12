import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Kunstdoekje-huisstijl (zie ook de --kd-* variabelen in globals.css)
      colors: {
        ink: '#3A3127', // hoofdtekst, donkerbruin
        canvas: '#F7F6EC', // hoofdachtergrond, crème
        card: '#EEEDE0', // card-achtergrond
        paper: '#FBFAF8', // wit met warme tint
        muted: '#8B7A6B', // subtiele tekst, labels
        accent: {
          DEFAULT: '#CEA935', // goud, primaire accent
          hover: '#B8941E',
          dark: '#A0821A',
        },
      },
      backgroundImage: {
        'kd-gradient': 'linear-gradient(135deg, #B8941E, #CEA935)',
        'kd-gradient-hover': 'linear-gradient(135deg, #A0821A, #B8941E)',
      },
      fontFamily: {
        sans: ['var(--font-hanken)', 'system-ui', 'sans-serif'],
        // 'serif' is het display-token voor koppen; wijst naar Archivo (expanded display-sans)
        serif: ['var(--font-archivo)', 'system-ui', 'sans-serif'],
        // Accent: serif-cursief voor één woord per kop
        accent: ['var(--font-instrument)', 'Georgia', 'serif'],
      },
      boxShadow: {
        // Zachte offset-schaduwen — drukwerk-DNA, maar fluweelzacht
        hard: '8px 8px 0 0 rgba(58,49,39,0.08)',
        'hard-sm': '5px 5px 0 0 rgba(58,49,39,0.08)',
        'hard-gold': '12px 12px 0 0 rgba(206,169,53,0.3)',
      },
    },
  },
  plugins: [],
}
export default config
