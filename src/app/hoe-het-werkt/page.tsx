import type { Metadata } from 'next'
import { paginaMeta } from '@/lib/metadata'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import HoeHetWerktContent from '@/components/pages/HoeHetWerktContent'

export const metadata: Metadata = paginaMeta({
  title: 'Van aanvraag tot factuur in 7 stappen | doen.',
  description: 'Aanvraag, offerte, portaal, planning, montage, factuur, gedaan. Zeven stappen door doen., met het scherm uit de app bij elke stap.',
  pad: '/hoe-het-werkt',
})

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
