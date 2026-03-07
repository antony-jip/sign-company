'use client';

import React from 'react';
import { useScrollAnimation } from './useScrollAnimation';

const testimonials = [
  {
    quote: 'Sinds we FORGEdesk gebruiken, zijn we 30% sneller met offertes. Klanten krijgen binnen een uur een professionele offerte in hun inbox.',
    name: 'Mark de Vries',
    role: 'Eigenaar, DeVries Signing',
    bg: 'bg-blush-light',
  },
  {
    quote: 'Eindelijk software die snapt hoe een creatief bedrijf werkt. Geen overbodige functies, gewoon precies wat je nodig hebt.',
    name: 'Lisa Bakker',
    role: 'Directeur, Studio Bakker',
    bg: 'bg-sage-light',
  },
  {
    quote: 'De werkbonnen-functie is een game-changer. Onze monteurs vullen alles in op locatie en het staat direct in het systeem.',
    name: 'Tom Hendriks',
    role: 'Projectleider, Hendriks Reclame',
    bg: 'bg-mist-light',
  },
];

export const Testimonials: React.FC = () => {
  const ref = useScrollAnimation();

  return (
    <section ref={ref} className="py-20 lg:py-32 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="fade-up text-sm font-semibold tracking-widest uppercase text-gray-400 mb-4">
            Wat gebruikers zeggen
          </p>
          <h2 className="fade-up stagger-1 text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
            Gemaakt met liefde. Gebruikt met plezier.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, index) => (
            <div
              key={t.name}
              className={`fade-up stagger-${index + 1} ${t.bg} rounded-2xl p-8`}
            >
              {/* Quote icon */}
              <svg className="w-8 h-8 text-gray-300 mb-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151C7.563 6.068 6 8.789 6 11h4v10H0z" />
              </svg>
              <p className="text-gray-700 leading-relaxed mb-6 text-base">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div>
                <p className="font-bold text-gray-900">{t.name}</p>
                <p className="text-sm text-gray-500">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
