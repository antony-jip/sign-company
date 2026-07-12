import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ContactContent from '@/components/pages/ContactContent'

export const metadata: Metadata = {
  title: 'Contact | doen.',
  description: 'Vragen over doen. voor je signbedrijf? Neem contact op. We reageren binnen een werkdag.',
  alternates: { canonical: '/contact' },
}

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <ContactContent />
      </main>
      <Footer />
    </>
  )
}
