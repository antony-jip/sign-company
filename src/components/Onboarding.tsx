import Link from 'next/link'
import { Check, MonitorCheck, Truck } from 'lucide-react'
import { onboardingRoutes, ONBOARDING_OP_LOCATIE_PRIJS } from '@/data/onboarding'

/* De onboarding-belofte in twee vormen, net als EigenGebruik:
   - `sectie` : het hele verhaal, staat één keer op de site (/prijzen)
   - `regel`  : één zin met doorverwijzing, voor de pagina's eromheen

   Kort houden. Wie op een prijzenpagina staat leest geen alinea's, dus het
   icoon en de prijs doen het werk en de punten zijn steekwoorden. */

const ICONEN = { scherm: MonitorCheck, bus: Truck } as const

export function OnboardingRegel({ className = '' }: { className?: string }) {
  return (
    <p className={`text-[15px] leading-[1.6] text-muted ${className}`}>
      <span className="font-semibold text-petrol">Onboarding is gratis.</span> Langskomen kan
      ook, voor € {ONBOARDING_OP_LOCATIE_PRIJS} ex btw plus reis.{' '}
      <Link href="/prijzen#onboarding" className="font-semibold text-petrol hover:text-flame transition-colors">
        Zo werkt dat
      </Link>
      .
    </p>
  )
}

export function OnboardingSectie() {
  return (
    <section id="onboarding" className="bg-white scroll-mt-24">
      <div className="container-site py-16 md:py-28">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-3 mb-10 md:mb-14">
          <h2
            className="font-heading font-bold text-petrol leading-[1.0]"
            style={{ fontSize: 'clamp(30px, 4vw, 52px)', letterSpacing: '-0.03em' }}
          >
            Wij zetten je op weg<span className="text-flame">.</span>
          </h2>
          <p className="text-[15px] md:text-[16px] text-muted max-w-xs leading-[1.55]">
            Je hoeft niet zelf uit te puzzelen hoe doen. werkt.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
          {onboardingRoutes.map((route) => {
            const Icoon = ICONEN[route.icoon]
            return (
              <div key={route.titel} className="border-t border-petrol/10 pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <Icoon className="w-6 h-6 shrink-0 text-flame" strokeWidth={1.8} />
                  <h3 className="font-heading text-[21px] md:text-[24px] font-bold text-ink leading-none">
                    {route.titel}
                    <span className="text-flame">.</span>
                  </h3>
                  <span className="ml-auto text-[14px] font-semibold text-petrol">{route.prijs}</span>
                </div>
                <ul className="space-y-2.5">
                  {route.punten.map((punt) => (
                    <li key={punt} className="flex items-center gap-3">
                      <Check className="w-4 h-4 shrink-0 text-flame" strokeWidth={3} />
                      <span className="text-[15px] text-ink">{punt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        <p className="mt-10 md:mt-14 text-[15px] md:text-[16px] text-ink">
          Binnen een week live.{' '}
          <Link href="#aanmelden" className="font-semibold text-petrol hover:text-flame transition-colors">
            Begin vandaag →
          </Link>
        </p>
      </div>
    </section>
  )
}
