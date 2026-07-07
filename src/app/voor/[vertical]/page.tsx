import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import ScrollProgress from '@/components/ScrollProgress'
import Footer from '@/components/Footer'
import SectionCTA from '@/components/home/SectionCTA'
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
      <ScrollProgress />
      <Navbar />
      <main id="main-content">
        <VerticalContent vertical={vertical} />
        <SectionCTA title={vertical.ctaTitle} sub={vertical.ctaSub} />
      </main>
      <Footer />
    </>
  )
}
