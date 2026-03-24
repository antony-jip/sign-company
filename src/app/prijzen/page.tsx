import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import ScrollProgress from '@/components/ScrollProgress'
import Footer from '@/components/Footer'
import PrijzenContent from '@/components/pages/PrijzenContent'

export const metadata: Metadata = {
  title: 'Prijzen | doen.',
  description: 'Een plan, een prijs. €49 per maand. Alles erin, geen verborgen kosten.',
}

export default function PrijzenPage() {
  return (
    <>
      <ScrollProgress />
      <Navbar />
      <main id="main-content">
        <PrijzenContent />
      </main>
      <Footer />
    </>
  )
}
