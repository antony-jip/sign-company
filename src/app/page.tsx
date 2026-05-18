import Navbar from '@/components/Navbar'
import Hero from '@/components/home/Hero'
import PromiseStrip from '@/components/home/PromiseStrip'
import AppShowcase from '@/components/home/AppShowcase'
import PainComparison from '@/components/home/PainComparison'
import ValueProps from '@/components/home/ValueProps'
import ProcesVisual from '@/components/home/ProcesVisual'
import FlowSteps from '@/components/home/FlowSteps'
import ModulesCarousel from '@/components/home/ModulesCarousel'
import MarqueeStrip from '@/components/home/MarqueeStrip'
import PricingSection from '@/components/home/PricingSection'
import FaqSection from '@/components/home/FaqSection'
import CTASection from '@/components/home/CTASection'
import Footer from '@/components/Footer'
import SignTypesStrip from '@/components/SignTypesStrip'

export default function Home() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <Hero />
        <PromiseStrip />
        <AppShowcase />
        <PainComparison />
        <ModulesCarousel />
        <SignTypesStrip />
        <FlowSteps />
        <MarqueeStrip />
        <ProcesVisual />
        <ValueProps />
        <PricingSection />
        <FaqSection />
        <CTASection />
      </main>
      <Footer />
    </>
  )
}
