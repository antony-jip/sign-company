import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import DemoVideo from '@/components/DemoVideo'

/* De film is de pitch: één klus van mail tot betaald, in twee minuten. Dit
   blok vervangt het Daan-spotlight en de klikbare app op de homepage; wie
   zelf wil klikken gaat naar /klik-door. Donker vlak zoals het spotlight
   had, zodat de film als een scherm in de pagina hangt. */
export default function FilmSectie() {
  return (
    <section className="relative overflow-hidden bg-petrol-deep">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 70% at 50% 0%, rgba(42,111,122,0.40) 0%, rgba(42,111,122,0) 62%)',
        }}
      />
      <div className="container-site relative tegel">
        <div className="mx-auto max-w-3xl text-center">
          <h2
            className="font-heading font-bold text-white leading-[1.02]"
            style={{ fontSize: 'clamp(28px, 3.8vw, 48px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
          >
            Van mail tot betaald<span className="text-flame">.</span> In één app<span className="text-flame">.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl tekst-lead" style={{ color: 'rgba(226,240,241,0.82)' }}>
            Kijk in twee minuten hoe één klus door doen. loopt: aanvraag, project,
            offerte, klantportaal, planning, werkbon en factuur. En wat Daan
            ondertussen voor je doet.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-5xl md:mt-14">
          <div className="rounded-card overflow-hidden" style={{ boxShadow: '0 40px 90px -30px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)' }}>
            <DemoVideo />
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/klik-door" className="knop knop-groot knop-flame group">
            <span>Klik zelf door de app</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.5} />
          </Link>
          <a href="https://app.doen.team/register" className="knop knop-groot knop-lijn-wit group">
            <span>Start gratis · 30 dagen</span>
            <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </a>
        </div>
      </div>
    </section>
  )
}
