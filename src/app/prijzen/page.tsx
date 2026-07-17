import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import PrijzenContent from '@/components/pages/PrijzenContent'
import JsonLd from '@/components/JsonLd'
import { softwareApplicationSchema } from '@/lib/structured-data'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Prijzen · één plan voor je signbedrijf | doen.',
  description: 'Een plan, een prijs. €79 per maand ex. btw voor je hele signbedrijf, tot 10 gebruikers. Meer gebruikers? Neem contact op.',
  path: '/prijzen',
})

export default function PrijzenPage() {
  return (
    <>
      <JsonLd data={softwareApplicationSchema} />
      <Navbar />
      <main id="main-content">
        <PrijzenContent />
      </main>
      <Footer />
    </>
  )
}
