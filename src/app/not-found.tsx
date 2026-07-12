import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

/* Entree via CSS-keyframes (globals.css: .hero-line / .hero-fade) zodat de
   eindstand ook zonder JS of in achtergrond-tabs bereikt wordt. */
export default function NotFound() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="bg-bg min-h-[75vh] flex items-center">
        <div className="container-site py-32">
          <div className="max-w-3xl">
            <h1
              className="font-heading font-bold text-petrol leading-[0.98] mb-6"
              style={{ fontSize: 'clamp(40px, 5.6vw, 76px)', letterSpacing: '-0.035em', textWrap: 'balance' }}
            >
              <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
                <span className="hero-line" style={{ animationDelay: '0.05s' }}>
                  Deze pagina werd
                </span>
              </span>
              <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
                <span className="hero-line" style={{ animationDelay: '0.15s' }}>
                  niet gedaan<span className="text-flame">.</span>
                </span>
              </span>
            </h1>
            <p className="hero-fade text-[16px] md:text-[17px] leading-[1.6] text-muted max-w-xl mb-9" style={{ animationDelay: '0.35s' }}>
              Foutcode 404 · de pagina bestaat niet of is verplaatst. We brengen
              je weer op weg.
            </p>
            <div className="hero-fade flex flex-wrap items-center gap-5 md:gap-7" style={{ animationDelay: '0.45s' }}>
              <Link
                href="/"
                className="group inline-flex items-center gap-2 text-[15px] font-semibold text-white bg-flame px-7 h-[54px] rounded-[6px] transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Terug naar home</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.5} />
              </Link>
              <Link
                href="/features"
                className="group inline-flex items-center gap-2 text-[15px] font-semibold text-ink"
              >
                <span className="relative">
                  Bekijk de modules
                  <span className="absolute left-0 -bottom-1 h-px w-full origin-left transition-transform duration-300 group-hover:scale-x-0 bg-ink/30" />
                </span>
                <span aria-hidden className="text-flame transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
