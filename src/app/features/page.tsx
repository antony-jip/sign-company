import { moduleAantalWoord } from '@/data/modules'
import type { Metadata } from 'next'
import { paginaMeta } from '@/lib/metadata'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import FeaturesContent from '@/components/pages/FeaturesContent'

export const metadata: Metadata = paginaMeta({
  title: `Software voor signbedrijven: ${moduleAantalWoord} modules | doen.`,
  description: `${moduleAantalWoord.charAt(0).toUpperCase() + moduleAantalWoord.slice(1)} modules voor je signbedrijf: projecten, offertes, facturen, planning, klantportaal, werkbonnen, studio, email, taken, geheugen en Daan AI.`,
  pad: '/features',
})

export default function FeaturesPage() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <FeaturesContent />
      </main>
      <Footer />
    </>
  )
}
