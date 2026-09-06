import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import {
  PRICE_PER_MONTH, STAFFEL,
  PER_SEAT_EERSTE, PER_SEAT_EERSTE_AANTAL, PER_SEAT_EXTRA,
  PER_SEAT_OPSTART_MIN, PER_SEAT_OPSTART_MAX,
} from '@/data/pricing'
import {
  groepen, PAKKETTEN, PEILDATUM, BRONNEN,
  GRIPP_VANAF, GRIPP_VANAF_GEBRUIKERS, GRIPP_EXTRA_MIN, GRIPP_EXTRA_MAX,
  type Cel, } from '@/data/vergelijk'

/* Geen 'use client': er valt hier niets te klikken behalve links, dus de hele
   pagina komt als HTML uit de server en de SSR-check (DESIGN.md, Motion)
   kan niet falen. */

// Zelfde formatter als op /prijzen: € 129 zonder centen, € 49,50 met.
const euro = (n: number) =>
  n.toLocaleString('nl-NL', {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  })

export default function VergelijkContent() {
  return (
    <>
      <Kop />
      <Tabel />
      <Kosten />
      <Afsluiter />
    </>
  )
}

/* Kop · titel en twee zinnen. Entree via CSS-keyframes (globals.css). */
function Kop() {
  return (
    <section className="bg-bg">
      <div className="container-site pt-28 md:pt-44 pb-10 md:pb-20">
        <h1
          className="font-heading font-bold text-petrol leading-[1.0] max-w-3xl"
          style={{ fontSize: 'clamp(34px, 5.2vw, 68px)', letterSpacing: '-0.035em', textWrap: 'balance' }}
        >
          <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
            <span className="hero-line" style={{ animationDelay: '0.05s' }}>
              doen<span className="text-flame">.</span> naast Gripp en James Pro<span className="text-flame">.</span>
            </span>
          </span>
        </h1>
        <p
          className="hero-fade mt-5 md:mt-7 text-[16px] md:text-[19px] leading-[1.6] text-muted max-w-xl"
          style={{ animationDelay: '0.3s' }}
        >
          We hebben allebei de pakketten helemaal doorgeklikt, van offerte tot
          aanmaning. Dit is wat we zagen, nagekeken in {PEILDATUM}.
        </p>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────
   Tabel · vijf groepen, drie kolommen.

   Eén markup voor desktop en mobiel. Vanaf md is elke rij een grid
   met het label links en drie cellen rechts. Daaronder wordt elke
   rij een kaartje: label bovenaan, de drie cellen eronder in drie
   kolommen. De pakketnamen staan boven elke groep, zodat ze op een
   telefoon nooit meer dan zes rijen weg zijn.
   ───────────────────────────────────────────────────────────────── */

const RIJ_GRID = 'grid grid-cols-3 md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-x-4 md:gap-x-8'

function Tabel() {
  return (
    <section className="bg-white">
      <div className="container-site py-14 md:py-28">
        <div className="space-y-12 md:space-y-16">
          {groepen.map((groep) => (
            <div key={groep.titel}>
              <div className={`${RIJ_GRID} items-end pb-3 border-b border-petrol/20`}>
                <h2 className="col-span-3 md:col-span-1 font-heading text-[22px] md:text-[26px] font-bold text-petrol leading-none mb-4 md:mb-0">
                  {groep.titel}
                  <span className="text-flame">.</span>
                </h2>
                {PAKKETTEN.map((naam) => (
                  <p key={naam} className="text-[14px] font-semibold text-ink leading-none">
                    {naam === 'doen.' ? (
                      <>
                        doen<span className="text-flame">.</span>
                      </>
                    ) : (
                      naam
                    )}
                  </p>
                ))}
              </div>

              <ul>
                {groep.rijen.map((rij) => (
                  <li key={rij.label} className={`${RIJ_GRID} gap-y-3 py-4 md:py-5 border-b border-petrol/10 items-start`}>
                    <p className="col-span-3 md:col-span-1 text-[15px] md:text-[16px] font-medium text-ink leading-[1.45]">
                      {rij.label}
                    </p>
                    <CelWaarde cel={rij.doen} />
                    <CelWaarde cel={rij.gripp} />
                    <CelWaarde cel={rij.james} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* Ja is een petrol-vinkje, nee een stille streep, deels en n.v.t. een woord.
   De noot staat eronder in muted, zodat de lezer kan nagaan waarom. */
function CelWaarde({ cel }: { cel: Cel }) {
  return (
    <div className="min-w-0">
      {cel.stand === 'ja' && (
        <>
          <Check className="w-5 h-5 text-petrol" strokeWidth={3} aria-hidden />
          <span className="sr-only">Ja</span>
        </>
      )}
      {cel.stand === 'nee' && (
        <>
          <span aria-hidden className="block h-px w-4 mt-2.5 bg-petrol/30" />
          <span className="sr-only">Nee</span>
        </>
      )}
      {cel.stand === 'deels' && (
        <span className="block text-[14px] font-semibold text-petrol leading-[1.45]">Deels</span>
      )}
      {cel.stand === 'nvt' && (
        <span className="block text-[14px] font-semibold text-muted leading-[1.45]">n.v.t.</span>
      )}
      {cel.noot && (
        <span className="block mt-1 text-[13px] leading-[1.45] text-muted">{cel.noot}</span>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   Eerlijk · waar zij verder zijn. Kort, want dit maakt de tabel
   erboven geloofwaardig; het is geen tweede tabel.
   ───────────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────────
   Wat het kost · drie stille kaarten en een bronregel. De doen.-prijs
   en de James Pro-staffel komen uit pricing.ts, Gripp uit vergelijk.ts.
   ───────────────────────────────────────────────────────────────── */
function Kosten() {
  const kaarten = [
    {
      naam: 'doen.',
      bedrag: `€ ${euro(PRICE_PER_MONTH)}`,
      eenheid: `per maand, tot ${STAFFEL[0].tot} gebruikers`,
      regel: 'Alles inbegrepen. Maandelijks opzegbaar, geen opstartkosten.',
    },
    {
      naam: 'Gripp',
      bedrag: `vanaf € ${euro(GRIPP_VANAF)}`,
      eenheid: `per maand, voor ${GRIPP_VANAF_GEBRUIKERS} gebruikers`,
      regel: `Extra gebruiker € ${euro(GRIPP_EXTRA_MIN)} tot € ${euro(GRIPP_EXTRA_MAX)} per maand. Scan en Herken en het API-pack apart.`,
    },
    {
      naam: 'James Pro',
      bedrag: `€ ${euro(PER_SEAT_EERSTE)}`,
      eenheid: `per gebruiker per maand, voor de eerste ${PER_SEAT_EERSTE_AANTAL}`,
      regel: `Daarna € ${euro(PER_SEAT_EXTRA)} per gebruiker. Eenmalig € ${euro(PER_SEAT_OPSTART_MIN)} tot € ${euro(PER_SEAT_OPSTART_MAX)}.`,
    },
  ]

  return (
    <section className="bg-white">
      <div className="container-site py-14 md:py-28">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-3 mb-10 md:mb-14">
          <h2
            className="font-heading font-bold text-petrol leading-[1.0]"
            style={{ fontSize: 'clamp(30px, 4vw, 52px)', letterSpacing: '-0.03em' }}
          >
            Wat het kost<span className="text-flame">.</span>
          </h2>
          <p className="text-[15px] md:text-[16px] text-muted max-w-xs leading-[1.55]">
            Peildatum {PEILDATUM}, alles ex btw.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {kaarten.map((k) => (
            <div key={k.naam} className="flex flex-col rounded-[12px] border border-petrol/10 bg-bg p-7 md:p-8">
              <h3 className="font-heading text-[21px] md:text-[24px] font-bold text-ink leading-none mb-5">
                {k.naam === 'doen.' ? (
                  <>
                    doen<span className="text-flame">.</span>
                  </>
                ) : (
                  k.naam
                )}
              </h3>
              <p
                className="font-heading font-bold text-petrol leading-none tabular-nums"
                style={{ fontSize: 'clamp(30px, 3vw, 40px)', letterSpacing: '-0.03em' }}
              >
                {k.bedrag}
              </p>
              <p className="mt-2 text-[15px] text-muted leading-[1.5]">{k.eenheid}</p>
              <p className="mt-5 pt-5 border-t border-petrol/10 text-[14px] text-ink leading-[1.55]">{k.regel}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-[13px] leading-[1.6] text-muted max-w-3xl">
          Bronnen:{' '}
          {BRONNEN.map((b, i) => (
            <span key={b.href}>
              <a href={b.href} target="_blank" rel="noopener noreferrer" className="underline decoration-petrol/30 underline-offset-2 hover:text-petrol transition-colors">
                {b.label}
              </a>
              {i < BRONNEN.length - 1 ? ' en ' : ''}
            </span>
          ))}
          . De doen.-prijs staat op{' '}
          <Link href="/prijzen" className="underline decoration-petrol/30 underline-offset-2 hover:text-petrol transition-colors">
            de prijzenpagina
          </Link>
          . Tarieven van anderen kunnen morgen anders zijn; zie je een verschil, laat het ons weten.
        </p>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────
   Afsluiter · petrol-deep, één knop, één zin over overstappen.
   Zelfde knop en proof-regel als de rest van de site.
   ───────────────────────────────────────────────────────────────── */
function Afsluiter() {
  return (
    <section className="relative overflow-hidden bg-petrol-deep">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 90% at 15% 0%, rgba(42,111,122,0.45) 0%, rgba(42,111,122,0) 60%)',
        }}
      />
      <div className="container-site relative py-14 md:py-28">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <h2
              className="font-heading font-bold text-white leading-[1.0] mb-3"
              style={{ fontSize: 'clamp(32px, 4.5vw, 56px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
            >
              Zelf naast elkaar leggen<span className="text-flame">?</span>
            </h2>
            <p className="text-[15px] md:text-[16px] leading-[1.6]" style={{ color: 'rgba(226,240,241,0.82)' }}>
              Kom je van Gripp of James Pro? Wij zetten je gegevens erover.
            </p>
          </div>
          <a
            href="https://app.doen.team/register"
            className="group inline-flex items-center gap-2.5 shrink-0 self-start md:self-auto text-[15px] font-semibold text-white px-7 h-[54px] rounded-[6px] bg-flame transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Probeer doen. 30 dagen gratis</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.5} />
          </a>
        </div>
      </div>
    </section>
  )
}
