import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import ScrollProgress from '@/components/ScrollProgress'
import Footer from '@/components/Footer'
import FeaturesContent from '@/components/pages/FeaturesContent'

export const metadata: Metadata = {
  title: 'Features | doen.',
  description: 'Zes krachtige modules. Projecten, offertes, facturen, planning, klantportaal en Daan AI.',
}

export default function FeaturesPage() {
  return (
    <>
      <ScrollProgress />
      <Navbar />
      <main id="main-content">
        <FeaturesContent />
      </main>
      <Footer />
    </>
  )
}
