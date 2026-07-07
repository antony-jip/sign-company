import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import ScrollProgress from '@/components/ScrollProgress'
import Footer from '@/components/Footer'
import OverContent from '@/components/pages/OverContent'

export const metadata: Metadata = {
  title: 'Over ons — gebouwd vanuit een signbedrijf | doen.',
  description: 'Waarom doen. bestaat. Gebouwd vanuit een signbedrijf dat al sinds 1983 bestaat. Vakmanschap verdient beter gereedschap.',
  alternates: { canonical: '/over' },
}

export default function OverPage() {
  return (
    <>
      <ScrollProgress />
      <Navbar />
      <main id="main-content">
        <OverContent />
      </main>
      <Footer />
    </>
  )
}
