import Navbar from '@/components/Navbar'
import Hero from '@/components/home/Hero'
import ProcesVisual from '@/components/home/ProcesVisual'
import ModulesCarousel from '@/components/home/ModulesCarousel'
import ValueProps from '@/components/home/ValueProps'
import VisualizerSection from '@/components/home/VisualizerSection'
import PricingSection from '@/components/home/PricingSection'
import CTASection from '@/components/home/CTASection'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <Hero />
        <ProcesVisual />
        <ModulesCarousel />
        <ValueProps />
        <VisualizerSection />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </>
  )
}
