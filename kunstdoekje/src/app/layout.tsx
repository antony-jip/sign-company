import type { Metadata } from 'next'
import { Archivo, Hanken_Grotesk, Instrument_Serif } from 'next/font/google'
import './globals.css'
import { CartProvider } from '@/lib/cart'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

// Variabele fonts: Archivo (koppen — expanded black, fashion-editorial) + Hanken Grotesk (body)
const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-archivo',
})

const hankenGrotesk = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-hanken',
})

// Accent: één woord per kop in serif-cursief — het chique contrapunt op Archivo
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument',
})

export const metadata: Metadata = {
  title: 'Kunstdoekje — Wisselbare kunstdoeken op luxe stof',
  description:
    'Wisselbare kunstdoeken op velvet of deco stof. Eén frame, eindeloos wisselen. Kies uit honderden kunstwerken of upload je eigen foto.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? 'https://kunstdoekje.nl'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${archivo.variable} ${hankenGrotesk.variable} ${instrumentSerif.variable}`}>
      <body className="flex min-h-screen flex-col font-sans">
        <CartProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  )
}
