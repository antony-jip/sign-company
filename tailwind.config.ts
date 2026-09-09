import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['var(--font-heading)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-hanken)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-spline-mono)', 'ui-monospace', 'monospace'],
        serif: ['Georgia', 'serif'],
      },
      colors: {
        flame: '#D24620',
        petrol: {
          DEFAULT: '#1A535C',
          light: '#2A6F7A',
          dark: '#143F46',
          deep: '#0D343C',
        },
        bg: '#F4F7F7',
        ink: '#16262B',
        muted: '#54666A',
      },
      letterSpacing: {
        tighter: '-0.04em',
        tightest: '-0.06em',
        /* Apple-laag: bij 17px en groter loopt de tekst iets dichter op
           elkaar. Dat is wat een kop "strak" laat lezen zonder dat je hem
           kleiner maakt. Niet gebruiken onder de 14px. */
        apple: '-0.011em',
      },
      borderRadius: {
        /* Eén radius-grammatica, geen tussenmaten. util voor compacte
           knoppen en inline beeld, card voor kaarten, full voor alles wat
           als actie moet lezen. */
        util: '8px',
        card: '18px',
      },
      boxShadow: {
        /* De enige schaduw op de site. Hij hoort onder productbeeld dat op
           een vlak rust (app-mockup, telefoon, browserframe), nooit onder
           een kaart, knop of tekst. Vlakwissel doet de hiërarchie. */
        product: '3px 5px 30px rgba(0,0,0,0.22)',
      },
      spacing: {
        /* Vaste binnenmaat van een tegel. Tegels raken elkaar, de
           kleurwissel is de scheiding. */
        tile: '80px',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      animation: {
        'marquee': 'marquee 40s linear infinite',
        'marquee-reverse': 'marquee-reverse 40s linear infinite',
        'count-up': 'countPulse 0.3s ease-out',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'marquee-reverse': {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0%)' },
        },
        countPulse: {
          '0%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
