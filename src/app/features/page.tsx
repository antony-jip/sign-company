import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import FeaturesContent from '@/components/pages/FeaturesContent'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Software voor signbedrijven: tien modules | doen.',
  description: 'Tien modules voor je signbedrijf: projecten, offertes, facturen, planning, klantportaal, werkbonnen, studio, email, taken en Daan AI.',
  path: '/features',
})

export default function FeaturesPage() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <FeaturesContent />
      </main>
      <Footer />
    </>
  )
}
