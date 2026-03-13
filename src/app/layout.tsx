import type { Metadata } from 'next';
import { DM_Sans, DM_Mono } from 'next/font/google';
import './globals.css';

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
  title: {
    default: 'FORGEdesk | Smeed je bedrijf tot een geoliede machine',
    template: '%s | FORGEdesk',
  },
  description:
    'FORGEdesk is dé alles-in-één bedrijfssoftware voor creatieve bedrijven. Offertes, projecten, facturatie, CRM en meer — voor €49 per maand.',
  keywords: [
    'bedrijfssoftware',
    'creatieve sector',
    'offertes',
    'facturatie',
    'projectbeheer',
    'CRM',
    'signing bedrijf',
    'reclamebureau',
    'werkbonnen',
  ],
  authors: [{ name: 'FORGEdesk' }],
  creator: 'FORGEdesk',
  publisher: 'FORGEdesk',
  openGraph: {
    type: 'website',
    locale: 'nl_NL',
    url: 'https://forgedesk.io',
    siteName: 'FORGEdesk',
    title: 'FORGEdesk | Smeed je bedrijf tot een geoliede machine',
    description:
      'Dé alles-in-één bedrijfssoftware voor creatieve bedrijven. Offertes, projecten, facturatie, CRM en meer.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'FORGEdesk — Smeed je bedrijf tot een geoliede machine',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FORGEdesk | Smeed je bedrijf tot een geoliede machine',
    description:
      'Dé alles-in-één bedrijfssoftware voor creatieve bedrijven.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl" className={`${dmSans.variable} ${dmMono.variable}`}>
      <head>
        <link rel="canonical" href="https://forgedesk.io" />
      </head>
      <body className="font-sans bg-canvas text-gray-900 antialiased">
        <a href="#main-content" className="skip-link">
          Ga naar inhoud
        </a>
        {children}
      </body>
    </html>
  );
}
