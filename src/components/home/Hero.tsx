import { ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { RONDLEIDING_HREF } from '@/data/cta'

/* De kop doet het werk, de foto vertelt het verhaal.

   Dit stond eerder omgekeerd: de foto lag áchter de tekst en had een verloop
   nodig dat links dicht genoeg was om witte letters te dragen. Gevolg was dat
   je van de montage nog geen halve foto zag. En de kop ("Jij maakt de stad
   zichtbaar. Wij regelen de rest.") vleide de signmaker wel, maar zei niet
   wat doen. ís. Wie koud binnenkwam wist na die kop nog steeds niet dat dit
   software is voor offerte, planning, werkbon en factuur.

   Nu twee lagen boven elkaar in plaats van over elkaar: de belofte op een
   stil petrol-vlak, daaronder de foto over de volle breedte en in volle
   kleur. Geen scrim, geen verloop, niks eroverheen. Bij Apple draagt het
   product het verhaal; bij een signbedrijf is dat product niet het scherm
   maar de gevel.

   Entree via CSS-keyframes (globals.css: .hero-line / .hero-fade) zodat de
   eindstand ook zonder JS of in achtergrond-tabs bereikt wordt. */
export default function Hero() {
  return (
    <section className="bg-petrol-deep">
      <div className="relative overflow-hidden">
        {/* De enige lichtval die op petrol-deep mag, linksboven achter de kop. */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 55% 90% at 10% 0%, rgba(42,111,122,0.45) 0%, rgba(42,111,122,0) 62%)',
          }}
        />

        <div className="container-site relative pt-28 pb-12 md:pt-44 md:pb-16">
          <h1
            className="font-heading font-bold text-white leading-[1.0] mb-7 max-w-5xl"
            style={{ fontSize: 'clamp(36px, 4.9vw, 64px)', letterSpacing: '-0.035em' }}
          >
            <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
              <span className="hero-line" style={{ animationDelay: '0.05s' }}>
                Je hele signbedrijf op één plek<span className="text-flame">.</span>
              </span>
            </span>
            <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
              <span className="hero-line" style={{ animationDelay: '0.15s' }}>
                Van offerte tot factuur<span className="text-flame">.</span>
              </span>
            </span>
          </h1>

          {/* De kop zegt nu wat het is, dus deze regel hoeft dat niet meer te
              herhalen. Hier staat voor wie het gebouwd is en door wie. */}
          <p
            className="hero-fade tekst-lead max-w-xl mb-9"
            style={{ color: 'rgba(226,240,241,0.82)', animationDelay: '0.35s' }}
          >
            Elke gevel, elke bus, elke winkelnaam: daar stond een signmaker
            achter. doen. is gebouwd door zo&apos;n bedrijf, voor zo&apos;n bedrijf.
          </p>

          <div className="hero-fade flex flex-wrap items-center gap-4" style={{ animationDelay: '0.45s' }}>
            <a href="https://app.doen.team/register" className="knop knop-groot knop-flame group">
              <span>Start gratis</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.5} />
            </a>
            {/* Tweede spoor naast de proef. Een eigenaar die om drie uur op een
                steiger staat begint niet aan een proefaccount; die wil dertig
                minuten schermdelen. */}
            <Link href={RONDLEIDING_HREF} className="knop knop-groot knop-lijn-wit group">
              <span>Plan een rondleiding</span>
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </div>

          <p className="hero-fade tekst-fijn mt-7" style={{ color: 'rgba(226,240,241,0.68)', animationDelay: '0.55s' }}>
            30 dagen gratis · geen creditcard · wij zetten je gegevens erover
          </p>
        </div>
      </div>

      {/* Het werk zelf, over de volle breedte en zonder iets eroverheen. Op
          mobiel staat de foto rechtopper zodat de montage in beeld blijft; op
          een breed scherm loopt hij als een band mee. */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9]">
        <Image
          src="/images/fotos/hoogwerker-aan-de-gevel-breed.webp"
          alt="Twee monteurs bevestigen ingepakte gevelletters vanaf een hoogwerker aan een winkelpand"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[62%_center]"
        />
      </div>
    </section>
  )
}
