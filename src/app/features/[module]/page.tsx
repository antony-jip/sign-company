import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import FeaturesContent from '@/components/pages/FeaturesContent'
import { modules } from '@/data/modules'

const moduleIds = ['projecten', 'offertes', 'portaal', 'planning', 'werkbonnen', 'facturen', 'visualizer', 'ai', 'email', 'taken'] as const

export async function generateStaticParams() {
  return moduleIds.map((module) => ({ module }))
}

export async function generateMetadata({ params }: { params: { module: string } }): Promise<Metadata> {
  const mod = modules.find((m) => m.href === `/features/${params.module}`)
  const isKnownModule = moduleIds.includes(params.module as typeof moduleIds[number])
  return {
    title: mod?.seoTitle ?? 'Functies | doen.',
    description: mod?.seoDescription ?? 'Ontdek de modules van doen. Alles-in-één software voor het signbedrijf.',
    alternates: { canonical: isKnownModule ? `/features/${params.module}` : '/features' },
  }
}

export default function FeatureModulePage({ params }: { params: { module: string } }) {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <FeaturesContent moduleSlug={params.module} />
      </main>
      <Footer />
    </>
  )
}
