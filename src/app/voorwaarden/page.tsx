import type { Metadata } from 'next'
import { paginaMeta } from '@/lib/metadata'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import VoorwaardenContent from '@/components/pages/VoorwaardenContent'

export const metadata: Metadata = paginaMeta({
  title: 'Algemene voorwaarden | doen.',
  description: 'De algemene voorwaarden van doen., inclusief de verwerkersovereenkomst en de lijst met sub-verwerkers.',
  pad: '/voorwaarden',
})

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
