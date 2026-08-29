import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { paginaMeta } from '@/lib/metadata'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import DemoVideo from '@/components/DemoVideo'
import ContactFormulier from '@/components/ContactFormulier'
import { OnboardingRegel } from '@/components/Onboarding'
import { RONDLEIDING_BERICHT } from '@/data/cta'
import {
  RONDLEIDING_AGENDA,
  RONDLEIDING_DUUR,
  RONDLEIDING_OPBRENGST,
  RONDLEIDING_ZEKERHEDEN,
} from '@/data/rondleiding'

export const metadata: Metadata = paginaMeta({
  title: 'Plan een rondleiding · een half uur, jouw klus | doen.',
  description:
    'Dertig minuten met de maker. We lopen één klus door: aanvraag, offerte met marge, drukproef, klantportaal, planning en factuur. Gratis, vrijblijvend, geen accountmanager.',
  pad: '/demo-plannen',
})

export default function DemoPlannenPage() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        {/* ─── Hero: wat het is, in één adem ─── */}
        <section className="pt-28 md:pt-36 pb-12 md:pb-20">
          <div className="container-site">
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-flame mb-5">
              Rondleiding
            </p>
            <h1
              className="font-heading font-bold text-petrol leading-[1.0] max-w-4xl"
              style={{ fontSize: 'clamp(34px, 4.6vw, 60px)', letterSpacing: '-0.03em' }}
            >
              Een half uur. Jouw klus, ons scherm<span className="text-flame">.</span>
            </h1>
            <p className="mt-5 text-[16px] md:text-[19px] text-muted max-w-2xl leading-[1.6]">
              Geen verkooppraatje en geen slides. We pakken een klus zoals jij ze draait
              en laten hem van eerste mail tot betaalde factuur door doen. lopen. Jij
              onderbreekt waar het bij jou anders gaat.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <a
                href="#plannen"
                className="group inline-flex items-center gap-2.5 text-[15px] font-semibold text-white px-7 h-[54px] rounded-[6px] bg-flame transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Plan de rondleiding</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.5} />
              </a>
              <a href="#film" className="group inline-flex items-center gap-2 text-[15px] font-semibold text-petrol">
                <span className="relative">
                  Liever eerst de film van 2 minuten
                  <span className="absolute left-0 -bottom-1 h-px w-full origin-left transition-transform duration-300 group-hover:scale-x-0 bg-petrol/30" />
                </span>
                <span aria-hidden className="text-flame transition-transform duration-300 group-hover:translate-x-1">→</span>
              </a>
            </div>

            {/* De vier bezwaren die een eigenaar meteen heeft, meteen weg */}
            <dl className="mt-10 md:mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6 border-t border-petrol/10 pt-8">
              {RONDLEIDING_ZEKERHEDEN.map((z) => (
                <div key={z.label}>
                  <dt className="text-[16px] font-semibold text-petrol">
                    {z.label}
                    <span className="text-flame">.</span>
                  </dt>
                  <dd className="mt-1 text-[14px] leading-[1.55] text-muted">{z.note}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ─── Met wie zit je aan tafel ─── */}
        <section className="bg-white border-y border-petrol/10">
          <div className="container-site py-14 md:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-10 lg:gap-20 items-center">
              <div>
                <div className="relative aspect-[4/5] w-full max-w-md overflow-hidden rounded-[8px]">
                  <Image
                    src="/images/maker/antony-en-jos.webp"
                    alt="Antony en Jos Bootsma bij de bus voor de werkplaats van Sign Company"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 40vw"
                  />
                </div>
                <p className="text-[14px] text-muted mt-4">
                  Antony en Jos Bootsma · Sign Company, sinds 1983
                </p>
              </div>

              <div>
                <h2
                  className="font-heading font-bold text-petrol leading-[1.02]"
                  style={{ fontSize: 'clamp(28px, 3.6vw, 44px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
                >
                  Met wie je de rondleiding doet<span className="text-flame">.</span>
                </h2>
                <p className="mt-5 text-[16px] md:text-[17px] leading-[1.65] text-ink max-w-xl">
                  Je krijgt geen accountmanager aan de lijn die het product uit zijn hoofd
                  heeft geleerd. Je spreekt de mensen die er zelf elke dag mee werken, in
                  hetzelfde vak als jij.
                </p>

                <div className="mt-8 space-y-6 max-w-xl">
                  <div className="border-l-2 border-flame pl-5">
                    <p className="text-[17px] font-semibold text-petrol">
                      Antony Bootsma<span className="text-flame">.</span>
                    </p>
                    <p className="mt-1.5 text-[15px] md:text-[16px] leading-[1.6] text-muted">
                      Bouwde doen. in de avonden, tussen de werkdagen door, omdat de
                      pakketten die er waren voor accountants leken gemaakt. Hij doet de
                      rondleiding en beantwoordt je vragen meteen, ook de lastige.
                    </p>
                  </div>
                  <div className="border-l-2 border-petrol/20 pl-5">
                    <p className="text-[17px] font-semibold text-petrol">
                      Jos Bootsma<span className="text-flame">.</span>
                    </p>
                    <p className="mt-1.5 text-[15px] md:text-[16px] leading-[1.6] text-muted">
                      Begon Sign Company in 1983 en staat nog steeds op de hoogwerker. Als
                      een planning of een werkbon niet deugt, hoort hij het als eerste. Wil
                      je iemand spreken die het werk zelf doet, dan schuift hij aan.
                    </p>
                  </div>
                </div>

                <p className="mt-8 text-[15px] leading-[1.6] text-muted max-w-xl">
                  Wij draaien er zelf op, in ons eigen signbedrijf.{' '}
                  <Link
                    href="/over"
                    className="font-semibold text-petrol underline decoration-flame decoration-2 underline-offset-4 hover:text-flame transition-colors"
                  >
                    Lees het hele verhaal
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── De film, voor wie eerst wil kijken ─── */}
        <section id="film" className="scroll-mt-24 pt-14 md:pt-24">
          <div className="container-site">
            <div className="md:grid md:grid-cols-12 md:gap-10 items-end">
              <h2
                className="md:col-span-7 font-heading font-bold text-petrol leading-[1.02] mb-4 md:mb-0"
                style={{ fontSize: 'clamp(28px, 3.6vw, 44px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
              >
                Zo ziet het eruit<span className="text-flame">.</span> Twee minuten
                <span className="text-flame">.</span>
              </h2>
              <p className="md:col-span-5 text-[16px] md:text-[17px] leading-[1.6] text-muted">
                Dezelfde route als in de rondleiding, alleen met onze klus in plaats van
                die van jou. Wil je hem liever met je eigen cijfers zien, plan dan het
                half uur.
              </p>
            </div>
          </div>

          <div className="mt-8 md:mt-12">
            <DemoVideo ctaHref="#plannen" ctaLabel="Plan de rondleiding" />
          </div>
        </section>

        {/* ─── Wat we doorlopen ─── */}
        <section className="py-14 md:py-24">
          <div className="container-site">
            <div className="md:grid md:grid-cols-12 md:gap-10 items-end mb-10 md:mb-14">
              <h2
                className="md:col-span-7 font-heading font-bold text-petrol leading-[1.02] mb-4 md:mb-0"
                style={{ fontSize: 'clamp(28px, 3.8vw, 48px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
              >
                Dit lopen we door<span className="text-flame">.</span>
              </h2>
              <p className="md:col-span-5 text-[16px] md:text-[17px] leading-[1.6] text-muted">
                Zes stappen, in de volgorde waarin een klus bij jou ook loopt. Samen{' '}
                {RONDLEIDING_DUUR}. Loopt het uit omdat jij ergens dieper in wilt, dan is
                dat geen probleem.
              </p>
            </div>

            <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 md:gap-y-12">
              {RONDLEIDING_AGENDA.map((punt, i) => (
                <li key={punt.titel} className="flex gap-5 md:gap-6">
                  <span
                    aria-hidden
                    className="font-heading font-bold text-flame leading-none shrink-0 w-[2.2ch] pt-0.5"
                    style={{ fontSize: 'clamp(26px, 2.6vw, 34px)', letterSpacing: '-0.03em' }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <h3 className="font-heading text-[19px] md:text-[21px] font-bold text-petrol">
                        {punt.titel}
                        <span className="text-flame">.</span>
                      </h3>
                      <span className="text-[13px] font-semibold text-muted">{punt.minuten}</span>
                    </div>
                    <p className="mt-2 text-[15px] md:text-[16px] leading-[1.6] text-muted">
                      {punt.tekst}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="mt-10 md:mt-14 text-[16px] md:text-[17px] text-petrol font-semibold max-w-2xl leading-[1.55]">
              En je vragen, op het moment dat ze opkomen. Niet opsparen tot het eind
              <span className="text-flame">.</span>
            </p>
          </div>
        </section>

        {/* ─── Wat het oplevert ─── */}
        <section className="bg-petrol-deep">
          <div className="container-site py-16 md:py-28">
            <h2
              className="font-heading font-bold text-white leading-[1.02] max-w-3xl"
              style={{ fontSize: 'clamp(28px, 3.8vw, 48px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
            >
              Wat je eraan overhoudt<span className="text-flame">.</span>
            </h2>
            <p className="mt-4 text-[16px] md:text-[18px] max-w-2xl leading-[1.6]" style={{ color: 'rgba(226,240,241,0.82)' }}>
              Ook als je niets afneemt, ga je er met meer uit dan je erin stopt.
            </p>

            <div className="mt-10 md:mt-16 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-9 md:gap-y-14">
              {RONDLEIDING_OPBRENGST.map((item) => (
                <div key={item.titel} className="border-t border-white/15 pt-5">
                  <h3
                    className="font-heading font-bold text-white leading-[1.15]"
                    style={{ fontSize: 'clamp(20px, 2.2vw, 26px)', letterSpacing: '-0.02em' }}
                  >
                    {item.titel}
                    <span className="text-flame">.</span>
                  </h3>
                  <p className="mt-3 text-[15px] md:text-[16px] leading-[1.6]" style={{ color: 'rgba(226,240,241,0.78)' }}>
                    {item.tekst}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Plannen ─── */}
        <section id="plannen" className="bg-white scroll-mt-24">
          <div className="container-site py-14 md:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr,520px] gap-10 lg:gap-16 items-start">
              <div>
                <h2
                  className="font-heading font-bold text-petrol leading-[1.0]"
                  style={{ fontSize: 'clamp(28px, 3.8vw, 48px)', letterSpacing: '-0.03em' }}
                >
                  Zeg wanneer het schikt<span className="text-flame">.</span>
                </h2>
                <p className="mt-4 text-[16px] md:text-[17px] text-muted max-w-md leading-[1.6]">
                  Laat je naam en een moment achter. We reageren binnen één werkdag met
                  een voorstel en een link. Verder heb je niets nodig: geen account, geen
                  creditcard, geen voorbereiding.
                </p>
                <OnboardingRegel className="mt-5 max-w-md" />

                <ul className="mt-8 space-y-3 max-w-md">
                  {[
                    'Online via scherm delen, of we komen langs',
                    'Neem gerust een offerte of een klus mee die je nu draait',
                    'Wil je met je hele ploeg kijken, geef dat door',
                  ].map((regel) => (
                    <li key={regel} className="flex items-start gap-3 text-[15px] md:text-[16px] text-ink leading-[1.55]">
                      <span aria-hidden className="text-flame font-semibold mt-[1px]">
                        ✓
                      </span>
                      <span>{regel}</span>
                    </li>
                  ))}
                </ul>

                <p className="mt-8 text-[15px] leading-[1.6] text-muted max-w-md">
                  Liever meteen zelf klikken?{' '}
                  <a
                    href="https://app.doen.team/register"
                    className="font-semibold text-petrol underline decoration-flame decoration-2 underline-offset-4 hover:text-flame transition-colors"
                  >
                    Start gratis
                  </a>{' '}
                  en zet vandaag je eerste offerte de deur uit. 30 dagen, geen creditcard.
                </p>
              </div>

              <div className="bg-bg rounded-[8px] border border-petrol/10 p-6 md:p-10">
                <ContactFormulier
                  titel="Plan de rondleiding"
                  knopLabel="Vraag de rondleiding aan"
                  berichtLabel="Waar wil je het over hebben"
                  berichtHint="mag leeg"
                  berichtVerplicht={false}
                  terugvalBericht={RONDLEIDING_BERICHT}
                  extra
                  idPrefix="rondleiding"
                  succesTitel="Aangevraagd"
                  succesTekst="We reageren binnen één werkdag met een voorstel voor een moment. Kijk voor de zekerheid ook in je spam-folder."
                />
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
