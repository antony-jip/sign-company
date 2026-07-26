import type { Metadata } from 'next'
import { paginaMeta } from '@/lib/metadata'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import OverContent from '@/components/pages/OverContent'

export const metadata: Metadata = paginaMeta({
  title: 'Over ons, gebouwd vanuit een signbedrijf | doen.',
  description: 'Waarom doen. bestaat. Gebouwd vanuit een signbedrijf dat al sinds 1983 bestaat. Vakmanschap verdient beter gereedschap.',
  pad: '/over',
})

export default function OverPage() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <OverContent />
      </main>
      <Footer />
    </>
  )
}
