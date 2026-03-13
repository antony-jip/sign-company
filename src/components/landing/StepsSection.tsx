'use client';

import { useInView } from '@/hooks/useInView';
import FlowLine from './FlowLine';
import Step from './Step';
import { OfferteCard, WerkbonCard, FactuurCard } from './StepCard';

const steps = [
  {
    number: 1,
    title: 'Maak een offerte',
    description: 'Stel professionele offertes op in minuten. Kies producten, pas prijzen aan en verstuur direct naar je klant.',
    accentColor: '#E8A990',
    align: 'left' as const,
    card: <OfferteCard />,
  },
  {
    number: 2,
    title: 'Plan het werk',
    description: 'Zet een akkoord automatisch om in werkbonnen. Plan taken, wijs medewerkers toe en houd de voortgang bij.',
    accentColor: '#A48BBF',
    align: 'right' as const,
    card: <WerkbonCard />,
  },
  {
    number: 3,
    title: 'Factureer en klaar',
    description: 'Genereer facturen vanuit je werkbonnen met één klik. Automatische BTW-berekening en betaalherinneringen.',
    accentColor: '#7DB88A',
    align: 'left' as const,
    card: <FactuurCard />,
  },
];

export default function StepsSection() {
  const { ref, isInView } = useInView();

  return (
    <section id="stappen" className="relative py-20 md:py-32">
      <div className="container">
        {/* Section header */}
        <div
          ref={ref}
          className="text-center mb-16 md:mb-24"
          style={{
            opacity: isInView ? 1 : 0,
            transform: isInView ? 'translateY(0)' : 'translateY(32px)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sage-light text-sage-deep mb-4">
            Hoe het werkt
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900">
            Van offerte tot factuur
          </h2>
          <p className="text-gray-500 text-lg mt-4 max-w-xl mx-auto">
            Drie stappen. Nul gedoe.
          </p>
        </div>

        {/* Steps with flow line */}
        <div className="relative">
          <FlowLine />
          {steps.map((step) => (
            <Step
              key={step.number}
              number={step.number}
              title={step.title}
              description={step.description}
              accentColor={step.accentColor}
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
