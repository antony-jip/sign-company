'use client';

import { motion } from 'framer-motion';
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

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, damping: 25, stiffness: 120 },
  },
};

export default function StepsSection() {
  return (
    <section id="stappen" className="relative" style={{ paddingTop: 140, paddingBottom: 140 }}>
      <div className="container">
        {/* Section header */}
        <motion.div
          className="text-center mb-24"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
        >
          <h2 className="font-heading section-heading text-ink">
            Van project tot betaling. Zo werkt het.
          </h2>
          <p className="text-[19px] leading-[1.7] text-ink-60 mt-5 max-w-[500px] mx-auto">
            Drie stappen. Geen training nodig. Gewoon beginnen.
          </p>
        </motion.div>

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
