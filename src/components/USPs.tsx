'use client';

import React from 'react';
import { useScrollAnimation } from './useScrollAnimation';

const steps = [
  {
    number: '01',
    title: 'Account aanmaken',
    description: 'Maak je account aan in 30 seconden. Geen creditcard nodig, geen verplichtingen.',
    bg: 'bg-blush-light',
    accent: 'text-blush-deep',
  },
  {
    number: '02',
    title: 'Data importeren',
    description: 'Importeer je klanten, producten en prijslijsten. Of begin helemaal vers.',
    bg: 'bg-sage-light',
    accent: 'text-sage-deep',
  },
  {
    number: '03',
    title: 'Direct aan de slag',
    description: 'Maak je eerste offerte, start een project en ontdek hoe snel alles gaat.',
    bg: 'bg-mist-light',
    accent: 'text-mist-deep',
  },
];

export const HowItWorks: React.FC = () => {
  const ref = useScrollAnimation();

  return (
    <section id="over-ons" ref={ref} className="py-20 lg:py-32 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="fade-up text-sm font-semibold tracking-widest uppercase text-gray-400 mb-4">
            Zo simpel is het
          </p>
          <h2 className="fade-up stagger-1 text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
            In drie stappen live.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting line (desktop only) */}
          <div className="hidden md:block absolute top-7 left-[20%] right-[20%] h-0.5 bg-gray-200" />

          {steps.map((step, index) => (
            <div key={step.number} className={`fade-up stagger-${index + 1} text-center relative`}>
              <div className={`w-14 h-14 ${step.bg} ${step.accent} rounded-full flex items-center justify-center mx-auto mb-6 text-lg font-bold relative z-10`}>
                {step.number}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {step.title}
              </h3>
              <p className="text-gray-500 max-w-xs mx-auto leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
