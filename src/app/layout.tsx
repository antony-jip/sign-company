import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://forgedesk.nl'),
  title: {
    default: 'FORGEdesk | Je hele bedrijf. Eén app.',
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
    url: 'https://forgedesk.nl',
    siteName: 'FORGEdesk',
    title: 'FORGEdesk | Je hele bedrijf. Eén app.',
    description:
      'Dé alles-in-één bedrijfssoftware voor creatieve bedrijven. Offertes, projecten, facturatie, CRM en meer.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FORGEdesk | Je hele bedrijf. Eén app.',
    description:
      'Dé alles-in-één bedrijfssoftware voor creatieve bedrijven.',
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
    <html lang="nl">
      <head>
        <link rel="canonical" href="https://forgedesk.nl" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">
        <a href="#main-content" className="skip-link">
          Ga naar inhoud
        </a>
        {children}
      </body>
    </html>
  );
}
