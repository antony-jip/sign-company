'use client';

import React from 'react';
import { useScrollAnimation } from './useScrollAnimation';

const testimonials = [
  {
    quote: 'Sinds we FORGEdesk gebruiken, zijn we 30% sneller met offertes. Klanten krijgen binnen een uur een professionele offerte in hun inbox.',
    name: 'Mark de Vries',
    role: 'Eigenaar, DeVries Signing',
    bg: 'bg-gradient-to-br from-blush-light/60 to-blush/20',
    border: 'border-blush/20',
    accent: 'text-blush-deep',
  },
  {
    quote: 'Forgie is echt een game-changer. Ik vraag gewoon om een offerte en hij maakt hem aan. Scheelt me uren per week.',
    name: 'Lisa Bakker',
    role: 'Directeur, Studio Bakker',
    bg: 'bg-gradient-to-br from-lavender-light/60 to-lavender/20',
    border: 'border-lavender/20',
    accent: 'text-lavender-deep',
  },
  {
    quote: 'De werkbonnen-functie is geweldig. Onze monteurs vullen alles in op locatie en het staat direct in het systeem.',
    name: 'Tom Hendriks',
    role: 'Projectleider, Hendriks Reclame',
    bg: 'bg-gradient-to-br from-sage-light/60 to-sage/20',
    border: 'border-sage/20',
    accent: 'text-sage-deep',
  },
];

export const Testimonials: React.FC = () => {
  const ref = useScrollAnimation();

  return (
    <section id="over-ons" ref={ref} className="py-20 lg:py-32 bg-pastel-mesh relative overflow-hidden">
      <div className="absolute top-20 left-10 w-48 h-48 bg-mist/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-64 h-64 bg-peach/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <div className="fade-up inline-flex items-center gap-2 bg-sage-light/60 text-sage-deep px-4 py-2 rounded-full text-sm font-semibold mb-6 border border-sage/30">
            Gebruikersverhalen
          </div>
          <h2 className="fade-up stagger-1 text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
            Wat gebruikers <span className="text-gradient-ai">zeggen</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, index) => (
            <div
              key={t.name}
              className={`fade-up stagger-${index + 1} ${t.bg} rounded-2xl p-8 border ${t.border} interactive-card`}
            >
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${t.bg} mb-4`}>
                <svg className={`w-5 h-5 ${t.accent}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </div>
              <p className="text-gray-700 leading-relaxed mb-6 text-base">&ldquo;{t.quote}&rdquo;</p>
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
