import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const poppins = Poppins({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
});

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
    <html lang="nl" className={`${inter.variable} ${poppins.variable}`}>
      <head>
        <link rel="canonical" href="https://signcompany.nl" />
      </head>
      <body className={inter.className}>
        <a href="#main-content" className="skip-link">
          Ga naar inhoud
        </a>
        {children}
      </body>
    </html>
  );
}
