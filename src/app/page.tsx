import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import AppPreview from '@/components/landing/AppPreview';
import StepsSection from '@/components/landing/StepsSection';
import CTASection from '@/components/landing/CTASection';
import Footer from '@/components/landing/Footer';

export default function Home() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <Hero />
        <AppPreview />
        <StepsSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
