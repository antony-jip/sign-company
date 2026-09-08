import Image from 'next/image'
import Link from 'next/link'
import TelefoonMetDoen from '@/components/home/TelefoonMetDoen'

/* Tweede sectie op de home: wat zit er nou eigenlijk in doen. De hero is
   petrol-deep en het bewijsblok eronder is wit, dus deze staat op het
   body-vlak: donker, tint, wit als ladder.

   Kaarten in plaats van hairline-rijen, tegen de sectie-grammatica van
   DESIGN.md in. Bewust: hier moet je in één oogopslag het scherm zíen, en
   een rij zonder beeld doet dat niet. Rechtsonder hangt de telefoon over de
   sectie heen, want dat het ook op je mobiel werkt is geen aparte sectie
   waard maar wil je wel weten.

   Offerte en Planning zijn echte schermafdrukken uit AppShowcase, dus met
   demodata: De Vries Reclame, Hotel De Linde, Van Meer & Co. Nooit de app
   met de echte klanten erin fotograferen voor de site. Werkbon en Factuur
   zijn hier nagebouwd; die twee wachten nog op een schermafdruk. */

type Kaart = {
  titel: string
  punten: string[]
  beeld?: { src: string; alt: string }
  paneel?: React.ReactNode
}

function WerkbonPaneel() {
  return (
    <div className="flex h-full w-full flex-col bg-bg p-4 text-[10px] leading-tight text-ink">
      <p className="font-heading text-[13px] font-bold text-petrol">
        Werkbon<span className="text-flame">.</span>
      </p>
      <p className="mt-0.5 text-[9px] text-muted">WB-2026-084 · Hotel De Linde</p>
      <div className="mt-2.5 space-y-1.5">
        {[
          ['Uren', '6,5'],
          ['Materiaal', '3 regels'],
          ["Foto's", '4'],
        ].map(([l, w]) => (
          <div key={l} className="flex items-center justify-between rounded-md bg-white px-2.5 py-1.5">
            <span>{l}</span>
            <span className="font-mono font-semibold">{w}</span>
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex-1 rounded-md border border-dashed border-petrol/25 bg-white px-2.5 py-2">
        <p className="text-[9px] uppercase tracking-widest text-muted">Handtekening klant</p>
        <svg viewBox="0 0 120 26" className="mt-1 h-6 w-full" fill="none" stroke="#1A535C" strokeWidth={1.6} aria-hidden>
          <path d="M4 19c8-12 13 4 20-3s9-9 15 1 10 8 17-3 12 5 20-1 14 2 20-4" strokeLinecap="round" />
        </svg>
      </div>
      <span className="mt-2.5 self-start rounded-full bg-[#E8F2EC] px-2 py-0.5 text-[9px] font-semibold text-[#2D6B48]">
        Afgetekend<span className="text-flame">.</span>
      </span>
    </div>
  )
}

function FactuurPaneel() {
  return (
    <div className="flex h-full w-full flex-col bg-bg p-4 text-[10px] leading-tight text-ink">
      <p className="font-heading text-[13px] font-bold text-petrol">
        Factuur<span className="text-flame">.</span>
      </p>
      <p className="mt-0.5 text-[9px] text-muted">FAC-2026-231 · Van Meer &amp; Co</p>
      <div className="mt-2.5 rounded-md bg-white px-2.5 py-2">
        {[
          ['Behang textielframe', '€ 1.480,00'],
          ['Montage op locatie', '€ 380,00'],
          ['Meerwerk uit werkbon', '€ 145,00'],
        ].map(([l, b], i) => (
          <div
            key={l}
            className={`flex items-center justify-between py-1 ${i > 0 ? 'border-t border-petrol/10' : ''}`}
          >
            <span className="truncate pr-2">{l}</span>
            <span className="flex-shrink-0 font-mono">{b}</span>
          </div>
        ))}
        <div className="mt-1 flex items-center justify-between border-t border-petrol/20 pt-1.5">
          <span className="font-semibold">Totaal ex btw</span>
          <span className="font-mono font-bold">€ 2.005,00</span>
        </div>
      </div>
      <div className="mt-auto flex items-center gap-1.5 pt-2.5">
        <span className="rounded-full bg-[#E8F2EC] px-2 py-0.5 text-[9px] font-semibold text-[#2D6B48]">
          Verstuurd<span className="text-flame">.</span>
        </span>
        <span className="text-[9px] text-muted">door naar Exact</span>
      </div>
    </div>
  )
}

const KAARTEN: Kaart[] = [
  {
    titel: 'Offertes',
    beeld: {
      src: '/images/app/offerte.png',
      alt: 'De offerte-editor in doen. met introductietekst, offerte-items en de klantgegevens ernaast',
    },
    punten: [
      'Calculeer met je eigen producten en uren',
      'Zie je marge terwijl je typt',
      'Klant tekent digitaal, zonder inlog',
    ],
  },
  {
    titel: 'Planning',
    beeld: {
      src: '/images/app/planning.png',
      alt: 'De weekplanning in doen. met de te plannen klussen links en de dagen van de week ernaast',
    },
    punten: [
      'Sleep een klus naar een dag',
      'De werkbon hangt er meteen aan',
      'Weerbericht erbij voor buitenmontage',
    ],
  },
  {
    titel: 'Werkbonnen',
    paneel: <WerkbonPaneel />,
    punten: [
      'Je monteur ziet zijn klus op zijn telefoon',
      "Uren, foto's en meerwerk erbij",
      'Klant tekent af op locatie',
    ],
  },
  {
    titel: 'Facturen',
    paneel: <FactuurPaneel />,
    punten: [
      'Factureer wat er echt gedaan is',
      'Meerwerk komt uit de werkbon mee',
      'Door naar je boekhouding',
    ],
  },
]

export default function DitZitErin() {
  return (
    <section>
      <div className="container-site py-14 md:py-24">
        <div className="flex flex-wrap items-baseline justify-between gap-x-10 gap-y-3 max-w-5xl">
          <h2
            className="font-heading font-bold text-petrol leading-[1.0]"
            style={{ fontSize: 'clamp(30px, 4vw, 52px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
          >
            Dit zit erin<span className="text-flame">.</span>
          </h2>
          <p className="max-w-sm text-[15px] md:text-[16px] leading-[1.55] text-muted">
            Van de eerste offerte tot de betaalde factuur, in één systeem. Alles wat je hier ziet
            is doen. zelf.
          </p>
        </div>

        {/* Vanaf xl staan de kaarten twee bij twee en krijgt de telefoon de
            rechterkolom. In één rij van vier zou hij bovenop de laatste kaart
            landen, en dan dek je af wat je juist wilde laten zien. */}
        <div className="mt-10 md:mt-14 xl:flex xl:items-stretch xl:gap-10">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:min-w-0 xl:flex-1">
            {KAARTEN.map((k) => (
              <article
                key={k.titel}
                className="flex flex-col overflow-hidden rounded-[12px] border border-petrol/10 bg-white"
                style={{ boxShadow: '0 1px 2px rgba(20,40,40,0.04), 0 18px 44px -30px rgba(19,62,69,0.35)' }}
              >
                <div className="relative aspect-[16/10] overflow-hidden border-b border-petrol/10 bg-bg">
                  {k.beeld ? (
                    <Image
                      src={k.beeld.src}
                      alt={k.beeld.alt}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 300px"
                      className="object-cover object-left-top"
                    />
                  ) : (
                    k.paneel
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-heading text-[18px] font-bold text-petrol">
                    {k.titel}
                    <span className="text-flame">.</span>
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {k.punten.map((punt) => (
                      <li key={punt} className="flex gap-2 text-[14px] leading-[1.5] text-muted">
                        <span aria-hidden className="mt-[1px] font-semibold text-flame">
                          ✓
                        </span>
                        <span>{punt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-10 flex flex-shrink-0 items-end justify-center xl:mt-0">
            <TelefoonMetDoen />
          </div>
        </div>

        <p className="mt-10 max-w-2xl text-[15px] leading-[1.6] text-muted xl:max-w-md">
          En het werkt net zo goed vanuit de bus. Tik de menubalk op de telefoon aan, dan loop je
          er zelf doorheen.{' '}
          <Link
            href="/features"
            className="font-semibold text-petrol underline decoration-flame decoration-2 underline-offset-4 transition-colors hover:text-flame"
          >
            Alle modules
          </Link>
          .
        </p>
      </div>
    </section>
  )
}
