import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import HoeHetWerktContent from '@/components/pages/HoeHetWerktContent'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Van aanvraag tot factuur in 7 stappen | doen.',
  description: 'Je werkdag draait om zeven tabbladen en vier logins. Zie hoe doen. dat terugbrengt naar één. Van klantaanvraag tot betaalde factuur.',
  path: '/hoe-het-werkt',
})

export default function HoeHetWerktPage() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <HoeHetWerktContent />
      </main>
      <Footer />
    </>
  )
}
