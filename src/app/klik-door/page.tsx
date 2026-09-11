import type { Metadata } from 'next'
import { paginaMeta } from '@/lib/metadata'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Demo from '@/components/home/Demo'
import CTASection from '@/components/home/CTASection'
import JsonLd from '@/components/JsonLd'
import { softwareApplicationSchema } from '@/lib/structured-data'

export const metadata: Metadata = paginaMeta({
  title: 'Klik zelf door de app | doen.',
  description: 'Geen mockup, de echte app. Klik door projecten, offertes, planning, werkbonnen en facturen van doen., de app voor signmakers.',
  pad: '/klik-door',
})

/* De klikbare app stond op de homepage; daar staat nu de film. Wie zelf wil
   voelen hoe de app werkt komt hier. Demo bevat de kop, de app en de telefoon. */
export default function KlikDoorPage() {
  return (
    <>
      <JsonLd data={softwareApplicationSchema} />
      <Navbar />
      <main id="main-content" className="pt-20 md:pt-24">
        <Demo />
        <CTASection />
      </main>
      <Footer />
    </>
  )
}
