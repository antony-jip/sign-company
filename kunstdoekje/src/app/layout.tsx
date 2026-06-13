import type { Metadata } from 'next'
import { Fraunces, Instrument_Sans } from 'next/font/google'
import './globals.css'
import { CartProvider } from '@/lib/cart'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

// Display: Fraunces — verfijnde high-contrast serif met een prachtige cursief
// (voor het gouden accent-woord). Elegant en luxe i.p.v. technisch.
const fraunces = Fraunces({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['opsz', 'SOFT', 'WONK'],
  variable: '--font-archivo',
  display: 'swap',
})

// Body: Instrument Sans — strak, modern, rustig leesbaar.
const bodySans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-hanken',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Kunstdoekje · Art frame met wisselbare kunstdoeken',
    template: '%s · Kunstdoekje',
  },
  description:
    'Het art frame van Nederland: één aluminium wissellijst, ruim 1000 kunstdoeken op fluweel of decostof. Wissel je kunst in 30 seconden · of upload je eigen foto.',
  keywords: [
    'art frame',
    'wissellijst',
    'kunstdoek',
    'kunst aan de muur',
    'wisselbare kunst',
    'textielframe',
    'fluweel doek',
    'canvas alternatief',
  ],
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? 'https://kunstdoekje.nl'),
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'nl_NL',
    siteName: 'Kunstdoekje',
    title: 'Kunstdoekje · Art frame met wisselbare kunstdoeken',
    description:
      'Eén art frame, eindeloos wisselen. Ruim 1000 kunstdoeken op fluweel of decostof, geprint in Nederland.',
    images: [{ url: '/home/hero.jpg', width: 1080, height: 1440, alt: 'Kunstdoekje art frame in interieur' }],
  },
  robots: { index: true, follow: true },
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://kunstdoekje.nl'

// Structured data: organisatie + website (sitewide)
const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'OnlineStore',
  name: 'Kunstdoekje',
  url: BASE_URL,
  logo: `${BASE_URL}/home/logo.png`,
  description:
    'Art frames met wisselbare kunstdoeken op fluweel of decostof. Geprint in Nederland.',
  email: 'info@kunstdoekje.nl',
  telephone: '+31850608476',
  address: { '@type': 'PostalAddress', addressLocality: 'Enkhuizen', addressCountry: 'NL' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="nl"
      suppressHydrationWarning
      className={`${fraunces.variable} ${bodySans.variable}`}
    >
      <body className="flex min-h-screen flex-col font-sans">
        {/* Zet het thema vóór de eerste paint zodat er geen flits is */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('kd-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}",
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <CartProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  )
}
