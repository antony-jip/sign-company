import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import ScrollProgress from '@/components/ScrollProgress'
import Footer from '@/components/Footer'
import HoeHetWerktContent from '@/components/pages/HoeHetWerktContent'

export const metadata: Metadata = {
  title: 'Hoe het werkt | doen.',
  description: 'Je werkdag draait om zeven tabbladen en vier logins. Zie hoe doen. dat terugbrengt naar één. Van klantaanvraag tot betaalde factuur.',
}

export default function HoeHetWerktPage() {
  return (
    <>
      <ScrollProgress />
      <Navbar />
      <main id="main-content">
        <HoeHetWerktContent />
      </main>
      <Footer />
    </>
  )
}
