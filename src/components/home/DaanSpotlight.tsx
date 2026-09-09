import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

/* Eén ding krijgt een spotlight, de rest staat in de index. Daan en het
   geheugen zijn wat geen enkele boekhoud- of projecttool voor signbedrijven
   heeft, dus dit is het blok dat het verschil moet maken.

   Het stond hier als tekst links en een foto rechts, met een eyebrow-badge
   erboven. Drie dingen mis. De badge is precies het eyebrow-label dat
   DESIGN.md overal verbiedt. De foto was een busje in een steeg: mooi, maar
   hij zegt niets over onthouden, en naast het bewijsblok op halve pagina zag
   hij er bovendien klein uit. En het bewijs zelf, de drie dingen die Daan
   vasthoudt, stond als een lijstje van 17px in de linkerkolom.

   Nu andersom: die drie regels zíjn het blok. Ze staan gecentreerd en groot,
   met erboven waar Daan ze vandaan haalde. Dat toont het mechanisme in plaats
   van het te beschrijven, en het geeft de pagina meteen een andere vorm dan
   de blokken eromheen, die allemaal tekst-links-beeld-rechts zijn. */

const ONTHOUDEN = [
  {
    bron: 'uit je mail',
    regel: 'Het PO-nummer van die aannemer, anders blijft je factuur twee weken liggen.',
  },
  {
    bron: 'uit een klus',
    regel: 'Montage bij het Wilgenhof kan alleen maandag, dan is de zaak dicht.',
  },
  {
    bron: 'uit een werkbon',
    regel: 'Marktstraat 12: hoogwerker nodig, laden via het achterterrein.',
  },
]

export default function DaanSpotlight() {
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
            Je slimste collega onthoudt wat jij vergeet<span className="text-flame">.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl tekst-lead" style={{ color: 'rgba(226,240,241,0.82)' }}>
            Daan leest mee met je mail, je offertes en je klussen, en houdt vast
            wat blijvend is over een klant of een pand.
          </p>
        </div>

        {/* Dit is het bewijs, dus dit krijgt de ruimte. Geen kaarten met een
            schaduw: op een donker vlak doet een haarlijn het werk. */}
        <ul className="mt-12 grid gap-4 md:mt-16 md:grid-cols-3 md:gap-5">
          {ONTHOUDEN.map((item) => (
            <li
              key={item.regel}
              className="kaart-donker flex flex-col gap-3 p-6 md:p-7"
            >
              <span className="tekst-caption font-semibold text-flame">{item.bron}</span>
              <span
                className="font-heading font-semibold text-white"
                style={{ fontSize: 'clamp(18px, 1.5vw, 21px)', lineHeight: 1.35, letterSpacing: '-0.015em' }}
              >
                {item.regel}
              </span>
            </li>
          ))}
        </ul>

        <p
          className="mx-auto mt-10 max-w-2xl text-center tekst-body"
          style={{ color: 'rgba(226,240,241,0.72)' }}
        >
          Daarna handelt de rest van het systeem daarnaar, ook als een collega
          de klus oppakt.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/features/geheugen" className="knop knop-groot knop-flame group">
            <span>Zo werkt het geheugen</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.5} />
          </Link>
          <Link href="/features/ai" className="knop knop-groot knop-lijn-wit group">
            <span>Alles wat Daan doet</span>
            <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
