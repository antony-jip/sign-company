import type { Metadata } from 'next';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import OverOnsContent from '@/components/landing/OverOnsContent';

export const metadata: Metadata = {
  title: 'Over ons | FORGEdesk',
  description:
    'FORGEdesk is bedrijfssoftware voor signmakers, interieurbouwers en monteurs. Gebouwd in Nederland, met kennis van de branche.',
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
