'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ONBOARDING_OP_LOCATIE_PRIJS } from '@/data/onboarding'
import { RONDLEIDING_BERICHT, RONDLEIDING_HREF } from '@/data/cta'
import ContactFormulier from '@/components/ContactFormulier'

export default function ContactContent() {
  /* Oude mails en bookmarks komen hier nog binnen met ?over=rondleiding.
     Dan staat de vraag al in het bericht, zodat iemand alleen nog naam en
     mailadres invult. De CTA's op de site gaan tegenwoordig naar
     /rondleiding, waar het hele verhaal staat.

     Bewust via window.location en niet via useSearchParams: die hook dwingt
     een Suspense-grens af bij het statisch renderen van deze pagina, en dat
     is te veel machinerie voor één voorinvulling. */
  const [beginBericht, setBeginBericht] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('over') !== 'rondleiding') return
    setBeginBericht(RONDLEIDING_BERICHT)
  }, [])

  return (
    <div className="bg-bg">
      <section className="container-site pt-28 md:pt-44 pb-14 md:pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-20">
          {/* Links: intro + gegevens.
              Entree via CSS-keyframes (globals.css: .hero-line / .hero-fade). */}
          <div className="lg:col-span-2">
            <div>
              <h1
                className="font-heading font-bold text-petrol leading-[1.0] mb-6"
                style={{ fontSize: 'clamp(38px, 5vw, 64px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
              >
                <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
                  <span className="hero-line" style={{ animationDelay: '0.05s' }}>
                    Vraag stellen?
                  </span>
                </span>
                <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
                  <span className="hero-line text-muted" style={{ animationDelay: '0.15s' }}>
                    Gewoon doen<span className="text-flame">.</span>
                  </span>
                </span>
              </h1>
              <p className="hero-fade text-[16px] md:text-[17px] leading-[1.6] text-ink max-w-md mb-6 md:mb-10" style={{ animationDelay: '0.3s' }}>
                Nieuwsgierig, een idee, of wil je weten of doen. bij je past?
                Vertel wat je bezighoudt. We reageren binnen één werkdag. Wil je dat
                we doen. een keer met je doorlopen, zeg het erbij: online is dat gratis,
                en langskomen kan ook.
              </p>
            </div>

            <div className="hero-fade" style={{ animationDelay: '0.4s' }}>
              <dl>
                <div className="flex items-baseline justify-between gap-4 py-4 border-t border-petrol/10">
                  <dt className="text-[14px] text-muted shrink-0">Reactietijd</dt>
                  <dd className="text-[15px] font-semibold text-petrol">Binnen één werkdag</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 py-4 border-t border-petrol/10">
                  <dt className="text-[14px] text-muted shrink-0">Demo plannen</dt>
                  <dd>
                    <Link
                      href={RONDLEIDING_HREF}
                      className="text-[15px] font-semibold text-petrol hover:text-flame transition-colors"
                    >
                      Bekijk wat we in een half uur doorlopen
                    </Link>
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 py-4 border-t border-petrol/10">
                  <dt className="text-[14px] text-muted shrink-0">Onboarding online</dt>
                  <dd className="text-[15px] font-semibold text-petrol">Gratis, ongeveer een uur</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 py-4 border-t border-b border-petrol/10">
                  <dt className="text-[14px] text-muted shrink-0">Wij komen langs</dt>
                  <dd className="text-[15px] font-semibold text-petrol">
                    € {ONBOARDING_OP_LOCATIE_PRIJS} ex btw, plus reiskosten
                  </dd>
                </div>
              </dl>
            </div>

            {/* Liever direct beginnen */}
            <div className="hero-fade" style={{ animationDelay: '0.5s' }}>
              <div className="relative overflow-hidden rounded-[8px] bg-petrol-deep p-7 md:p-8 mt-8 md:mt-10">
                <div
                  aria-hidden
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(ellipse 90% 100% at 90% 0%, rgba(42,111,122,0.5) 0%, rgba(42,111,122,0) 65%)',
                  }}
                />
                <p
                  className="relative font-heading font-bold text-white leading-[1.05] mb-2"
                  style={{ fontSize: 'clamp(24px, 2.6vw, 30px)', letterSpacing: '-0.03em' }}
                >
                  Liever direct beginnen<span className="text-flame">?</span>
                </p>
                <p className="relative text-[14px] leading-[1.55] mb-6" style={{ color: 'rgba(226,240,241,0.82)' }}>
                  Maak een account en zet je eerste offerte vandaag de deur uit.
                </p>
                <a
                  href="https://app.doen.team/register"
                  className="relative group inline-flex items-center gap-2.5 text-[15px] font-semibold text-white bg-flame px-7 h-[54px] rounded-[6px] transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Start gratis</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.5} />
                </a>
                <p className="relative text-[13px] mt-5" style={{ color: 'rgba(226,240,241,0.55)' }}>
                  30 dagen gratis · geen creditcard · maandelijks opzegbaar
                </p>
              </div>
            </div>
          </div>

          {/* Rechts: formulier */}
          <div id="contact-formulier" className="hero-fade lg:col-span-3 scroll-mt-28" style={{ animationDelay: '0.35s' }}>
            <div className="bg-white rounded-[8px] border border-petrol/10 p-6 md:p-12">
              {/* key: pas als de voorinvulling binnen is remount het formulier
                  één keer, zodat het bericht al ingevuld staat. */}
              <ContactFormulier
                key={beginBericht ? 'rondleiding' : 'leeg'}
                titel="Stuur een bericht"
                beginBericht={beginBericht}
              />
            </div>
          </div>
        </div>

        {/* Wayfinding: op mobiel verborgen, dezelfde links staan in de footer */}
        <div className="hero-fade hidden md:block" style={{ animationDelay: '0.5s' }}>
          <div className="mt-20 pt-10 text-center border-t border-petrol/10">
            <p className="text-[14px] text-muted mb-4">Of ontdek eerst meer</p>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {[
                { href: '/hoe-het-werkt', label: 'Hoe het werkt' },
                { href: '/features', label: 'Alle modules' },
                { href: '/prijzen', label: 'Prijzen' },
                { href: '/over', label: 'Ons verhaal' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group inline-flex items-center gap-1.5 text-[15px] font-semibold text-ink"
                >
                  <span className="relative">
                    {link.label}
                    <span className="absolute left-0 -bottom-1 h-px w-full origin-left transition-transform duration-300 group-hover:scale-x-0 bg-ink/30" />
                  </span>
                  <span aria-hidden className="text-flame transition-transform duration-300 group-hover:translate-x-1">→</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
