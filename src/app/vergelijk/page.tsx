import type { Metadata } from 'next'
import { paginaMeta } from '@/lib/metadata'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import VergelijkContent from '@/components/pages/VergelijkContent'

export const metadata: Metadata = paginaMeta({
  title: 'doen. naast Gripp en James Pro',
  description: 'Wat doen. heeft en Gripp en James Pro niet, en wat zij beter doen: offerte, buitendienst, geld, communicatie en AI naast elkaar, nagekeken in september 2026.',
  pad: '/vergelijk',
})

export default function VergelijkPage() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <VergelijkContent />
      </main>
      <Footer />
    </>
  )
}
