import type { Metadata } from 'next'
import { Bricolage_Grotesque, Hanken_Grotesk, Spline_Sans_Mono } from 'next/font/google'
import './globals.css'

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-bricolage',
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
  description: 'Van offerte tot factuur. Zo gedaan. Alles-in-één bedrijfssoftware voor signmakers en reclamebedrijven, €129/maand ex. btw. Tot 10 gebruikers inbegrepen.',
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
    description: 'Van offerte tot factuur. Zo gedaan. €129/maand ex. btw, tot 10 gebruikers.',
    url: 'https://doen.team',
    siteName: 'doen.',
    locale: 'nl_NL',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'doen. | Slim gedaan.',
    description: 'Van offerte tot factuur. Zo gedaan. €129/maand ex. btw, tot 10 gebruikers.',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl" className={`${bricolage.variable} ${hanken.variable} ${splineMono.variable}`}>
      <body className="font-sans bg-bg text-ink antialiased">
        <a href="#main-content" className="skip-link">
          Ga naar inhoud
        </a>
        {children}
      </body>
    </html>
  )
}
