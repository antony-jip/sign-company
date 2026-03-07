'use client';

import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { Features } from '@/components/Services';
import { HowItWorks } from '@/components/USPs';
import { Pricing } from '@/components/Portfolio';
import { Testimonials } from '@/components/FAQ';
import { CTASection } from '@/components/CTA';
import { Footer } from '@/components/Footer';

export default function HomePage() {
  return (
    <>
      <Header />
      <main id="main-content">
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing />
        <Testimonials />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
