import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CTASection from '@/components/home/CTASection'
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
      <Navbar />
      <main id="main-content">
        <VergelijkJamesProContent />
        <CTASection />
      </main>
      <Footer />
    </>
  )
}
