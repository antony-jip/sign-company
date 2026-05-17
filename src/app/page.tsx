import Navbar from '@/components/Navbar'
import Hero from '@/components/home/Hero'
import ValueProps from '@/components/home/ValueProps'
import ProcesVisual from '@/components/home/ProcesVisual'
import ModulesCarousel from '@/components/home/ModulesCarousel'
import SocialProof from '@/components/home/SocialProof'
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
        <ModulesCarousel />
        <SignTypesStrip />
        <ProcesVisual />
        <ValueProps />
        <SocialProof />
        <PricingSection />
        <FaqSection />
        <CTASection />
      </main>
      <Footer />
    </>
  )
}
