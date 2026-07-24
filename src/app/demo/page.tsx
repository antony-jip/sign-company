import type { Metadata } from 'next'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CTASection from '@/components/home/CTASection'
import DemoVideo from '@/components/DemoVideo'
import JsonLd from '@/components/JsonLd'
import { softwareApplicationSchema } from '@/lib/structured-data'

export const metadata: Metadata = {
  title: 'Demo · één klus van mail tot betaling | doen.',
  description:
    'Bekijk in twee minuten hoe één klus door doen. loopt: aanvraag, project, offerte, drukproef, klantportaal, planning en factuur. Gebouwd voor signmakers.',
  alternates: { canonical: '/demo' },
}

/* Wat je in de video zag, scanbaar voor wie (nog) niet kijkt. */
const GEZIEN = [
  { title: 'Aanvraag wordt project', note: 'mail herkend, één klik en de klus staat' },
  { title: 'Offerte met marge en uren', note: 'inkoop, verkoop en winst lopen live mee' },
  { title: 'Drukproef met versies', note: 'je weet altijd wat er ligt' },
  { title: 'Klantportaal', note: 'de klant keurt zelf goed, geen mailtjes heen en weer' },
  { title: 'Montageplanning', note: 'sleep de klus in de week, de monteur ziet het' },
  { title: 'Factuur uit de offerte', note: 'gesynct met Exact, Moneybird of e-Boekhouden' },
]

const ZEKERHEDEN = ['30 dagen gratis', 'geen contract', 'in 10 minuten live']

export default function DemoPage() {
  return (
    <>
      <JsonLd data={softwareApplicationSchema} />
      <Navbar />
      <main id="main-content">
        <section className="pt-28 md:pt-36">
          <div className="container-site">
            <h1
              className="font-heading font-bold text-petrol leading-[1.0] max-w-4xl"
              style={{ fontSize: 'clamp(34px, 4.6vw, 60px)', letterSpacing: '-0.03em' }}
            >
              Eén klus, van eerste mail tot betaling<span className="text-flame">.</span>
            </h1>
            <p className="mt-4 text-[16px] md:text-[18px] text-muted max-w-2xl leading-[1.6]">
              Twee minuten. Je ziet de aanvraag binnenkomen, het project ontstaan,
              de offerte met marge en uren, de drukproef, het klantportaal, de montageplanning
              en de factuur die eruit rolt.
            </p>
          </div>

          {/* Full-bleed: de video pakt de hele paginabreedte en speelt direct (gedempt) */}
          <div className="mt-8 md:mt-12">
            <DemoVideo autoStart ctaHref="#aanmelden" />
          </div>
        </section>

        {/* De brug voor koud verkeer (outreach-mail): wie zit hierachter, plus een
            contactroute met lagere drempel dan meteen een account aanmaken. */}
        <section className="border-b border-petrol/10">
          <div className="container-site py-10 md:py-14">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6 md:gap-8 max-w-3xl">
              <Image
                src="/images/maker/founder.webp"
                alt="Antony Bootsma, maker van doen."
                width={112}
                height={149}
                className="rounded-[12px] object-cover w-[88px] h-[117px] md:w-[112px] md:h-[149px] flex-shrink-0"
              />
              <div>
                <h2 className="font-heading text-[20px] md:text-[22px] font-bold text-petrol">
                  Gebouwd in ons eigen signbedrijf<span className="text-flame">.</span>
                </h2>
                <p className="mt-2 text-[15px] md:text-[16px] text-muted leading-[1.6]">
                  Ik ben Antony Bootsma van Sign Company, familiebedrijf sinds 1983.
                  We werkten jaren met James Pro, maar liepen vast. Dus bouwde ik zelf
                  wat ik miste; wat je hierboven ziet is de software waar wij elke dag
                  mee draaien.
                </p>
                <p className="mt-3 text-[14px] md:text-[15px] text-muted">
                  Liever eerst even contact? Stel je vraag via{' '}
                  <a
                    href="/contact"
                    className="font-semibold text-petrol underline decoration-flame decoration-2 underline-offset-4 hover:text-flame transition-colors"
                  >
                    het contactformulier
                  </a>{' '}
                  of{' '}
                  <a
                    href="/over"
                    className="font-semibold text-petrol underline decoration-flame decoration-2 underline-offset-4 hover:text-flame transition-colors"
                  >
                    lees het hele verhaal
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Direct na de video: aanmelden zonder omwegen. E-mail hier, wachtwoord in de app. */}
        <section id="aanmelden" className="border-b border-petrol/10 scroll-mt-24">
          <div className="container-site py-12 md:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr,460px] gap-10 lg:gap-16 items-center">
              <div>
                <h2
                  className="font-heading font-bold text-petrol leading-[1.0]"
                  style={{ fontSize: 'clamp(28px, 3.6vw, 44px)', letterSpacing: '-0.03em' }}
                >
                  Vandaag nog aan de slag<span className="text-flame">.</span>
                </h2>
                <p className="mt-4 text-[15px] md:text-[16px] text-muted max-w-md leading-[1.6]">
                  Vul je e-mailadres in, kies in de app een wachtwoord en je staat live.
                  Geen creditcard nodig.
                </p>
                <ul className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
                  {ZEKERHEDEN.map((punt) => (
                    <li key={punt} className="flex items-center gap-2.5 text-[15px] md:text-[16px] font-semibold text-petrol">
                      <span aria-hidden className="text-flame">✓</span>
                      <span>
                        {punt}
                        <span className="text-flame">.</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Zelfde kaart als in de app: e-mail hier, de rest daar (Supabase blijft in de app) */}
              <form
                action="https://app.doen.team/register"
                method="get"
                className="rounded-[18px] bg-white border border-petrol/10 shadow-[0_1px_2px_rgba(20,40,40,0.04),0_24px_56px_-32px_rgba(13,52,60,0.35)] p-7 md:p-9"
              >
                <h3 className="font-heading text-[26px] md:text-[28px] font-bold text-petrol leading-none">
                  Aan de slag<span className="text-flame">.</span>
                </h3>
                <p className="mt-2.5 text-[14px] md:text-[15px] text-muted">
                  Maak een account. Kost je een minuut.
                </p>

                <label
                  htmlFor="demo-email"
                  className="mt-6 block text-[11px] font-semibold uppercase tracking-[0.1em] text-petrol/70"
                >
                  E-mailadres
                </label>
                <div className="mt-2 flex items-center gap-3 rounded-[12px] border border-petrol/20 bg-white px-4 h-[52px] focus-within:border-petrol transition-colors">
                  <span aria-hidden className="text-petrol/40 text-[15px]">✉</span>
                  <input
                    id="demo-email"
                    name="email"
                    type="email"
                    required
                    placeholder="naam@bedrijf.nl"
                    className="flex-1 bg-transparent text-[15px] text-petrol outline-none placeholder:text-petrol/35 min-w-0"
                  />
                </div>

                <button
                  type="submit"
                  className="group mt-5 w-full inline-flex items-center justify-center gap-2.5 text-[15px] font-semibold text-white bg-petrol h-[54px] rounded-full transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Aan de slag</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.5} />
                </button>
                <p className="mt-4 text-center text-[13px] text-muted">
                  Hierna kies je alleen nog een wachtwoord.
                </p>
                <p className="mt-1.5 text-center text-[12.5px] text-muted/80">
                  Door aan te melden ga je akkoord met onze voorwaarden.
                </p>
              </form>
            </div>
          </div>
        </section>

        {/* Wat je net zag, puntsgewijs */}
        <section className="py-14 md:py-24">
          <div className="container-site">
            <h2
              className="font-heading font-bold text-petrol leading-[1.0]"
              style={{ fontSize: 'clamp(28px, 3.6vw, 44px)', letterSpacing: '-0.03em' }}
            >
              Dit zag je net<span className="text-flame">.</span>
            </h2>
            <div className="mt-8 md:mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {GEZIEN.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[10px] border border-petrol/10 bg-white p-6 shadow-[0_1px_2px_rgba(20,40,40,0.04)]"
                >
                  <h3 className="font-heading text-[18px] md:text-[19px] font-bold text-petrol">
                    {item.title}
                    <span className="text-flame">.</span>
                  </h3>
                  <p className="mt-2 text-[14px] md:text-[15px] text-muted leading-[1.55]">{item.note}</p>
                </div>
              ))}
            </div>

            <p className="mt-10 md:mt-14 text-[16px] md:text-[18px] text-petrol font-semibold">
              € 129 per maand ex btw · per organisatie, niet per gebruiker ·{' '}
              <a href="/prijzen" className="underline decoration-flame decoration-2 underline-offset-4 hover:text-flame transition-colors">
                bekijk wat je krijgt
              </a>
            </p>
          </div>
        </section>

        <CTASection />
      </main>
      <Footer />
    </>
  )
}
