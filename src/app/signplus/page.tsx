import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { paginaMeta } from '@/lib/metadata'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { RONDLEIDING_HREF, RONDLEIDING_LABEL } from '@/data/cta'
import { PRICE_PER_MONTH } from '@/data/pricing'

/* Landingspagina bij het artikel in Sign+.

   Eigen pad in plaats van de homepage, om twee redenen. De lezer komt met een
   specifieke vraag ("wat is dat dan") en die verdient een specifiek antwoord,
   en achteraf is aan het verkeer op dit pad te zien of het artikel iets deed.

   De hoofdknop gaat bewust naar de demo en niet naar registreren. Vier van de
   vier zelf gestarte proefaccounts zijn verlopen zonder dat er iets mee is
   gedaan; een leeg account is voor een vakbladlezer geen kennismaking. */

export const metadata: Metadata = paginaMeta({
  title: 'Gelezen in Sign+ · doen.',
  description:
    'De software die we naast ons eigen signbedrijf hebben gebouwd. Kijk zelf rond in een ingerichte demo, zonder account.',
  pad: '/signplus',
})

const DEMO_URL = 'https://app.doen.team/demo'

const CIJFERS = [
  { getal: '320', wat: 'projecten' },
  { getal: '255', wat: 'offertes' },
  { getal: '197', wat: 'facturen' },
  { getal: '1.927', wat: 'klanten' },
]

const IN_DE_DEMO = [
  {
    kop: 'Een offerte met de marge per regel',
    tekst:
      'Gevelreclame voor een autobedrijf: doosletters, een lichtbak, montage met de hoogwerker. Inkoop, verkoop en marge staan per regel, dus je ziet wat de klus oplevert voordat je op versturen drukt.',
  },
  {
    kop: 'Het akkoord van de klant',
    tekst:
      'Diezelfde offerte is via het klantportaal goedgekeurd. Geen inlog voor de klant, wel zijn naam en de datum eronder.',
  },
  {
    kop: 'De werkbon die eruit rolt',
    tekst:
      'Twaalf uur, twee monteurs, foto\'s van de montage en een handtekening op de telefoon. Inclusief het meerwerk dat ter plekke is afgesproken, want dat is precies wat er anders bij inschiet.',
  },
  {
    kop: 'En de factuur',
    tekst:
      'Uit de werkbon naar de factuur, met de inkoopfactuur van de leverancier aan hetzelfde project gekoppeld.',
  },
]

export default function SignPlusPage() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        {/* ─── Hero ─── */}
        <section className="pt-28 md:pt-36 pb-14 md:pb-20">
          <div className="container-site">
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-flame mb-5">
              Je las het in Sign+
            </p>
            <h1
              className="font-heading font-bold text-petrol leading-[1.0] max-w-4xl"
              style={{ fontSize: 'clamp(34px, 4.6vw, 60px)', letterSpacing: '-0.03em' }}
            >
              Kijk zelf even rond<span className="text-flame">.</span>
            </h1>
            <p className="mt-5 text-[16px] md:text-[19px] text-muted max-w-2xl leading-[1.6]">
              doen. is de software die we naast ons eigen signbedrijf hebben gebouwd, omdat we
              vastliepen in wat er te koop was. Hieronder staat geen presentatie maar een
              ingerichte demo. Eén klus loopt er compleet doorheen, van aanvraag tot betaalde
              factuur.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row gap-3 sm:items-center">
              <a
                href={DEMO_URL}
                className="inline-flex items-center justify-center gap-2 bg-flame text-white font-semibold px-7 py-4 text-[16px] hover:brightness-95 transition"
              >
                Bekijk de demo
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <Link
                href={RONDLEIDING_HREF}
                className="inline-flex items-center justify-center px-7 py-4 text-[16px] font-semibold text-petrol border border-petrol/25 hover:border-petrol/50 transition"
              >
                {RONDLEIDING_LABEL}
              </Link>
            </div>
            <p className="mt-4 text-[14px] text-muted">
              Geen account, geen formulier. Je zit er binnen een seconde in.
            </p>
          </div>
        </section>

        {/* ─── Eigen gebruik als bewijs ─── */}
        <section className="py-14 md:py-20 bg-petrol text-white">
          <div className="container-site">
            <h2 className="font-heading font-bold text-[26px] md:text-[34px] leading-[1.06] tracking-[-0.03em] max-w-2xl">
              Wij draaien er zelf op<span className="text-flame">.</span>
            </h2>
            <p className="mt-4 text-[15px] md:text-[17px] text-white/75 max-w-2xl leading-[1.6]">
              Sign Company bestaat sinds 1983 en mijn vader doet de montage nog steeds. Wat er
              in doen. staat is geen demodatabase maar onze eigen administratie. Dit staat er
              vandaag in:
            </p>
            <dl className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6">
              {CIJFERS.map((c) => (
                <div key={c.wat}>
                  <dt className="font-heading font-bold text-[38px] md:text-[46px] leading-none tracking-[-0.04em] tabular-nums">
                    {c.getal}
                  </dt>
                  <dd className="mt-2 text-[14px] text-white/65">{c.wat}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ─── Wat je in de demo ziet ─── */}
        <section className="py-14 md:py-20">
          <div className="container-site">
            <h2 className="font-heading font-bold text-petrol text-[26px] md:text-[34px] leading-[1.06] tracking-[-0.03em] max-w-2xl">
              Wat er in de demo klaarstaat<span className="text-flame">.</span>
            </h2>
            <div className="mt-10 grid md:grid-cols-2 gap-x-12 gap-y-9">
              {IN_DE_DEMO.map((item) => (
                <div key={item.kop}>
                  <h3 className="font-heading font-bold text-petrol text-[18px] tracking-[-0.02em]">
                    {item.kop}
                  </h3>
                  <p className="mt-2 text-[15px] text-muted leading-[1.6]">{item.tekst}</p>
                </div>
              ))}
            </div>
            <p className="mt-10 text-[14px] text-muted max-w-2xl leading-[1.6]">
              Je mag er alles in aanpassen. Iedereen kijkt in dezelfde omgeving en die gaat elke
              nacht vanzelf terug naar de beginstand.
            </p>
          </div>
        </section>

        {/* ─── Prijs en de eerlijke stand ─── */}
        <section className="py-14 md:py-20 border-t border-petrol/10">
          <div className="container-site grid md:grid-cols-2 gap-12 md:gap-16">
            <div>
              <h2 className="font-heading font-bold text-petrol text-[24px] md:text-[30px] leading-[1.08] tracking-[-0.03em]">
                Wat het kost<span className="text-flame">.</span>
              </h2>
              <p className="mt-4 text-[15px] text-muted leading-[1.6]">
                <span className="font-heading font-bold text-petrol text-[30px] tracking-[-0.03em] tabular-nums">
                  &euro; {PRICE_PER_MONTH}
                </span>{' '}
                per maand exclusief btw, tot tien gebruikers, alle onderdelen inbegrepen. Geen
                pakketten, geen prijs per kop, maandelijks opzegbaar. Koppeling met Exact Online
                en Mollie zit erbij.
              </p>
              <Link
                href="/prijzen"
                className="mt-5 inline-flex items-center gap-2 text-[15px] font-semibold text-petrol hover:text-flame transition"
              >
                De hele staffel
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div>
              <h2 className="font-heading font-bold text-petrol text-[24px] md:text-[30px] leading-[1.08] tracking-[-0.03em]">
                En wat er nog niet af is<span className="text-flame">.</span>
              </h2>
              <p className="mt-4 text-[15px] text-muted leading-[1.6]">
                doen. is jong. Studio, waarmee je het eindresultaat vooraf laat zien, is nog
                beta. En het is gebouwd voor bedrijven met eigen productie, van een man of drie
                tot een stuk of vijfentwintig. Ben je alleen, dan is dit te veel systeem. Zit je
                ruim boven de vijfentwintig, dan heb je waarschijnlijk al iets.
              </p>
              <p className="mt-4 text-[15px] text-muted leading-[1.6]">
                Liever even bellen dan klikken? Dat mag ook.{' '}
                <a href="tel:+31629399326" className="font-semibold text-petrol hover:text-flame transition">
                  06 29 39 93 26
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* ─── Afsluiter ─── */}
        <section className="py-14 md:py-20 bg-petrol-deep text-white">
          <div className="container-site flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <div>
              <h2 className="font-heading font-bold text-[26px] md:text-[36px] leading-[1.04] tracking-[-0.03em] max-w-xl">
                Het is sneller bekeken dan uitgelegd<span className="text-flame">.</span>
              </h2>
              <p className="mt-4 text-[15px] text-white/70 max-w-xl leading-[1.6]">
                Antony Bootsma, Sign Company
              </p>
            </div>
            <a
              href={DEMO_URL}
              className="inline-flex items-center justify-center gap-2 bg-flame text-white font-semibold px-7 py-4 text-[16px] hover:brightness-95 transition flex-shrink-0"
            >
              Bekijk de demo
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
