import { Space_Grotesk } from 'next/font/google'

/* Design-tokens van de échte app (doen.).
   Eén bron voor alles wat de app nabouwt op de site: de klikbare showcase
   op de homepage en de stap-panelen op /hoe-het-werkt. Wijkt de app af,
   dan pas je het hier aan en niet op twee plekken.

   Herkomst: forgedesk/tailwind.config.js + forgedesk/src/index.css
   (--background #F8F7F5, --primary #F15025, petrol #1A535C). */

// De app zet alle cijfers en codes in Space Grotesk (tabular-nums); binnen
// een mockup overschrijft dit de site-brede Spline Sans Mono.
export const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const PETROL = '#1A535C'
export const PETROL_DEEP = '#0F3A42'
export const FLAME = '#F15025'
export const INK = '#1A1A1A'
export const MUTED = '#6B6B66'
export const LINE = 'rgba(26,83,92,0.08)'
export const BG = '#F8F7F5'
export const CARD = '#FFFFFF'

// Apple-feel "material": zachte diepte met hairline-rand i.p.v. harde border.
export const HAIRLINE = 'rgba(26,83,92,0.10)'
export const PANEL_SHADOW = '0 1px 2px rgba(20,40,40,0.04), 0 8px 24px -16px rgba(19,62,69,0.20)'

// Dashboard-hero: dimensionale petrol-gradient (lift linksboven, diepte rechtsonder).
export const HERO_GRADIENT =
  'radial-gradient(ellipse 90% 110% at 0% 0%, #237580 0%, transparent 60%), linear-gradient(135deg, #1A535C 0%, #103740 100%)'

/* Statuskleuren zoals de app ze gebruikt. De app schrijft een status altijd
   als woord met een flame-punt erachter ("Gepland."), niet als gekleurde pil. */
export const STATUS = {
  gepland: '#8A7A4A',
  actief: '#3A5A9A',
  verstuurd: '#3A5A9A',
  afgerond: '#3A7D52',
  betaald: '#3A7D52',
  geaccepteerd: '#3A7D52',
} as const

// Serif-italic voor bijzinnen, zoals in de app-koppen ("· wachten op factuur").
export const SERIF_ITALIC = '"Instrument Serif", Georgia, serif'
