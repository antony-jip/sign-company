import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main-content" className="min-h-screen flex items-center justify-center bg-white pt-20">
        <div className="text-center px-6">
          <h1 className="text-7xl font-extrabold text-gray-900 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Pagina niet gevonden
          </h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            De pagina die je zoekt bestaat niet of is verplaatst.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center bg-gray-900 hover:bg-gray-800 text-white font-semibold px-6 py-3 rounded-full transition-colors"
          >
            Naar homepage
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
