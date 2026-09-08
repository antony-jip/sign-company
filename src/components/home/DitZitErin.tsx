import Link from 'next/link'
import TelefoonMetDoen from '@/components/home/TelefoonMetDoen'
import { modulesPerGroep, telwoord } from '@/data/modules'

/* Tweede sectie op de home: wat zit er nou eigenlijk in doen. De hero is
   petrol-deep en het bewijsblok eronder is wit, dus deze staat op het
   body-vlak: donker, tint, wit als ladder.

   Alle modules staan onder de vier werkwoorden uit data/modules.ts, dezelfde
   indeling die het menu en Werkwoorden.tsx gebruiken. Dus geen tweede
   taxonomie op de site, en er valt niets buiten de boot: de kaarten lezen
   rechtstreeks uit modulesPerGroep. Komt er een module bij, dan staat hij
   hier vanzelf. Daan is de vijfde groep en krijgt zijn eigen sectie verderop,
   vandaar alleen een regel eronder.

   Hier stonden schermafdrukken en nagebouwde panelen boven elke kaart. Die
   zijn eruit: deze sectie moet je in één oogopslag laten zien wat erin zit,
   en vier kleine schermen tegelijk lezen niet, die leiden af. Wat de app
   doet zie je verderop bij Demo, en op de telefoon hiernaast. De twee
   schermafdrukken staan nog in public/images/app als je ze elders wilt
   gebruiken. */

export default function DitZitErin() {
  const groepen = modulesPerGroep.filter((g) => g.groep !== 'Daan AI')
  const daan = modulesPerGroep.find((g) => g.groep === 'Daan AI')
  // Tel wat er in de kaarten staat, niet alle modules. Daan zit niet in een
  // kaart maar in de regel eronder; hier stond "elf" terwijl je er negen ziet.
  const getoond = groepen.reduce((n, g) => n + g.items.length, 0)
  const aantal = telwoord(getoond)

  return (
    <section>
      <div className="container-site py-14 md:py-24">
        <div className="flex max-w-5xl flex-wrap items-baseline justify-between gap-x-10 gap-y-3">
          <h2
            className="font-heading font-bold leading-[1.0] text-petrol"
            style={{
              fontSize: 'clamp(30px, 4vw, 52px)',
              letterSpacing: '-0.03em',
              textWrap: 'balance',
            }}
          >
            Dit zit erin<span className="text-flame">.</span>
          </h2>
          <p className="max-w-sm text-[15px] leading-[1.55] text-muted md:text-[16px]">
            {aantal.charAt(0).toUpperCase() + aantal.slice(1)} modules onder vier stappen, in
            één systeem. Van de eerste aanvraag tot de betaalde factuur.</p>
        </div>

        {/* Vanaf xl staan de kaarten twee bij twee en krijgt de telefoon de
            rechterkolom. In één rij van vier zou hij bovenop de laatste kaart
            landen, en dan dek je af wat je juist wilde laten zien. */}
        <div className="mt-10 md:mt-14 xl:flex xl:items-start xl:gap-10">
          <div className="grid grid-cols-1 content-start gap-4 sm:grid-cols-2 xl:min-w-0 xl:flex-1">
            {groepen.map((groep, i) => (
              <article
                key={groep.groep}
                className="flex flex-col overflow-hidden rounded-[12px] border border-petrol/10 bg-white"
                style={{
                  boxShadow: '0 1px 2px rgba(20,40,40,0.04), 0 18px 44px -30px rgba(19,62,69,0.35)',
                }}
              >
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
            ))}
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
            En het werkt net zo goed vanuit de bus. Tik de menubalk op de telefoon aan, dan loop je er zelf
            doorheen.
          </p>
        </div>
      </div>
    </section>
  )
}
