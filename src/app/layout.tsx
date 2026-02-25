import type { Metadata } from 'next';
import './globals.css';
import { FontLoader } from '@/components/FontLoader';

export const metadata: Metadata = {
  metadataBase: new URL('https://signcompany.nl'),
  title: {
    default: 'Sign Company | Signing & Reclame sinds 1983',
    template: '%s | Sign Company',
  },
  description:
    'Sign Company is uw specialist voor gevelreclame, autobelettering en signing in Noord-Holland en Flevoland. 42 jaar ervaring, premium materialen en eigen montage.',
  keywords: [
    'gevelreclame',
    'autobelettering',
    'signing',
    'lichtreclame',
    'bootstickers',
    'carwrapping',
    'enkhuizen',
    'hoorn',
    'west-friesland',
  ],
  authors: [{ name: 'Sign Company' }],
  creator: 'Sign Company',
  publisher: 'Sign Company',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'nl_NL',
    url: 'https://signcompany.nl',
    siteName: 'Sign Company',
    title: 'Sign Company | Signing & Reclame sinds 1983',
    description:
      'Sign Company is uw specialist voor gevelreclame, autobelettering en signing in Noord-Holland en Flevoland.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sign Company | Signing & Reclame sinds 1983',
    description:
      'Sign Company is uw specialist voor gevelreclame, autobelettering en signing.',
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
  verification: {
    google: 'google-site-verification-code',
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
        <link rel="canonical" href="https://signcompany.nl" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Manrope:wght@200;300;400;500;600;700;800&family=Nunito+Sans:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700&family=Raleway:wght@300;400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&family=Work+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">
        <FontLoader />
        <a href="#main-content" className="skip-link">
          Ga naar inhoud
        </a>
        {children}
      </body>
    </html>
  );
}
