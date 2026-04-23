import type { Metadata } from 'next'
import { Bricolage_Grotesque, DM_Sans, DM_Mono } from 'next/font/google'
import './globals.css'

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-bricolage',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-dm-sans',
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
    <html lang="nl" className={`${bricolage.variable} ${dmSans.variable} ${dmMono.variable}`}>
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
