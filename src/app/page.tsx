import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Hero from '@/components/home/Hero'
import HomepageReframe from '@/components/home/HomepageReframe'
import AppShowcase from '@/components/home/AppShowcase'
import SectionCTA from '@/components/home/SectionCTA'
import ValueProps from '@/components/home/ValueProps'
import ModulesCarousel from '@/components/home/ModulesCarousel'
import MarqueeStrip from '@/components/home/MarqueeStrip'
import PricingSection from '@/components/home/PricingSection'
import FaqSection from '@/components/home/FaqSection'
import CTASection from '@/components/home/CTASection'
import Footer from '@/components/Footer'
import SignTypesStrip from '@/components/SignTypesStrip'
import JsonLd from '@/components/JsonLd'
import { organizationSchema, softwareApplicationSchema } from '@/lib/structured-data'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

export default function Home() {
  return (
    <>
      <JsonLd data={organizationSchema} />
      <JsonLd data={softwareApplicationSchema} />
      <Navbar />
      <main id="main-content">
        <Hero />
        <HomepageReframe />
        <AppShowcase />
        <SectionCTA title="Zie het in je eigen cockpit" sub="Maak gratis een account en klik direct door doen." />
        <ModulesCarousel />
        <SignTypesStrip />
        <MarqueeStrip />
        <SectionCTA title="Je hele signbedrijf, op één plek" sub="Eén systeem voor alles. 30 dagen gratis." />
        <ValueProps />
        <PricingSection />
        <FaqSection />
        <CTASection />
      </main>
      <Footer />
    </>
  )
}
