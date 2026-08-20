import type { Metadata } from 'next'
import { Instrument_Sans, Hanken_Grotesk, Spline_Sans_Mono } from 'next/font/google'
import './globals.css'
/* Cookieloze bezoekstatistiek. Draait op je eigen domein via
   /_vercel/insights, dus geen cookies, geen banner, geen extern script en
   geen aanpassing aan de CSP (connect-src 'self' volstaat). Zet het aan
   onder Analytics in het Vercel-dashboard, anders verzamelt het niets. */
import { Analytics } from '@vercel/analytics/next'

/* Koppen draaien op Instrument Sans, hetzelfde kopfont als de app
   (forgedesk/tailwind.config.js). Zo leest de site als hetzelfde product.
   Instrument Sans gaat tot gewicht 700; waar de site 800 vroeg valt hij
   terug op 700. */
const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-heading',
  display: 'swap',
})

const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-hanken',
  display: 'swap',
})

const splineMono = Spline_Sans_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-spline-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://doen.team'),
  title: 'doen. | Software voor signmakers en reclamebedrijven',
  description: 'Van offerte tot factuur. Zo gedaan. Alles-in-één bedrijfssoftware voor signmakers en reclamebedrijven, vanaf €129/maand ex. btw tot 10 gebruikers, €199 tot 20 en €279 tot 35.',
  keywords: [
    'signmaker software',
    'reclame bedrijf software',
    'offerte software',
    'factuur software',
    'werkbon app',
    'project management signing',
    'bedrijfssoftware',
  ],
  openGraph: {
    title: 'doen. | Slim gedaan.',
    description: 'Van offerte tot factuur. Zo gedaan. Vanaf €129/maand ex. btw tot 10 gebruikers, €199 tot 20 en €279 tot 35.',
    url: 'https://doen.team',
    siteName: 'doen.',
    locale: 'nl_NL',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'doen. | Slim gedaan.',
    description: 'Van offerte tot factuur. Zo gedaan. Vanaf €129/maand ex. btw tot 10 gebruikers, €199 tot 20 en €279 tot 35.',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl" className={`${instrumentSans.variable} ${hanken.variable} ${splineMono.variable}`}>
      <body className="font-sans bg-bg text-ink antialiased">
        {/* Zet `anim-ready` alleen als de eerste frame ook echt gerenderd
            wordt. Blijft de klasse weg, dan verbergt globals.css niets en
            staat de pagina er compleet, zonder entree. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){var t=Date.now();requestAnimationFrame(function(){if(Date.now()-t<300&&document.visibilityState==='visible'){document.documentElement.classList.add('anim-ready')}})})()",
          }}
        />
        <a href="#main-content" className="skip-link">
          Ga naar inhoud
        </a>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
