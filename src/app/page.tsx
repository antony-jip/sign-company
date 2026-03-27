import Navbar from '@/components/Navbar'
import ScrollProgress from '@/components/ScrollProgress'
import Hero from '@/components/home/Hero'
import DeGolf from '@/components/brand/DeGolf'
import ValueProps from '@/components/home/ValueProps'
import VisualizerSection from '@/components/home/VisualizerSection'
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
        <DeGolf className="-mt-1" />
        <ValueProps />
        <VisualizerSection />
        <FeatureShowcase />
        <DayScroll />
        <DeGolf className="-mb-1" flip />
        <DarkSection />
        <SocialProof />
        <CTASection />
      </main>
      <Footer />
    </>
  )
}
