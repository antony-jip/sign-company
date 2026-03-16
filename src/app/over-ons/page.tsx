import type { Metadata } from 'next';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import OverOnsContent from '@/components/landing/OverOnsContent';

export const metadata: Metadata = {
  title: 'Onze oplossing | FORGEdesk',
  description:
    'Eén systeem voor je hele bedrijf. Van offerte tot factuur, van werkbon tot planning. Gebouwd door signmakers, voor creatieve maakbedrijven.',
};

export default function OverOnsPage() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <OverOnsContent />
      </main>
      <Footer />
    </>
  );
}
