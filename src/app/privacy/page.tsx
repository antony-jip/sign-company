import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { paginaMeta } from '@/lib/metadata'
import { privacyBlokken, PRIVACY_VERSIE, PRIVACY_DATUM } from '@/data/privacy'

export const metadata: Metadata = paginaMeta({
  title: 'Privacyverklaring | doen.',
  description:
    'Welke persoonsgegevens doen. verwerkt van websitebezoekers en accounthouders, waarom, hoe lang en met wie ze gedeeld worden. Geen cookies, geen trackers.',
  pad: '/privacy',
})

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <section className="bg-bg">
          <div className="container-site pt-28 md:pt-40 pb-10 md:pb-16">
            <h1
              className="font-heading font-bold text-petrol leading-[1.0] max-w-3xl mb-5"
              style={{ fontSize: 'clamp(34px, 5vw, 62px)', letterSpacing: '-0.035em', textWrap: 'balance' }}
            >
              Privacyverklaring<span className="text-flame">.</span>
            </h1>
            <p className="text-[16px] md:text-[18px] leading-[1.6] text-muted max-w-xl">
              Versie {PRIVACY_VERSIE}, geldig vanaf {PRIVACY_DATUM}. Wat wij van jou verwerken,
              waarom, en hoe lang.
            </p>

            <div className="mt-8 rounded-[10px] border border-petrol/10 bg-white p-5 md:p-6 max-w-2xl">
              <p className="text-[15px] leading-[1.6] text-ink">
                Gaat het over de gegevens die jij als klant in doen. zet, over jouw eigen klanten?
                Daarvoor zijn wij verwerker en niet verantwoordelijk voor de inhoud. Dat staat in{' '}
                <Link
                  href="/voorwaarden#bijlage-a"
                  className="font-semibold text-petrol hover:text-flame transition-colors"
                >
                  Bijlage A van de algemene voorwaarden
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="container-site py-12 md:py-20">
            <div className="max-w-3xl border-b border-petrol/10">
              {privacyBlokken.map((blok) => (
                <article key={blok.nr} className="border-t border-petrol/10 py-7 md:py-9">
                  <h2
                    className="font-heading text-[19px] md:text-[22px] font-bold text-petrol leading-tight mb-4"
                    style={{ letterSpacing: '-0.02em' }}
                  >
                    <span className="text-flame">{blok.nr}.</span> {blok.titel}
                  </h2>
                  <ol className="space-y-3">
                    {blok.leden.map((lid, i) => (
                      <li key={i} className="grid grid-cols-[28px_1fr] gap-x-2">
                        <span className="text-[13px] font-semibold text-muted pt-[3px] tabular-nums">
                          {blok.nr}.{i + 1}
                        </span>
                        <p className="text-[15px] md:text-[16px] leading-[1.65] text-ink">{lid}</p>
                      </li>
                    ))}
                  </ol>
                </article>
              ))}
            </div>

            <p className="max-w-3xl mt-8 text-[15px] leading-[1.65] text-muted">
              Vragen of een verzoek over je gegevens? Stel ze via het{' '}
              <Link href="/contact" className="font-semibold text-petrol hover:text-flame transition-colors">
                contactformulier
              </Link>
              . We reageren binnen vijf werkdagen.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
