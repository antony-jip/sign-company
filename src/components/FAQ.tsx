'use client';

import React from 'react';
import { useScrollAnimation } from './useScrollAnimation';

const testimonials = [
  {
    quote: 'Sinds we FORGEdesk gebruiken, zijn we 30% sneller met offertes. Klanten krijgen binnen een uur een professionele offerte in hun inbox.',
    name: 'Mark de Vries',
    role: 'Eigenaar, DeVries Signing',
    bg: 'bg-blush/20',
  },
  {
    quote: 'Eindelijk software die snapt hoe een creatief bedrijf werkt. Geen overbodige functies, gewoon precies wat je nodig hebt.',
    name: 'Lisa Bakker',
    role: 'Directeur, Studio Bakker',
    bg: 'bg-sage/20',
  },
  {
    quote: 'De werkbonnen-functie is een game-changer. Onze monteurs vullen alles in op locatie en het staat direct in het systeem.',
    name: 'Tom Hendriks',
    role: 'Projectleider, Hendriks Reclame',
    bg: 'bg-mist/20',
  },
];

export const Testimonials: React.FC = () => {
  const ref = useScrollAnimation();

  return (
    <section ref={ref} className="py-20 lg:py-32 bg-[#F4F3F0]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="fade-up text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
            Wat gebruikers zeggen
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, index) => (
            <div
              key={t.name}
              className={`fade-up stagger-${index + 1} ${t.bg} rounded-2xl p-8`}
            >
              {/* Quote icon */}
              <svg className="w-8 h-8 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
              <p className="text-gray-700 leading-relaxed mb-6 text-base">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div>
                <p className="font-bold text-gray-900">{t.name}</p>
                <p className="text-sm text-[#6B6B6B]">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
