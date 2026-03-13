import type { Metadata } from 'next';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { FontSelector } from '@/components/FontSelector';

export const metadata: Metadata = {
  title: 'Instellingen',
  description: 'Pas de weergave-instellingen van de website aan.',
  robots: { index: false, follow: false },
};

export default function InstellingenPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen bg-bg" style={{ paddingTop: 120 }}>
        <div className="container">
          <h1 className="font-heading step-title text-ink mb-8">Instellingen</h1>
          <div className="bg-white rounded-[20px] border border-ink-10 p-6 md:p-8">
            <FontSelector />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
