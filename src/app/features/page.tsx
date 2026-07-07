import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import ScrollProgress from '@/components/ScrollProgress'
import Footer from '@/components/Footer'
import FeaturesContent from '@/components/pages/FeaturesContent'

export const metadata: Metadata = {
  title: 'Functies | doen.',
  description: 'Tien modules voor je signbedrijf: projecten, offertes, facturen, planning, klantportaal, werkbonnen, visualizer, email, taken en Daan AI.',
  alternates: { canonical: '/features' },
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
