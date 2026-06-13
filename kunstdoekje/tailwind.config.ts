import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Kunstdoekje-huisstijl — kleuren via CSS-variabelen (zie globals.css)
      // zodat ze in dark mode kunnen wisselen. Alpha blijft werken (text-ink/50).
      colors: {
        ink: 'rgb(var(--c-ink) / <alpha-value>)', // hoofdtekst
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)', // hoofdachtergrond
        card: 'rgb(var(--c-card) / <alpha-value>)', // card-achtergrond
        paper: 'rgb(var(--c-paper) / <alpha-value>)', // oppervlak
        muted: 'rgb(var(--c-muted) / <alpha-value>)', // subtiele tekst
        accent: {
          DEFAULT: 'rgb(var(--c-accent) / <alpha-value>)',
          hover: 'rgb(var(--c-accent-hover) / <alpha-value>)',
          dark: 'rgb(var(--c-accent-dark) / <alpha-value>)',
        },
      },
      backgroundImage: {
        'kd-gradient': 'linear-gradient(135deg, #B8941E, #CEA935)',
        'kd-gradient-hover': 'linear-gradient(135deg, #A0821A, #B8941E)',
      },
      fontFamily: {
        sans: ['var(--font-hanken)', 'system-ui', 'sans-serif'], // body = Familjen Grotesk
        // Display-token voor koppen — Marcellus (klassieke serif-kapitalen)
        serif: ['var(--font-archivo)', 'Georgia', 'serif'],
        // Accent: Cormorant-cursief voor één sierlijk woord per kop
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
