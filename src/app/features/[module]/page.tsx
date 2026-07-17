import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import FeaturesContent from '@/components/pages/FeaturesContent'
import JsonLd from '@/components/JsonLd'
import { buildBreadcrumbSchema } from '@/lib/structured-data'
import { pageMetadata } from '@/lib/seo'
import { modules } from '@/data/modules'

const moduleIds = ['projecten', 'offertes', 'portaal', 'planning', 'werkbonnen', 'facturen', 'visualizer', 'ai', 'email', 'taken'] as const

// Alleen bekende module-slugs zijn geldig; alles anders is een echte 404
// (geen dynamische fallback), zodat er geen soft-404's geïndexeerd worden.
export const dynamicParams = false

export async function generateStaticParams() {
  return moduleIds.map((module) => ({ module }))
}

export async function generateMetadata({ params }: { params: { module: string } }): Promise<Metadata> {
  const mod = modules.find((m) => m.href === `/features/${params.module}`)
  if (!mod) return { title: 'Functies | doen.' }
  return pageMetadata({
    title: mod.seoTitle,
    description: mod.seoDescription,
    path: `/features/${params.module}`,
  })
}

export default function FeatureModulePage({ params }: { params: { module: string } }) {
  const mod = modules.find((m) => m.href === `/features/${params.module}`)
  if (!mod) notFound()

  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Functies', path: '/features' },
    { name: mod.label, path: `/features/${params.module}` },
  ])

  return (
    <>
      <JsonLd data={breadcrumb} />
      <Navbar />
      <main id="main-content">
        <FeaturesContent moduleSlug={params.module} />
      </main>
      <Footer />
    </>
  )
}
