import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Hero from '@/components/home/Hero'
import DitZitErin from '@/components/home/DitZitErin'
import Demo from '@/components/home/Demo'
import DaanSpotlight from '@/components/home/DaanSpotlight'
import { EigenGebruikBewijs } from '@/components/EigenGebruik'
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
        {/* Volgorde na de kit.com-analyse en de conversie-doorlichting van
            september. Eerst zien wat erin zit, dan het bewijs met de knop
            eronder, dan Daan, dan de app zelf, dan prijs en bezwaren.

            Eraf: Manifest, Werkwoorden en Modules. Werkwoorden vertelde de
            vier stappen die DitZitErin nu als kopjes gebruikt en was met
            1969px de langste sectie; Modules was na DitZitErin volledig
            dubbel; Manifest is merkverhaal zonder knop en hoort op /over. De
            componenten staan er nog, alleen niet meer in deze pagina. */}
        <Hero />
        <DitZitErin />
        <EigenGebruikBewijs />
        <DaanSpotlight />
        <Demo />
        <PricingSection />
        <FaqSection />
        <CTASection />
      </main>
      <Footer />
    </>
  )
}
