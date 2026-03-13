import type { Metadata } from 'next';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import PricingContent from '@/components/landing/PricingContent';

export const metadata: Metadata = {
  title: 'Pricing — FORGEdesk',
  description:
    'Eén simpel plan. €49/maand voor je hele team. Geen kosten per gebruiker, geen verborgen kosten.',
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
