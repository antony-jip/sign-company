'use client';

import { useInView } from '@/hooks/useInView';
import { Button } from '@/components/ui/Button';

const features = [
  'Onbeperkt gebruikers',
  'Offertes, werkbonnen & facturen',
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
            Eén plan. Alles erin.
          </h1>
          <p className="text-[19px] leading-[1.7] text-ink-60 max-w-[520px] mx-auto">
            Geen gedoe met tiers. Geen kosten per gebruiker. Gewoon alles, voor je hele team.
          </p>
        </div>
      </section>

      {/* Pricing card */}
      <section style={{ paddingTop: 40, paddingBottom: 140 }}>
        <div className="container flex justify-center">
          <div
            ref={cardRef}
            className="w-full max-w-[480px] rounded-[20px] border border-ink-10 bg-white"
            style={{
              padding: 40,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.08)',
              opacity: cardVisible ? 1 : 0,
              transform: cardVisible ? 'translateY(0) scale(1)' : 'translateY(32px) scale(0.96)',
              transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s',
            }}
          >
            {/* Price */}
            <div className="text-center mb-8">
              <div className="flex items-baseline justify-center gap-1 mb-2">
                <span className="font-heading text-ink" style={{ fontSize: 'clamp(44px, 5vw, 64px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1 }}>
                  &euro;49
                </span>
                <span className="text-ink-40 text-[16px] font-medium">/maand</span>
              </div>
              <p className="text-[13px] text-ink-40">
                Voor je hele team. Geen limiet op gebruikers.
              </p>
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-10">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-[15px] text-ink-60">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
                    <circle cx="8" cy="8" r="8" fill="#E4EBE6" />
                    <polyline points="5 8 7 10.5 11 5.5" stroke="#5A8264" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <Button variant="ink" href="https://app.forgedesk.io" className="w-full justify-center">
              Start 30 dagen gratis &rarr;
            </Button>

            <p className="text-center text-[13px] text-ink-40 mt-4">
              Geen creditcard nodig &middot; Direct aan de slag
            </p>
          </div>
        </div>
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
                q: 'Is het echt onbeperkt gebruikers?',
                a: 'Ja. Of je nu 2 of 20 mensen hebt — het is €49/maand, punt.',
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
                a: 'Nee. Alles zit erin: offertes, werkbonnen, facturen, AI, klantportaal, e-mail.',
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
