'use client';

import { useInView } from '@/hooks/useInView';
import FlowLine from './FlowLine';
import Step from './Step';
import { OfferteCard, WerkbonCard, FactuurCard } from './StepCard';

const steps = [
  {
    number: 1,
    title: 'Offerte met marge-inzicht.',
    description: 'Klant selecteren, regels toevoegen, marge automatisch berekend. Verstuur als PDF of deel een link. Je klant keurt direct goed.',
    phase: 'offerte' as const,
    align: 'left' as const,
    card: <OfferteCard />,
  },
  {
    number: 2,
    title: 'Werkbon op locatie invullen.',
    description: "Foto's, uren, materiaal. Alles op de telefoon. Geen papier meer. De kantoormanager ziet het direct.",
    phase: 'werkbon' as const,
    align: 'right' as const,
    card: <WerkbonCard />,
  },
  {
    number: 3,
    title: 'Factuur in één klik.',
    description: 'Automatisch vanuit de offerte. Betaallink voor je klant, UBL-export voor je boekhouder. Geld sneller binnen.',
    phase: 'factuur' as const,
    align: 'left' as const,
    card: <FactuurCard />,
  },
];

export default function StepsSection() {
  const { ref, isInView } = useInView();

  return (
    <section id="stappen" className="relative" style={{ paddingTop: 140, paddingBottom: 140 }}>
      <div className="container">
        {/* Section header */}
        <div
          ref={ref}
          className="text-center mb-24"
          style={{
            opacity: isInView ? 1 : 0,
            transform: isInView ? 'translateY(0)' : 'translateY(32px)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <h2 className="font-heading section-heading text-ink">
            Van project tot betaling. Zo werkt het.
          </h2>
          <p className="text-[19px] leading-[1.7] text-ink-60 mt-5 max-w-[500px] mx-auto">
            Drie stappen. Geen training nodig. Gewoon beginnen.
          </p>
        </div>

        {/* Steps + flow line */}
        <div className="relative">
          <FlowLine />
          {steps.map((step) => (
            <Step
              key={step.number}
              number={step.number}
              title={step.title}
              description={step.description}
              phase={step.phase}
              align={step.align}
            >
              {step.card}
            </Step>
          ))}
        </div>
      </div>
    </section>
  );
}
