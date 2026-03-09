'use client';

import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { SocialProof } from '@/components/SocialProof';
import { Features } from '@/components/Services';
import { AIToolsShowcase } from '@/components/AIToolsShowcase';
import { InteractiveModules } from '@/components/InteractiveModules';
import { HowItWorks } from '@/components/USPs';
import { Pricing } from '@/components/Portfolio';
import { Testimonials } from '@/components/FAQ';
import { AppLoginExperience } from '@/components/AppLoginExperience';
import { CTASection } from '@/components/CTA';
import { Footer } from '@/components/Footer';

export default function HomePage() {
  return (
    <>
      <Header />
      <main id="main-content">
        <Hero />
        <SocialProof />
        <Features />
        <AIToolsShowcase />
        <InteractiveModules />
        <HowItWorks />
        <Pricing />
        <Testimonials />
        <AppLoginExperience />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
