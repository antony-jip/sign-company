import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { REGISTER_URL } from '@/lib/site'

/* Entree via CSS-keyframes (globals.css: .hero-line / .hero-fade) zodat de
   eindstand ook zonder JS of in achtergrond-tabs bereikt wordt. */
export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-petrol-deep">
      {/* Eén diepe lichtval linksboven — verder niets */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 85% 90% at 12% 0%, rgba(42,111,122,0.55) 0%, rgba(42,111,122,0) 62%)',
        }}
      />

      <div className="container-site relative pt-28 pb-14 md:pt-48 md:pb-28">
        <h1
          className="font-heading font-bold text-white leading-[0.97] mb-8 max-w-4xl"
          style={{ fontSize: 'clamp(44px, 6.4vw, 88px)', letterSpacing: '-0.035em', textWrap: 'balance' }}
        >
          <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
            <span className="hero-line" style={{ animationDelay: '0.05s' }}>
              Eén plek voor je
            </span>
          </span>
          <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
            <span className="hero-line" style={{ animationDelay: '0.15s' }}>
              hele signbedrijf<span className="text-flame">.</span>
            </span>
          </span>
        </h1>

        <p
          className="hero-fade text-[17px] md:text-[20px] leading-[1.6] max-w-xl mb-10"
          style={{ color: 'rgba(226,240,241,0.82)', animationDelay: '0.35s' }}
        >
          Van eerste klantvraag tot betaalde factuur. Offertes, planning,
          werkbonnen en facturen in één systeem, gebouwd voor signmakers.
        </p>

        <div className="hero-fade flex flex-wrap items-center gap-x-7 gap-y-5" style={{ animationDelay: '0.45s' }}>
          <a
            href={REGISTER_URL}
            className="group inline-flex items-center gap-2.5 text-[15px] font-semibold text-white px-7 h-[54px] rounded-[6px] bg-flame transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Start gratis</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.5} />
          </a>
          <Link
            href="/hoe-het-werkt"
            className="group inline-flex items-center gap-2 text-[15px] font-semibold text-white"
          >
            <span className="relative">
              Zie hoe het werkt
              <span
                className="absolute left-0 -bottom-1 h-px w-full origin-left transition-transform duration-300 group-hover:scale-x-0"
                style={{ backgroundColor: 'rgba(255,255,255,0.4)' }}
              />
            </span>
            <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </div>

        <p className="hero-fade text-[13px] mt-8" style={{ color: 'rgba(226,240,241,0.68)', animationDelay: '0.55s' }}>
          30 dagen gratis · geen creditcard · maandelijks opzegbaar
        </p>
      </div>
    </section>
  )
}
