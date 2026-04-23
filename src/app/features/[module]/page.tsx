import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import ScrollProgress from '@/components/ScrollProgress'
import Footer from '@/components/Footer'
import FeaturesContent from '@/components/pages/FeaturesContent'

const moduleIds = ['projecten', 'offertes', 'portaal', 'planning', 'werkbonnen', 'facturen', 'visualizer', 'ai', 'email', 'taken'] as const

const moduleNames: Record<string, string> = {
  projecten: 'Projecten',
  offertes: 'Offertes',
  portaal: 'Klantportaal',
  planning: 'Planning',
  werkbonnen: 'Werkbonnen',
  facturen: 'Facturen',
  visualizer: 'Visualizer',
  ai: 'AI-assistent',
  email: 'Email',
  taken: 'Taken',
}

export async function generateStaticParams() {
  return moduleIds.map((module) => ({ module }))
}

export async function generateMetadata({ params }: { params: { module: string } }): Promise<Metadata> {
  const name = moduleNames[params.module] || 'Cockpit'
  return {
    title: `${name} | doen.`,
    description: `Ontdek de ${name} module van doen. — alles-in-één software voor het signbedrijf.`,
  }
}

export default function FeatureModulePage({ params }: { params: { module: string } }) {
  const index = moduleIds.indexOf(params.module as typeof moduleIds[number])
  const initialModule = index >= 0 ? index : 0

  return (
    <>
      <ScrollProgress />
      <Navbar />
      <main id="main-content">
        <FeaturesContent initialModule={initialModule} moduleSlug={params.module} />
      </main>
      <Footer />
    </>
  )
}
