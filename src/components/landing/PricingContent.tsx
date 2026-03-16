'use client';

import { useInView } from '@/hooks/useInView';
import { Button } from '@/components/ui/Button';
import AnimatedCounter from '@/components/landing/AnimatedCounter';

export default function PricingContent() {
  const { ref: heroRef, isInView: heroVisible } = useInView();
  const { ref: cardsRef, isInView: cardsVisible } = useInView();
  const { ref: saveRef, isInView: saveVisible } = useInView();
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
          <h1
            className="font-heading text-ink mb-5"
            style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 900, letterSpacing: '-3px', lineHeight: 0.95 }}
          >
            Twee plannen. Geen verrassingen.
          </h1>
          <p className="text-[19px] leading-[1.7] text-ink-60 max-w-[520px] mx-auto">
            Alles inbegrepen bij beide plannen. Geen verborgen kosten, geen extra modules.
          </p>
        </div>
      </section>

      {/* Two pricing cards */}
      <section style={{ paddingTop: 40, paddingBottom: 80 }}>
        <div className="container max-w-[900px]">
          <div
            ref={cardsRef}
            className="grid grid-cols-1 sm:grid-cols-2 gap-6"
            style={{
              opacity: cardsVisible ? 1 : 0,
              transform: cardsVisible ? 'translateY(0)' : 'translateY(32px)',
              transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s',
            }}
          >
            {/* Starter */}
            <div className="rounded-[20px] border border-ink-10 bg-white" style={{ padding: 48 }}>
              <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-ink-40 mb-5">Starter</p>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="font-heading text-ink font-black tracking-tight" style={{ fontSize: 'clamp(48px, 7vw, 72px)', lineHeight: 1, letterSpacing: '-3px' }}>
                  &euro;<AnimatedCounter target={49} className="font-heading" duration={1200} />
                </span>
                <span className="text-ink-40 text-[18px] font-medium">/maand</span>
              </div>
              <p className="text-[17px] text-ink-60 mb-8">Tot 3 gebruikers</p>

              <p className="text-[15px] leading-[1.8] text-ink-40 mb-10">
                Offertes met marge-inzicht, werkbonnen op locatie, facturen met betaallinks, klantportaal, planning, e-mail, PDF &amp; UBL-export, AI-assistent Forgie. Alles zit erin.
              </p>

              <Button variant="soft" size="lg" href="https://app.forgedesk.io" className="w-full justify-center">
                Probeer 30 dagen gratis &rarr;
              </Button>
            </div>

            {/* Team */}
            <div className="rounded-[20px] border-2 border-ink bg-white relative" style={{ padding: 48 }}>
              <span className="absolute -top-3 left-8 bg-ink text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                Populair
              </span>
              <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-ink-40 mb-5">Team</p>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="font-heading text-ink font-black tracking-tight" style={{ fontSize: 'clamp(48px, 7vw, 72px)', lineHeight: 1, letterSpacing: '-3px' }}>
                  &euro;<AnimatedCounter target={69} className="font-heading" duration={1200} />
                </span>
                <span className="text-ink-40 text-[18px] font-medium">/maand</span>
              </div>
              <p className="text-[17px] text-ink-60 mb-8">Onbeperkt gebruikers</p>

              <p className="text-[15px] leading-[1.8] text-ink-40 mb-10">
                Dezelfde volledige toolkit — maar zonder limiet op het aantal gebruikers. Ideaal voor groeiende teams.
              </p>

              <Button variant="ink" size="lg" href="https://app.forgedesk.io" className="w-full justify-center">
                Probeer 30 dagen gratis &rarr;
              </Button>
            </div>
          </div>
          <p className="text-[13px] text-ink-40 text-center mt-8">
            Geen creditcard nodig &middot; Direct aan de slag &middot; Maandelijks opzegbaar
          </p>
        </div>
      </section>

      {/* Savings vs James PRO */}
      <section className="border-t border-ink-10" style={{ paddingTop: 80, paddingBottom: 80 }}>
        <div
          ref={saveRef}
          className="container max-w-[700px] text-center"
          style={{
            opacity: saveVisible ? 1 : 0,
            transform: saveVisible ? 'translateY(0)' : 'translateY(32px)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-ink-40 mb-4">
            Vergelijk
          </p>
          <p className="text-[17px] leading-[1.8] text-ink-60 mb-6">
            James PRO kost &euro;565/maand voor een team van 5. FORGEdesk Team kost &euro;69/maand voor onbeperkt gebruikers.
          </p>
          <p className="font-heading text-blush-vivid font-black tracking-tight mb-2" style={{ fontSize: 'clamp(40px, 6vw, 64px)', lineHeight: 1, letterSpacing: '-3px' }}>
            &euro;<AnimatedCounter target={5952} className="font-heading" duration={2000} formatNumber />
          </p>
          <p className="text-[15px] text-ink-40">
            besparing per jaar
          </p>
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
          <h2
            className="font-heading text-ink mb-12 text-center"
            style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 900, letterSpacing: '-1.5px' }}
          >
            Veelgestelde vragen
          </h2>
          <div className="space-y-8">
            {[
              {
                q: 'Wat is het verschil tussen Starter en Team?',
                a: 'Beide plannen bevatten exact dezelfde features. Het enige verschil is het aantal gebruikers: Starter tot 3, Team onbeperkt.',
              },
              {
                q: 'Kan ik later upgraden van Starter naar Team?',
                a: 'Ja, je kunt op elk moment upgraden. Je data en instellingen blijven gewoon behouden.',
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
                q: 'Hoe werkt het AI-tegoed?',
                a: 'Forgie, de chatbot, zit inbegrepen met \u20AC5 AI-tegoed per maand. De Sign Visualiser draait op AI-tokens die je apart bijkoopt. Zo betaal je alleen voor wat je gebruikt.',
              },
            ].map((item) => (
              <div key={item.q} className="border-b border-ink-05 pb-8">
                <h3 className="text-[16px] font-bold text-ink mb-2">{item.q}</h3>
                <p className="text-[15px] leading-[1.7] text-ink-60">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
