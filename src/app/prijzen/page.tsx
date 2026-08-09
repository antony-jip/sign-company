import type { Metadata } from 'next'
import { paginaMeta } from '@/lib/metadata'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import PrijzenContent from '@/components/pages/PrijzenContent'
import JsonLd from '@/components/JsonLd'
import { softwareApplicationSchema } from '@/lib/structured-data'

export const metadata: Metadata = paginaMeta({
  title: 'Prijzen · één plan voor je signbedrijf | doen.',
  description: 'Een plan, drie maten. €129 per maand ex. btw voor je hele signbedrijf tot 10 gebruikers, €199 tot 20 en €279 tot 35.',
  pad: '/prijzen',
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
