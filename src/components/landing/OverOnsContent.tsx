'use client';

import { useInView } from '@/hooks/useInView';
import { Button } from '@/components/ui/Button';

const values = [
  {
    title: 'Gebouwd voor de branche',
    description:
      'Geen generieke software. FORGEdesk is specifiek ontworpen voor signbedrijven, interieurbouwers en monteurs. Wij kennen de werkprocessen.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 20h20" />
        <path d="M5 20V8l7-5 7 5v12" />
        <path d="M9 20v-6h6v6" />
      </svg>
    ),
  },
  {
    title: 'Simpel. Geen training nodig',
    description:
      'Software moet voor je werken, niet andersom. Onze monteurs, kantoormanagers en eigenaren beginnen zonder handleiding.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="8 12 11 15 16 9" />
      </svg>
    ),
  },
  {
    title: 'Eerlijke prijs',
    description:
      '€49/maand voor je hele team. Geen kosten per gebruiker, geen verborgen modules, geen verrassingen op de factuur.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
  },
];

export default function OverOnsContent() {
  const { ref: heroRef, isInView: heroVisible } = useInView();
  const { ref: valuesRef, isInView: valuesVisible } = useInView();
  const { ref: storyRef, isInView: storyVisible } = useInView();
  const { ref: ctaRef, isInView: ctaVisible } = useInView();

  return (
    <>
      {/* Hero */}
      <section className="relative bg-mesh-hero overflow-hidden" style={{ paddingTop: 160, paddingBottom: 100 }}>
        <div
          ref={heroRef}
          className="container text-center max-w-[700px]"
          style={{
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'translateY(0)' : 'translateY(32px)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <p className="font-mono text-[12px] font-medium text-ink-40 uppercase tracking-[0.06em] mb-4">
            Over ons
          </p>
          <h1 className="font-heading section-heading text-ink mb-6">
            Software die begrijpt hoe jij werkt.
          </h1>
          <p className="text-[19px] leading-[1.7] text-ink-60 max-w-[540px] mx-auto">
            FORGEdesk is gebouwd door mensen die de signing- en montagebranches kennen. Geen Silicon Valley startup — gewoon Nederland.
          </p>
        </div>
      </section>

      {/* Values */}
      <section style={{ paddingTop: 100, paddingBottom: 100 }}>
        <div ref={valuesRef} className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {values.map((value, i) => (
              <div
                key={value.title}
                style={{
                  opacity: valuesVisible ? 1 : 0,
                  transform: valuesVisible ? 'translateY(0)' : 'translateY(32px)',
                  transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.12}s`,
                }}
              >
                <div className="w-12 h-12 rounded-xl bg-blush-light flex items-center justify-center text-blush-deep mb-5">
                  {value.icon}
                </div>
                <h3 className="font-heading text-[18px] font-bold text-ink mb-2">
                  {value.title}
                </h3>
                <p className="text-[15px] leading-[1.7] text-ink-60">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="border-t border-ink-10" style={{ paddingTop: 100, paddingBottom: 100 }}>
        <div
          ref={storyRef}
          className="container max-w-[640px]"
          style={{
            opacity: storyVisible ? 1 : 0,
            transform: storyVisible ? 'translateY(0)' : 'translateY(32px)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <h2 className="font-heading step-title text-ink mb-6">
            Waarom we dit bouwen
          </h2>
          <div className="space-y-5 text-[16px] leading-[1.7] text-ink-60">
            <p>
              Te veel signbedrijven werken nog met Excel, WhatsApp en papieren werkbonnen. Dat kost tijd, veroorzaakt fouten en maakt groei lastig.
            </p>
            <p>
              FORGEdesk verandert dat. Eén systeem voor alles: van offerte tot factuur, van kantoor tot busje. Met AI die helpt, niet in de weg zit.
            </p>
            <p>
              We bouwen software die aanvoelt als goed gereedschap — betrouwbaar, snel, en precies goed in de hand.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative bg-mesh-cta overflow-hidden" style={{ paddingTop: 120, paddingBottom: 120 }}>
        <div
          ref={ctaRef}
          className="container text-center"
          style={{
            opacity: ctaVisible ? 1 : 0,
            transform: ctaVisible ? 'translateY(0)' : 'translateY(32px)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <h2 className="font-heading section-heading text-ink mb-6">
            Klaar om te <span className="text-ember-gradient">smeden</span>?
          </h2>
          <p className="text-[19px] leading-[1.7] text-ink-60 mb-10 max-w-[480px] mx-auto">
            Start vandaag gratis. Geen creditcard, geen contract, geen gedoe.
          </p>
          <Button variant="ink" href="https://app.forgedesk.io">
            Start 30 dagen gratis &rarr;
          </Button>
        </div>
      </section>
    </>
  );
}
