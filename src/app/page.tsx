import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Marquee from '@/components/landing/Marquee';
import AppPreview from '@/components/landing/AppPreview';
import FeaturesGrid from '@/components/landing/FeaturesGrid';
import StepsSection from '@/components/landing/StepsSection';
import SocialProof from '@/components/landing/SocialProof';
import SwitchSection from '@/components/landing/SwitchSection';
import PricingTeaser from '@/components/landing/PricingTeaser';
import CTASection from '@/components/landing/CTASection';
import Footer from '@/components/landing/Footer';

export default function Home() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <Hero />
        <Marquee />
        <AppPreview />
        <StepsSection />
        <FeaturesGrid />
        <SocialProof />
        <PricingTeaser />
        <SwitchSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
