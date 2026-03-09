'use client';

import React from 'react';
import { useScrollAnimation } from './useScrollAnimation';

export const Pricing: React.FC = () => {
  const ref = useScrollAnimation();

  return (
    <section id="pricing" ref={ref} className="py-20 lg:py-32 bg-gradient-to-b from-white to-lavender-light/20 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-blush/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-sage/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <div className="fade-up inline-flex items-center gap-2 bg-peach-light/60 text-peach-deep px-4 py-2 rounded-full text-sm font-semibold mb-6 border border-peach/30">
          Simpele pricing
        </div>

        <div className="fade-up stagger-1 mb-4">
          <span className="text-[80px] lg:text-[120px] font-black tracking-tight text-gray-900 leading-none">&euro;49</span>
          <span className="text-[20px] lg:text-[24px] text-gray-400 ml-1">/maand</span>
        </div>

        <p className="fade-up stagger-2 text-lg lg:text-xl text-gray-500 mt-4 mb-10">
          Per bedrijf. Onbeperkt medewerkers. Alle features. Inclusief AI-tools.
        </p>

        <div className="fade-up stagger-3">
          <a
            href="#start"
            className="inline-flex items-center justify-center bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white font-bold px-12 py-5 rounded-2xl text-lg transition-all hover:scale-105 shadow-lg shadow-gray-900/20"
          >
            Start 30 dagen gratis
            <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>

        <p className="fade-up stagger-4 text-sm text-gray-400 mt-6">
          Geen creditcard &middot; Geen contract &middot; Opzeggen wanneer je wilt
        </p>

        {/* What's included */}
        <div className="fade-up stagger-5 mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
          {['Offertes & facturatie', 'Planning & werkbonnen', 'CRM & klantbeheer', 'AI-tools (Forgie)'].map((item, i) => {
            const colors = ['blush', 'sage', 'mist', 'lavender'];
            const bgColors = ['bg-blush-light/40', 'bg-sage-light/40', 'bg-mist-light/40', 'bg-lavender-light/40'];
            const textColors = ['text-blush-deep', 'text-sage-deep', 'text-mist-deep', 'text-lavender-deep'];
            return (
              <div key={item} className={`${bgColors[i]} rounded-xl p-3 text-center`}>
                <p className={`text-xs font-semibold ${textColors[i]}`}>{item}</p>
              </div>
            );
          })}
        </div>

        {/* Competitor comparison */}
        <div className="fade-up stagger-6 mt-16 pt-10 border-t border-lavender/20">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-400">
            <span>Teamleader &euro;37+/user</span>
            <span className="text-gray-300">&middot;</span>
            <span>Gripp &euro;153/3 users</span>
            <span className="text-gray-300">&middot;</span>
            <span>Simplicate &euro;140/5 users</span>
          </div>
          <p className="text-base font-bold text-gray-900 mt-3">
            FORGEdesk: <span className="text-gradient-pastel">&euro;49 totaal</span>
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
