import type { Metadata } from 'next'
import { Bricolage_Grotesque, IBM_Plex_Sans, DM_Mono } from 'next/font/google'
import './globals.css'

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['800'],
  variable: '--font-bricolage',
  display: 'swap',
})

const ibmPlex = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://doen.team'),
  title: 'doen. | Software voor signmakers & creatieve bedrijven',
  description: 'Van offerte tot factuur. Zo gedaan. Alles-in-een bedrijfssoftware voor €49/maand. Geen kosten per gebruiker.',
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
    description: 'Van offerte tot factuur. Zo gedaan. €49/maand voor je hele team.',
    url: 'https://doen.team',
    siteName: 'doen.',
    locale: 'nl_NL',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'doen. | Slim gedaan.',
    description: 'Van offerte tot factuur. Zo gedaan. €49/maand voor je hele team.',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl" className={`${bricolage.variable} ${ibmPlex.variable} ${dmMono.variable}`}>
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
