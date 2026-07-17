import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CTASection from '@/components/home/CTASection'
import VerticalContent from '@/components/pages/VerticalContent'
import JsonLd from '@/components/JsonLd'
import { buildBreadcrumbSchema } from '@/lib/structured-data'
import { pageMetadata } from '@/lib/seo'
import { verticals, getVerticalBySlug } from '@/data/verticals'

export async function generateStaticParams() {
  return verticals.map((v) => ({ vertical: v.slug }))
}

export async function generateMetadata({ params }: { params: { vertical: string } }): Promise<Metadata> {
  const vertical = getVerticalBySlug(params.vertical)
  if (!vertical) return { title: 'Niet gevonden | doen.' }

  return pageMetadata({
    title: vertical.seoTitle,
    description: vertical.seoDescription,
    path: `/voor/${vertical.slug}`,
  })
}

export default function VerticalPage({ params }: { params: { vertical: string } }) {
  const vertical = getVerticalBySlug(params.vertical)
  if (!vertical) notFound()

  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Voor wie', path: '/features' },
    { name: vertical.naam, path: `/voor/${vertical.slug}` },
  ])

  return (
    <>
      <JsonLd data={breadcrumb} />
      <Navbar />
      <main id="main-content">
        <VerticalContent vertical={vertical} />
        <CTASection />
      </main>
      <Footer />
    </>
  )
}
