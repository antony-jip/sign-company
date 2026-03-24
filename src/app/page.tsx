import Navbar from '@/components/Navbar'
import ScrollProgress from '@/components/ScrollProgress'
import Hero from '@/components/home/Hero'
import ValueProps from '@/components/home/ValueProps'
import FeatureShowcase from '@/components/home/FeatureShowcase'
import DayScroll from '@/components/home/DayScroll'
import DarkSection from '@/components/home/DarkSection'
import SocialProof from '@/components/home/SocialProof'
import CTASection from '@/components/home/CTASection'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <>
      <ScrollProgress />
      <Navbar />
      <main id="main-content">
        <Hero />
        <ValueProps />
        <FeatureShowcase />
        <DayScroll />
        <DarkSection />
        <SocialProof />
        <CTASection />
      </main>
      <Footer />
    </>
  )
}
