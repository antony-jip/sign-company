import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { DM_Sans, DM_Mono } from 'next/font/google';
import './globals.css';

const madellin = localFont({
  src: [
    { path: './fonts/Madellin-Regular.woff', weight: '400', style: 'normal' },
    { path: './fonts/Madellin-Bold.woff', weight: '700', style: 'normal' },
  ],
  variable: '--font-madellin',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://forgedesk.io'),
  title: 'FORGEdesk — Bedrijfssoftware voor signmakers & monteurs',
  description:
    'Van offerte tot factuur in minuten. €49/maand voor je hele team. Geen kosten per gebruiker.',
  keywords: [
    'bedrijfssoftware',
    'signmakers',
    'monteurs',
    'offertes',
    'facturatie',
    'werkbonnen',
    'interieurbouwers',
  ],
  authors: [{ name: 'FORGEdesk' }],
  creator: 'FORGEdesk',
  publisher: 'FORGEdesk',
  openGraph: {
    type: 'website',
    locale: 'nl_NL',
    url: 'https://forgedesk.io',
    siteName: 'FORGEdesk',
    title: 'FORGEdesk — Smeed je bedrijf tot een geoliede machine',
    description:
      'Bedrijfssoftware voor signmakers, interieurbouwers en monteurs. 30 dagen gratis.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FORGEdesk — Smeed je bedrijf tot een geoliede machine',
    description:
      'Bedrijfssoftware voor signmakers, interieurbouwers en monteurs. 30 dagen gratis.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl" className={`${madellin.variable} ${dmSans.variable} ${dmMono.variable}`}>
      <head>
        <link rel="canonical" href="https://forgedesk.io" />
      </head>
      <body className="font-sans bg-bg text-ink antialiased">
        <a href="#main-content" className="skip-link">
          Ga naar inhoud
        </a>
        {children}
      </body>
    </html>
  );
}
