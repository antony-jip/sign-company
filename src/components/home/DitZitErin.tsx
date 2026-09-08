import Image from 'next/image'
import Link from 'next/link'
import TelefoonMetDoen from '@/components/home/TelefoonMetDoen'
import { modulesPerGroep, moduleAantalWoord } from '@/data/modules'

/* Tweede sectie op de home: wat zit er nou eigenlijk in doen. De hero is
   petrol-deep en het bewijsblok eronder is wit, dus deze staat op het
   body-vlak: donker, tint, wit als ladder.

   Alle modules staan onder de vier werkwoorden uit data/modules.ts, dezelfde
   indeling die het menu en Werkwoorden.tsx gebruiken. Dus geen tweede
   taxonomie op de site, en er valt niets buiten de boot: de kaarten lezen
   rechtstreeks uit modulesPerGroep. Komt er een module bij, dan staat hij
   hier vanzelf. Daan is de vijfde groep en krijgt zijn eigen sectie verderop,
   vandaar alleen een regel eronder.

   Kaarten in plaats van hairline-rijen, tegen de sectie-grammatica van
   DESIGN.md in. Bewust: hier moet je in één oogopslag het scherm zien, en een
   rij zonder beeld doet dat niet.

   Offertes en Planning zijn echte schermafdrukken uit AppShowcase, dus met
   demodata: De Vries Reclame, Hotel De Linde, Van Meer & Co. Nooit de app met
   de echte klanten erin fotograferen voor de site. Maken en Factureren zijn
   hier nagebouwd; die twee wachten nog op een schermafdruk. */

/* Per groep het beeld dat erbij hoort: een echte schermafdruk waar we die
   hebben, anders een nagebouwd paneel. */
const BEELD: Record<string, { src: string; alt: string } | 'werkbon' | 'factuur'> = {
  Binnenhalen: {
    src: '/images/app/offerte.png',
    alt: 'De offerte-editor in doen. met introductietekst, offerte-items en de klantgegevens ernaast',
  },
  Plannen: {
    src: '/images/app/planning.png',
    alt: 'De weekplanning in doen. met de te plannen klussen links en de dagen van de week ernaast',
  },
  Maken: 'werkbon',
  Factureren: 'factuur',
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

export default function DitZitErin() {
  const groepen = modulesPerGroep.filter((g) => g.groep !== 'Daan AI')
  const daan = modulesPerGroep.find((g) => g.groep === 'Daan AI')

  return (
    <section>
      <div className="container-site py-14 md:py-24">
        <div className="flex max-w-5xl flex-wrap items-baseline justify-between gap-x-10 gap-y-3">
          <h2
            className="font-heading font-bold leading-[1.0] text-petrol"
            style={{ fontSize: 'clamp(30px, 4vw, 52px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
          >
            Dit zit erin<span className="text-flame">.</span>
          </h2>
          <p className="max-w-sm text-[15px] leading-[1.55] text-muted md:text-[16px]">
            {moduleAantalWoord.charAt(0).toUpperCase() + moduleAantalWoord.slice(1)} modules, vier
            stappen, één systeem. Van de eerste aanvraag tot de betaalde factuur.
          </p>
        </div>

        {/* Vanaf xl staan de kaarten twee bij twee en krijgt de telefoon de
            rechterkolom. In één rij van vier zou hij bovenop de laatste kaart
            landen, en dan dek je af wat je juist wilde laten zien. */}
        <div className="mt-10 md:mt-14 xl:flex xl:items-stretch xl:gap-10">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:min-w-0 xl:flex-1">
            {groepen.map((groep, i) => {
              const beeld = BEELD[groep.groep]
              return (
                <article
                  key={groep.groep}
                  className="flex flex-col overflow-hidden rounded-[12px] border border-petrol/10 bg-white"
                  style={{ boxShadow: '0 1px 2px rgba(20,40,40,0.04), 0 18px 44px -30px rgba(19,62,69,0.35)' }}
                >
                  <div className="relative aspect-[16/10] overflow-hidden border-b border-petrol/10 bg-bg">
                    {typeof beeld === 'object' ? (
                      <Image
                        src={beeld.src}
                        alt={beeld.alt}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 320px"
                        className="object-cover object-left-top"
                      />
                    ) : beeld === 'werkbon' ? (
                      <WerkbonPaneel />
                    ) : (
                      <FactuurPaneel />
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="flex items-baseline gap-2 font-heading text-[19px] font-bold text-petrol">
                      <span className="font-mono text-[12px] font-semibold text-muted tabular-nums">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span>
                        {groep.groep}
                        <span className="text-flame">.</span>
                      </span>
                    </h3>

                    <ul className="mt-3 divide-y divide-petrol/10 border-t border-petrol/10">
                      {groep.items.map((m) => (
                        <li key={m.label}>
                          <Link
                            href={m.href}
                            className="group flex items-baseline gap-2 py-2 transition-colors"
                          >
                            <span
                              aria-hidden
                              className="mt-[5px] h-[7px] w-[7px] flex-shrink-0 rounded-full"
                              style={{ background: m.color }}
                            />
                            <span className="min-w-0">
                              <span className="text-[14.5px] font-semibold text-ink transition-colors group-hover:text-petrol">
                                {m.label}
                              </span>
                              <span className="ml-1.5 text-[13.5px] text-muted">{m.sub}</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              )
            })}
          </div>

          <div className="mt-10 flex flex-shrink-0 items-end justify-center xl:mt-0">
            <TelefoonMetDoen />
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-baseline gap-x-8 gap-y-3">
          {daan && (
            <p className="text-[15px] leading-[1.6] text-muted">
              Door alle vier heen loopt <span className="font-semibold text-petrol">Daan</span>:{' '}
              {daan.items.map((m) => m.label.toLowerCase()).join(' en ')}.{' '}
              <Link
                href={daan.items[0].href}
                className="font-semibold text-petrol underline decoration-flame decoration-2 underline-offset-4 transition-colors hover:text-flame"
              >
                Wat Daan doet
              </Link>
              .
            </p>
          )}
          <p className="text-[15px] leading-[1.6] text-muted">
            En het werkt net zo goed vanuit de bus. Tik de menubalk op de telefoon aan, dan loop je
            er zelf doorheen.
          </p>
        </div>
      </div>
    </section>
  )
}
