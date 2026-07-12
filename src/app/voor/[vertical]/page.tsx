import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CTASection from '@/components/home/CTASection'
import VerticalContent from '@/components/pages/VerticalContent'
import { verticals, getVerticalBySlug } from '@/data/verticals'

export async function generateStaticParams() {
  return verticals.map((v) => ({ vertical: v.slug }))
}

export async function generateMetadata({ params }: { params: { vertical: string } }): Promise<Metadata> {
  const vertical = getVerticalBySlug(params.vertical)
  if (!vertical) return { title: 'Niet gevonden | doen.' }

  return {
    title: vertical.seoTitle,
    description: vertical.seoDescription,
    alternates: { canonical: `/voor/${vertical.slug}` },
  }
}

export default function VerticalPage({ params }: { params: { vertical: string } }) {
  const vertical = getVerticalBySlug(params.vertical)
  if (!vertical) notFound()

  return (
    <>
      <Navbar />
      <main id="main-content">
        <VerticalContent vertical={vertical} />
        <CTASection />
      </main>
      <Footer />
    </>
  )
}
