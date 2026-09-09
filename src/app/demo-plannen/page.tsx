import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { paginaMeta } from '@/lib/metadata'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import DemoVideo from '@/components/DemoVideo'
import ContactFormulier from '@/components/ContactFormulier'
import { OnboardingRegel } from '@/components/Onboarding'
import { RONDLEIDING_BERICHT } from '@/data/cta'
import { RONDLEIDING_ZEKERHEDEN } from '@/data/rondleiding'
import { PRICE_PER_MONTH } from '@/data/pricing'

/* Twee secties, meer niet. Wie hier komt wil een moment prikken, geen
   lang verhaal lezen; dit stond eerder op zeven secties en dat is voor een
   aanvraagpagina een muur. Boven staat alles wat je nodig hebt om te
   beslissen plus het formulier, samen op één scherm. Daaronder de film,
   voor wie eerst wil kijken.

   Wat eruit ging (staat in de historie als je het terug wilt): de foto van
   Antony en Jos, KlusDoorlopen met de twee appschermen, de agenda van het
   half uur, het bezwarenblok, "niet voor jou" en de prijsband. Die
   boodschappen staan elders al: /hoe-het-werkt, /prijzen en /over. */

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
        {/* ─── Eén scherm: waarom, van wie, en het formulier ─── */}
        <section className="lg:flex lg:min-h-[calc(100svh-72px)] lg:items-center">
          <div className="container-site w-full pt-24 pb-12 lg:pt-6 lg:pb-8">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_480px] lg:gap-16">
              <div>
                <h1
                  className="font-heading font-bold text-petrol leading-[1.0]"
                  style={{ fontSize: 'clamp(30px, 3.4vw, 44px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
                >
                  Een half uur<span className="text-flame">.</span> Jouw klus, ons scherm
                  <span className="text-flame">.</span>
                </h1>
                <p className="mt-4 max-w-xl tekst-lead text-muted">
                  Geen verkooppraatje en geen slides. We pakken een klus zoals jij ze draait en
                  laten hem van eerste mail tot betaalde factuur door doen. lopen. Jij onderbreekt
                  waar het bij jou anders gaat.
                </p>

                <div className="mt-6 flex items-center gap-3.5">
                  <Image
                    src="/images/maker/antony-portret.webp"
                    alt="Antony Bootsma"
                    width={48}
                    height={48}
                    className="h-[48px] w-[48px] rounded-full object-cover"
                  />
                  <p className="text-[15px] leading-[1.5] text-muted">
                    Je doet hem met <span className="font-semibold text-petrol">Antony Bootsma</span>,
                    die doen. zelf bouwde en er zelf op draait.
                  </p>
                </div>

                <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 border-t border-petrol/10 pt-5 sm:grid-cols-2">
                  {RONDLEIDING_ZEKERHEDEN.map((z) => (
                    <div key={z.label}>
                      <dt className="text-[15px] font-semibold text-petrol">
                        {z.label}
                        <span className="text-flame">.</span>
                      </dt>
                      <dd className="mt-0.5 text-[14px] leading-[1.5] text-muted">{z.note}</dd>
                    </div>
                  ))}
                </dl>

                <p className="mt-6 max-w-xl text-[14px] leading-[1.6] text-muted">
                  Wat het daarna kost weet je nu al: vanaf € {PRICE_PER_MONTH} per maand ex btw,
                  all-in en niet per gebruiker.{' '}
                  <Link
                    href="/prijzen"
                    className="font-semibold text-petrol underline decoration-flame decoration-2 underline-offset-4 transition-colors hover:text-flame"
                  >
                    Bekijk de prijzen
                  </Link>
                  . Liever meteen zelf klikken?{' '}
                  <a
                    href="https://app.doen.team/register"
                    className="font-semibold text-petrol underline decoration-flame decoration-2 underline-offset-4 transition-colors hover:text-flame"
                  >
                    Start gratis
                  </a>
                  , 30 dagen en geen creditcard.
                </p>
              </div>

              <div id="plannen" className="scroll-mt-24 rounded-[8px] border border-petrol/10 bg-white p-5 md:p-6">
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
                <OnboardingRegel className="mt-5" />
              </div>
            </div>
          </div>
        </section>

        {/* ─── De film, voor wie eerst wil kijken ─── */}
        <section id="film" className="scroll-mt-24 bg-white pt-14 md:pt-20 pb-14 md:pb-20 border-t border-petrol/10">
          <div className="container-site">
            <div className="items-end md:grid md:grid-cols-12 md:gap-10">
              <h2
                className="mb-4 font-heading font-bold leading-[1.02] text-petrol md:col-span-7 md:mb-0"
                style={{ fontSize: 'clamp(28px, 3.6vw, 44px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
              >
                Zo ziet het eruit<span className="text-flame">.</span> Twee minuten
                <span className="text-flame">.</span>
              </h2>
              <p className="text-[16px] leading-[1.6] text-muted md:col-span-5 md:text-[17px]">
                Dezelfde route als in de rondleiding, alleen met onze klus in plaats van die van
                jou. Wil je hem liever met je eigen cijfers zien, plan dan het half uur.
              </p>
            </div>
          </div>

          <div className="mt-8 md:mt-12">
            <DemoVideo ctaHref="#plannen" ctaLabel="Plan de rondleiding" />
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
