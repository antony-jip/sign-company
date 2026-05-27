import type { Metadata } from 'next'
import { Bricolage_Grotesque, Inter, IBM_Plex_Mono, Instrument_Serif } from 'next/font/google'
import './globals.css'

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-bricolage',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
})

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://doen.team'),
  title: 'doen. | Software voor creatieve maakbedrijven',
  description: 'Van offerte tot factuur. Zo gedaan. Alles-in-een bedrijfssoftware voor €79/maand ex. btw. Tot 10 gebruikers inbegrepen, meer op aanvraag.',
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
    description: 'Van offerte tot factuur. Zo gedaan. €79/maand ex. btw, tot 10 gebruikers.',
    url: 'https://doen.team',
    siteName: 'doen.',
    locale: 'nl_NL',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'doen. | Slim gedaan.',
    description: 'Van offerte tot factuur. Zo gedaan. €79/maand ex. btw, tot 10 gebruikers.',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl" className={`${bricolage.variable} ${inter.variable} ${plexMono.variable} ${instrumentSerif.variable}`}>
      <head>
        <link rel="canonical" href="https://doen.team" />
      </head>
      <body className="font-sans bg-bg text-ink antialiased">
        <a href="#main-content" className="skip-link">
          Ga naar inhoud
        </a>
        {children}
      </body>
    </html>
  )
}
