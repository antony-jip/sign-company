import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import HoeHetWerktContent from '@/components/pages/HoeHetWerktContent'

export const metadata: Metadata = {
  title: 'Van aanvraag tot factuur in 7 stappen | doen.',
  description: 'Aanvraag, offerte, portaal, planning, montage, factuur, gedaan. Zeven stappen door doen., met het scherm uit de app bij elke stap.',
  alternates: { canonical: '/hoe-het-werkt' },
}

export default function HoeHetWerktPage() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <HoeHetWerktContent />
      </main>
      <Footer />
    </>
  )
}
