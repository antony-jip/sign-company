import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Hero from '@/components/home/Hero'
import OpJeTelefoon from '@/components/home/OpJeTelefoon'
import Manifest from '@/components/home/Manifest'
import Demo from '@/components/home/Demo'
import Werkwoorden from '@/components/home/Werkwoorden'
import DaanSpotlight from '@/components/home/DaanSpotlight'
import { EigenGebruikBewijs } from '@/components/EigenGebruik'
import Modules from '@/components/home/Modules'
import PricingSection from '@/components/home/PricingSection'
import FaqSection from '@/components/home/FaqSection'
import CTASection from '@/components/home/CTASection'
import Footer from '@/components/Footer'
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
      <Navbar theme="dark" />
      <main id="main-content">
        {/* Volgorde na de kit.com-analyse: eerst bewijs, dan de belofte,
            dan pas het product. Stond andersom: uitleg vooraan, bewijs op
            plek vier. Zie docs/verbeterplan-home-kit.md
            OpJeTelefoon staat sinds september op twee, op verzoek. Het bewijs
            schoof daarmee een plek op; wil je dat terug, wissel deze twee. */}
        <Hero />
        <OpJeTelefoon />
        <EigenGebruikBewijs />
        <Manifest />
        <Werkwoorden />
        <DaanSpotlight />
        <Demo />
        <Modules />
        <PricingSection />
        <FaqSection />
        <CTASection />
      </main>
      <Footer />
    </>
  )
}
