import type { Metadata } from 'next'
import { paginaMeta } from '@/lib/metadata'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import VeelgesteldeVragenContent from '@/components/pages/VeelgesteldeVragenContent'
import JsonLd from '@/components/JsonLd'
import { faqPageSchema } from '@/lib/structured-data'

export const metadata: Metadata = paginaMeta({
  title: 'Veelgestelde vragen over doen. | doen.',
  description: 'Antwoord op wat signmakers vragen voordat ze beginnen: prijs, proefperiode, security, support en techniek van doen.',
  pad: '/veelgestelde-vragen',
})

export default function VeelgesteldeVragenPage() {
  return (
    <>
      <JsonLd data={faqPageSchema} />
      <Navbar />
      <main id="main-content">
        <VeelgesteldeVragenContent />
      </main>
      <Footer />
    </>
  )
}
