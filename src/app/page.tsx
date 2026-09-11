import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Hero from '@/components/home/Hero'
import FilmSectie from '@/components/home/FilmSectie'
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
        {/* Zeven blokken: belofte, bewijs, Daan, de app, prijs, bezwaren,
            knop. Elk blok heeft één taak en die staat maar op één plek.

            DitZitErin is er in september af gegaan. Dat blok gaf een
            inventaris van negen modules in vier kaarten, precies nadat de
            hero belooft dat wij de rest regelen. Een merk dat zegt dat het
            geregeld is moet geen boodschappenlijst overhandigen om dat te
            bewijzen, en DESIGN.md schrijft al voor dat modules uitleggen op
            /features hoort. De telefoon uit dat blok staat nu bij Demo, waar
            de rest van de app ook staat.

            Eerder eraf: Manifest, Werkwoorden en Modules. Werkwoorden was met
            1969px de langste sectie en vertelde de vier stappen dubbel;
            Modules overlapte volledig; Manifest is merkverhaal zonder knop en
            hoort op /over. Alle componenten staan er nog, alleen niet meer in
            deze pagina. */}
        <Hero />
        <EigenGebruikBewijs />
        <FilmSectie />
        <PricingSection />
        <FaqSection />
        <CTASection />
      </main>
      <Footer />
    </>
  )
}
