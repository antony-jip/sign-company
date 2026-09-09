import { ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { RONDLEIDING_HREF } from '@/data/cta'

/* Entree via CSS-keyframes (globals.css: .hero-line / .hero-fade) zodat de
   eindstand ook zonder JS of in achtergrond-tabs bereikt wordt. */
export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-petrol-deep">
      {/* Het werk zelf achter de belofte. Het beeld staat rechts uitgelijnd,
          zodat de montage in de rechterhelft valt waar geen tekst staat. */}
      <Image
        src="/images/fotos/hoogwerker-aan-de-gevel-breed.webp"
        alt=""
        aria-hidden
        fill
        priority
        sizes="100vw"
        className="object-cover object-[70%_center]"
      />
      {/* Mobiel staat de kop over de volle breedte, dus daar moet het beeld
          wel onder een scrim. Op desktop staat de tekst links en mag de gevel
          rechts gewoon te zien zijn. */}
      <div aria-hidden className="absolute inset-0 pointer-events-none bg-petrol-deep/70 md:hidden" />

      {/* Een dunne petrol-waas houdt de merkkleur vast zonder de foto te doven.
          Stond eerder op 0.3, samen met een verloop dat rechts nog op 0.22
          eindigde: de rechterhelft las dan als vlak petrol en van de montage
          zag je niets. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none bg-petrol hidden md:block"
        style={{ opacity: 0.15, mixBlendMode: 'multiply' }}
      />
      {/* Het verloop is links dicht genoeg voor witte tekst en dooft rechts
          bijna helemaal uit, zodat de gevel het beeld draagt. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none hidden md:block"
        style={{
          background:
            'linear-gradient(100deg, rgba(13,52,60,0.94) 0%, rgba(13,52,60,0.86) 30%, rgba(13,52,60,0.45) 55%, rgba(13,52,60,0.10) 78%, rgba(13,52,60,0.02) 100%)',
        }}
      />
      {/* Eén diepe lichtval linksboven, alleen over de tekstkolom */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 90% at 10% 0%, rgba(42,111,122,0.45) 0%, rgba(42,111,122,0) 62%)',
        }}
      />

      <div className="container-site relative pt-28 pb-14 md:pt-48 md:pb-28">
        <h1
          className="font-heading font-bold text-white leading-[0.97] mb-8 max-w-4xl"
          style={{ fontSize: 'clamp(44px, 6.4vw, 88px)', letterSpacing: '-0.035em', textWrap: 'balance' }}
        >
          <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
            <span className="hero-line" style={{ animationDelay: '0.05s' }}>
              Jij maakt de stad zichtbaar<span className="text-flame">.</span>
            </span>
          </span>
          <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
            <span className="hero-line" style={{ animationDelay: '0.15s' }}>
              Wij regelen de rest<span className="text-flame">.</span>
            </span>
          </span>
        </h1>

        <p
          className="hero-fade tekst-lead max-w-xl mb-10"
          style={{ color: 'rgba(226,240,241,0.82)', animationDelay: '0.35s' }}
        >
          Elke gevel, elke bus, elke winkelnaam: daar stond een signmaker
          achter. doen. is gebouwd door zo&apos;n bedrijf, voor zo&apos;n bedrijf.
          Offerte, planning, werkbon en factuur in één systeem, zodat jij doet
          waar je goed in bent: maken.
        </p>

        <div className="hero-fade flex flex-wrap items-center gap-4" style={{ animationDelay: '0.45s' }}>
          <a
            href="https://app.doen.team/register"
            className="knop knop-groot knop-flame group"
          >
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

        <p className="hero-fade tekst-fijn mt-8" style={{ color: 'rgba(226,240,241,0.68)', animationDelay: '0.55s' }}>
          30 dagen gratis · geen creditcard · wij zetten je gegevens erover
        </p>
      </div>
    </section>
  )
}
