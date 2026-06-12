import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kunstdoekje — Wisselbare kunstdoeken op luxe stof',
  description:
    'Wisselbare kunstdoeken op velvet of deco stof. Eén lijst, eindeloos wisselen. Kies uit honderden kunstwerken of upload je eigen foto.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? 'https://kunstdoekje.nl'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  )
}
