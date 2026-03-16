import type { Metadata } from 'next';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import PricingContent from '@/components/landing/PricingContent';

export const metadata: Metadata = {
  title: 'Pricing | FORGEdesk',
  description:
    'Twee plannen: vanaf €49/maand. Geen verborgen kosten. 30 dagen gratis.',
};

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <PricingContent />
      </main>
      <Footer />
    </>
  );
}
