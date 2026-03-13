'use client';

import { useInView } from '@/hooks/useInView';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';

const sharedFeatures = [
  'Offertes, werkbonnen & facturen',
  'Projecten met marge-inzicht',
  'Klantportaal met goedkeurflow',
  'AI-assistent (Forgie)',
  'E-mail gekoppeld aan projecten',
  'Foto-uploads op werkbonnen',
  'PDF-export & UBL-export',
  'Betaallinks voor klanten',
  'Planning & agenda',
  'Geen opslaglimiet',
];

export default function PricingContent() {
  const { ref: heroRef, isInView: heroVisible } = useInView();
  const { ref: cardRef, isInView: cardVisible } = useInView();
  const { ref: faqRef, isInView: faqVisible } = useInView();
  const [activePlan, setActivePlan] = useState<'starter' | 'team'>('starter');

  return (
    <>
      {/* Hero */}
      <section className="relative bg-mesh-hero overflow-hidden" style={{ paddingTop: 160, paddingBottom: 80 }}>
        <div
          ref={heroRef}
          className="container text-center"
          style={{
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'translateY(0)' : 'translateY(32px)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <p className="font-mono text-[12px] font-medium text-ink-40 uppercase tracking-[0.06em] mb-4">
            Pricing
          </p>
          <h1 className="font-heading section-heading text-ink mb-5">
            Twee plannen. Alles erin.
          </h1>
          <p className="text-[19px] leading-[1.7] text-ink-60 max-w-[520px] mx-auto">
            Geen gedoe met tiers of verborgen kosten. Kies het plan dat bij je team past.
          </p>
        </div>
      </section>

      {/* Pricing cards */}
      <section style={{ paddingTop: 40, paddingBottom: 140 }}>
        <div className="container flex justify-center">
          <div
            ref={cardRef}
            className="w-full max-w-[800px] grid grid-cols-1 md:grid-cols-2 gap-6"
            style={{
              opacity: cardVisible ? 1 : 0,
              transform: cardVisible ? 'translateY(0) scale(1)' : 'translateY(32px) scale(0.96)',
              transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s',
            }}
          >
            {/* Starter plan */}
            <div
              className={`rounded-[20px] border bg-white cursor-pointer transition-all ${
                activePlan === 'starter' ? 'border-ink-20 shadow-xl scale-[1.02]' : 'border-ink-10'
              }`}
              style={{ padding: 32, boxShadow: activePlan === 'starter' ? '0 25px 50px -12px rgba(0,0,0,0.12)' : '0 25px 50px -12px rgba(0,0,0,0.05)' }}
              onClick={() => setActivePlan('starter')}
            >
              <div className="text-center mb-6">
                <p className="font-heading text-[15px] font-bold text-ink-60 uppercase tracking-wide mb-3">Starter</p>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="font-heading text-ink" style={{ fontSize: 'clamp(40px, 5vw, 56px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1 }}>
                    &euro;49
                  </span>
                  <span className="text-ink-40 text-[16px] font-medium">/maand</span>
                </div>
                <p className="text-[13px] text-ink-40">
                  Tot 3 gebruikers
                </p>
              </div>

              <ul className="space-y-2.5 mb-8">
                {sharedFeatures.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-[14px] text-ink-60">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
                      <circle cx="8" cy="8" r="8" fill="#E4EBE6" />
                      <polyline points="5 8 7 10.5 11 5.5" stroke="#5A8264" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <Button variant="ink" href="https://app.forgedesk.io" className="w-full justify-center">
                Start 30 dagen gratis &rarr;
              </Button>
            </div>

            {/* Team plan */}
            <div
              className={`rounded-[20px] border bg-white cursor-pointer transition-all relative ${
                activePlan === 'team' ? 'border-ink-20 shadow-xl scale-[1.02]' : 'border-ink-10'
              }`}
              style={{ padding: 32, boxShadow: activePlan === 'team' ? '0 25px 50px -12px rgba(0,0,0,0.12)' : '0 25px 50px -12px rgba(0,0,0,0.05)' }}
              onClick={() => setActivePlan('team')}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-ink text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Populair
                </span>
              </div>

              <div className="text-center mb-6">
                <p className="font-heading text-[15px] font-bold text-ink-60 uppercase tracking-wide mb-3">Team</p>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="font-heading text-ink" style={{ fontSize: 'clamp(40px, 5vw, 56px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1 }}>
                    &euro;69
                  </span>
                  <span className="text-ink-40 text-[16px] font-medium">/maand</span>
                </div>
                <p className="text-[13px] text-ink-40">
                  Onbeperkt gebruikers
                </p>
              </div>

              <ul className="space-y-2.5 mb-8">
                {sharedFeatures.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-[14px] text-ink-60">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
                      <circle cx="8" cy="8" r="8" fill="#E4EBE6" />
                      <polyline points="5 8 7 10.5 11 5.5" stroke="#5A8264" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <Button variant="ink" href="https://app.forgedesk.io" className="w-full justify-center">
                Start 30 dagen gratis &rarr;
              </Button>
            </div>
          </div>
        </div>

        <p className="text-center text-[13px] text-ink-40 mt-6">
          Geen creditcard nodig &middot; Direct aan de slag &middot; Maandelijks opzegbaar
        </p>
      </section>

      {/* FAQ */}
      <section className="border-t border-ink-10" style={{ paddingTop: 100, paddingBottom: 100 }}>
        <div
          ref={faqRef}
          className="container max-w-[700px]"
          style={{
            opacity: faqVisible ? 1 : 0,
            transform: faqVisible ? 'translateY(0)' : 'translateY(32px)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <h2 className="font-heading step-title text-ink mb-10 text-center">
            Veelgestelde vragen
          </h2>
          <div className="space-y-8">
            {[
              {
                q: 'Wat is het verschil tussen Starter en Team?',
                a: 'Dezelfde features. Starter is voor teams tot 3 personen, Team is onbeperkt. Groei je? Upgrade met één klik.',
              },
              {
                q: 'Kan ik mijn data importeren uit James, Gripp of Excel?',
                a: 'Ja. We helpen je met de overstap. Exporteer je data en importeer het direct in FORGEdesk.',
              },
              {
                q: 'Kan ik tussentijds opzeggen?',
                a: 'Ja, maandelijks opzegbaar. Geen contracten, geen boetes.',
              },
              {
                q: 'Wat gebeurt er na de proefperiode?',
                a: 'Na 30 dagen kies je zelf of je doorgaat. Geen automatische afschrijving.',
              },
              {
                q: 'Zijn er extra kosten voor opslag of modules?',
                a: 'Nee. Alles zit erin. Offertes, werkbonnen, facturen, AI, klantportaal, e-mail.',
              },
            ].map((item) => (
              <div key={item.q}>
                <h3 className="text-[16px] font-bold text-ink mb-1">{item.q}</h3>
                <p className="text-[15px] leading-[1.7] text-ink-60">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
