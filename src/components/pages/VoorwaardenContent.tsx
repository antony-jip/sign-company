import Link from 'next/link'
import {
  hoofdstukken,
  bijlageA,
  subVerwerkers,
  eigenKoppelingen,
  VOORWAARDEN_VERSIE,
  VOORWAARDEN_DATUM,
  type Artikel,
  type SubVerwerker,
} from '@/data/voorwaarden'

/* Juridische pagina: leesbaarheid boven vormgeving. Eén kolom op
   leesbreedte, artikelen als genummerde hairline-blokken, geen animaties.
   De inhoud staat in src/data/voorwaarden.ts. */

function ArtikelBlok({ artikel }: { artikel: Artikel }) {
  return (
    <article id={`artikel-${artikel.nr.toLowerCase()}`} className="border-t border-petrol/10 py-7 md:py-9 scroll-mt-28">
      <h3 className="font-heading text-[19px] md:text-[22px] font-bold text-petrol leading-tight mb-4" style={{ letterSpacing: '-0.02em' }}>
        <span className="text-flame">{artikel.nr}.</span> {artikel.titel}
      </h3>
      <ol className="space-y-3">
        {artikel.leden.map((lid, i) => (
          <li key={i} className="grid grid-cols-[28px_1fr] gap-x-2">
            <span className="text-[13px] font-semibold text-muted pt-[3px] tabular-nums">
              {artikel.nr}.{i + 1}
            </span>
            <p className="text-[15px] md:text-[16px] leading-[1.65] text-ink">{lid}</p>
          </li>
        ))}
      </ol>
    </article>
  )
}

function VerwerkerTabel({ rijen, titel }: { rijen: SubVerwerker[]; titel: string }) {
  return (
    <div className="mt-8">
      <h4 className="font-heading text-[17px] font-bold text-petrol mb-4">
        {titel}
        <span className="text-flame">.</span>
      </h4>
      <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
        <table className="w-full min-w-[680px] border-collapse text-left">
          <thead>
            <tr className="border-b border-petrol/20">
              {['Partij', 'Waarvoor', 'Welke gegevens', 'Waar', 'Grondslag'].map((k) => (
                <th key={k} className="py-2.5 pr-4 text-[12px] font-bold uppercase tracking-[0.1em] text-muted align-bottom">
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rijen.map((r) => (
              <tr key={r.naam} className="border-b border-petrol/10 align-top">
                <td className="py-3 pr-4 text-[14px] font-semibold text-petrol">{r.naam}</td>
                <td className="py-3 pr-4 text-[14px] text-ink">{r.waarvoor}</td>
                <td className="py-3 pr-4 text-[14px] text-muted">{r.gegevens}</td>
                <td className="py-3 pr-4 text-[14px] text-muted whitespace-nowrap">{r.locatie}</td>
                <td className="py-3 text-[14px] text-muted">{r.grondslag}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function VoorwaardenContent() {
  return (
    <>
      <section className="bg-bg">
        <div className="container-site pt-28 md:pt-40 pb-10 md:pb-16">
          <h1
            className="font-heading font-bold text-petrol leading-[1.0] max-w-3xl mb-5"
            style={{ fontSize: 'clamp(34px, 5vw, 62px)', letterSpacing: '-0.035em', textWrap: 'balance' }}
          >
            Algemene voorwaarden<span className="text-flame">.</span>
          </h1>
          <p className="text-[16px] md:text-[18px] leading-[1.6] text-muted max-w-xl">
            Versie {VOORWAARDEN_VERSIE}, geldig vanaf {VOORWAARDEN_DATUM}. Deze voorwaarden gelden
            voor elk gebruik van doen. en je aanvaardt ze bij het aanmaken van een account.
          </p>

          <div className="mt-8 rounded-[10px] border border-petrol/10 bg-white p-5 md:p-6 max-w-2xl">
            <p className="text-[15px] leading-[1.6] text-ink">
              De verwerkersovereenkomst die de AVG voorschrijft staat in{' '}
              <a href="#bijlage-a" className="font-semibold text-petrol hover:text-flame transition-colors">
                Bijlage A
              </a>
              . Die geldt automatisch zodra je een account aanmaakt, je hoeft er niet apart om te
              vragen. In{' '}
              <a href="#bijlage-b" className="font-semibold text-petrol hover:text-flame transition-colors">
                Bijlage B
              </a>{' '}
              staat welke partijen namens ons gegevens verwerken en waar dat gebeurt.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="container-site py-12 md:py-20">
          <div className="max-w-3xl">
            {/* Inhoudsopgave */}
            <nav aria-label="Inhoud" className="mb-12 md:mb-16">
              <h2 className="font-heading text-[15px] font-bold text-petrol mb-4">
                Inhoud<span className="text-flame">.</span>
              </h2>
              <ol className="space-y-1.5">
                {hoofdstukken.flatMap((h) => h.artikelen).map((a) => (
                  <li key={a.nr}>
                    <a
                      href={`#artikel-${a.nr.toLowerCase()}`}
                      className="group inline-flex gap-2 text-[14.5px] text-muted hover:text-petrol transition-colors"
                    >
                      <span className="font-semibold text-flame w-5 shrink-0 tabular-nums">{a.nr}</span>
                      <span className="group-hover:underline underline-offset-2">{a.titel}</span>
                    </a>
                  </li>
                ))}
                <li className="pt-2">
                  <a href="#bijlage-a" className="inline-flex gap-2 text-[14.5px] font-semibold text-petrol hover:text-flame transition-colors">
                    Bijlage A · Verwerkersovereenkomst
                  </a>
                </li>
                <li>
                  <a href="#bijlage-b" className="inline-flex gap-2 text-[14.5px] font-semibold text-petrol hover:text-flame transition-colors">
                    Bijlage B · Sub-verwerkers
                  </a>
                </li>
              </ol>
            </nav>

            {hoofdstukken.map((h) => (
              <div key={h.titel} className="mb-10 md:mb-14">
                <h2
                  className="font-heading font-bold text-petrol leading-[1.05] mb-2"
                  style={{ fontSize: 'clamp(24px, 3vw, 34px)', letterSpacing: '-0.03em' }}
                >
                  {h.titel}
                  <span className="text-flame">.</span>
                </h2>
                {h.artikelen.map((a) => (
                  <ArtikelBlok key={a.nr} artikel={a} />
                ))}
              </div>
            ))}

            {/* Bijlage A */}
            <div id="bijlage-a" className="scroll-mt-28 pt-6 mb-10 md:mb-14 border-t-2 border-petrol">
              <h2
                className="font-heading font-bold text-petrol leading-[1.05] mt-6 mb-2"
                style={{ fontSize: 'clamp(24px, 3vw, 34px)', letterSpacing: '-0.03em' }}
              >
                Bijlage A · Verwerkersovereenkomst<span className="text-flame">.</span>
              </h2>
              <p className="text-[15px] md:text-[16px] leading-[1.65] text-muted mb-2">
                Dit is de verwerkersovereenkomst zoals bedoeld in artikel 28 lid 3 AVG. Hij hoort bij
                deze voorwaarden en geldt zodra je een account aanmaakt.
              </p>
              {bijlageA.map((a) => (
                <ArtikelBlok key={a.nr} artikel={a} />
              ))}
            </div>

            {/* Bijlage B */}
            <div id="bijlage-b" className="scroll-mt-28 pt-6 border-t-2 border-petrol">
              <h2
                className="font-heading font-bold text-petrol leading-[1.05] mt-6 mb-2"
                style={{ fontSize: 'clamp(24px, 3vw, 34px)', letterSpacing: '-0.03em' }}
              >
                Bijlage B · Sub-verwerkers<span className="text-flame">.</span>
              </h2>
              <p className="text-[15px] md:text-[16px] leading-[1.65] text-muted">
                Deze partijen verwerken gegevens namens ons om doen. te kunnen leveren. Voegen wij er
                een toe of vervangen wij er een, dan melden wij dat 30 dagen van tevoren.
              </p>

              <VerwerkerTabel titel="Partijen die wij inschakelen" rijen={subVerwerkers} />
              <VerwerkerTabel titel="Koppelingen die jij zelf aanzet" rijen={eigenKoppelingen} />

              <p className="mt-8 text-[15px] leading-[1.65] text-muted">
                Vragen over deze voorwaarden of over je gegevens? Stel ze via het{' '}
                <Link href="/contact" className="font-semibold text-petrol hover:text-flame transition-colors">
                  contactformulier
                </Link>
                . We reageren binnen vijf werkdagen.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
