import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import VoorwaardenContent from '@/components/pages/VoorwaardenContent'

export const metadata: Metadata = {
  title: 'Algemene voorwaarden | doen.',
  description:
    'De algemene voorwaarden van doen., inclusief de verwerkersovereenkomst en de lijst met sub-verwerkers.',
  alternates: { canonical: '/voorwaarden' },
}

export default function VoorwaardenPage() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <VoorwaardenContent />
      </main>
      <Footer />
    </>
  )
}
