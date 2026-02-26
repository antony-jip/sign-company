import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { FontSelector } from '@/components/FontSelector';

export const metadata: Metadata = {
  title: 'Instellingen',
  description: 'Pas de weergave-instellingen van de website aan.',
  robots: { index: false, follow: false },
};

export default function InstellingenPage() {
  return (
    <>
      <Header />
      <main id="main-content" className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Instellingen</h1>
          <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
            <FontSelector />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
