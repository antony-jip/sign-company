import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ContactContent from '@/components/pages/ContactContent'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Contact | doen.',
  description: 'Vragen over doen. voor je signbedrijf? Neem contact op. We reageren binnen een werkdag.',
  path: '/contact',
})

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
