import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import VeelgesteldeVragenContent from '@/components/pages/VeelgesteldeVragenContent'
import JsonLd from '@/components/JsonLd'
import { faqPageSchema } from '@/lib/structured-data'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Veelgestelde vragen over doen. | doen.',
  description:
    'Antwoord op wat signmakers vragen voordat ze beginnen: prijs, proefperiode, security, support en techniek van doen.',
  path: '/veelgestelde-vragen',
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
