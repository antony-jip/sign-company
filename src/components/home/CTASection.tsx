import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { RONDLEIDING_HREF, RONDLEIDING_LABEL } from '@/data/cta'

/* Flame-band als afsluiter: één zin, één knop.
   Bewust zonder entree-animatie: dit is het conversieblok en het mag nooit
   afhangen van een observer die in een niet-renderende tab niet vuurt. */
export default function CTASection() {
  return (
    <section className="bg-flame">
      <div className="container-site py-14 md:py-28">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <h2
              className="font-heading font-bold text-white leading-[1.0] mb-3"
              style={{ fontSize: 'clamp(32px, 4.5vw, 56px)', letterSpacing: '-0.03em' }}
            >
              Jij gaat maken<span className="text-white/70">.</span> Wij doen de rest<span className="text-white/70">.</span>
            </h2>
            <p className="text-[15px] font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Account in 5 minuten · 30 dagen gratis · wij zetten je gegevens erover
            </p>
          </div>
          {/* Twee snelheden, net als in de hero: zelf proberen of samen kijken. */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 shrink-0">
            <a
              href="https://app.doen.team/register"
              className="group inline-flex items-center gap-2.5 text-[15px] font-semibold text-flame bg-white px-8 h-[56px] rounded-[6px] transition-transform duration-300 hover:scale-[1.03] active:scale-[0.97]"
            >
              <span>Start gratis</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.5} />
            </a>
            <Link
              href={RONDLEIDING_HREF}
              className="group inline-flex items-center gap-2 text-[15px] font-semibold text-white whitespace-nowrap"
            >
              <span className="relative">
                {RONDLEIDING_LABEL}
                <span
                  className="absolute left-0 -bottom-1 h-px w-full origin-left transition-transform duration-300 group-hover:scale-x-0"
                  style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}
                />
              </span>
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
