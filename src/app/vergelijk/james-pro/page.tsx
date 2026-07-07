import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import ScrollProgress from '@/components/ScrollProgress'
import Footer from '@/components/Footer'
import SectionCTA from '@/components/home/SectionCTA'
import VergelijkJamesProContent from '@/components/pages/VergelijkJamesProContent'

export const metadata: Metadata = {
  title: 'James PRO-alternatief? Vergelijk James PRO met doen.',
  description:
    'James PRO of doen.? Vergelijk de software voor de signbranche op prijs, opzetkosten en wat er inbegrepen zit. €79 flat per maand vs. €113 per gebruiker.',
  alternates: { canonical: '/vergelijk/james-pro' },
}

export default function VergelijkJamesProPage() {
  return (
    <>
      <ScrollProgress />
      <Navbar />
      <main id="main-content">
        <VergelijkJamesProContent />
        <SectionCTA
          title="Probeer het verschil zelf"
          sub="30 dagen gratis, geen creditcard, geen opzetkosten."
        />
      </main>
      <Footer />
    </>
  )
}
