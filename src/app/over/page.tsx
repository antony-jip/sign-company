import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import ScrollProgress from '@/components/ScrollProgress'
import Footer from '@/components/Footer'
import OverContent from '@/components/pages/OverContent'

export const metadata: Metadata = {
  title: 'Over ons | doen.',
  description: 'Waarom doen. bestaat. Vakmanschap verdient beter gereedschap.',
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
