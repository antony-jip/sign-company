import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main-content" className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center px-4">
          <h1 className="text-6xl font-bold text-primary-600 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Pagina niet gevonden
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            De pagina die u zoekt bestaat niet of is verplaatst.
            Gebruik de navigatie of ga terug naar de homepage.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Naar homepage
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Contact opnemen
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
