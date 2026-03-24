import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import ScrollProgress from '@/components/ScrollProgress'
import Footer from '@/components/Footer'
import ContactContent from '@/components/pages/ContactContent'

export const metadata: Metadata = {
  title: 'Contact | doen.',
  description: 'Neem contact op. We reageren binnen een werkdag.',
}

export default function ContactPage() {
  return (
    <>
      <ScrollProgress />
      <Navbar />
      <main id="main-content">
        <ContactContent />
      </main>
      <Footer />
    </>
  )
}
