'use client';

import React from 'react';
import { useScrollAnimation } from './useScrollAnimation';

export const Pricing: React.FC = () => {
  const ref = useScrollAnimation();

  return (
    <section id="pricing" ref={ref} className="py-20 lg:py-32 bg-white">
      <div className="max-w-4xl mx-auto px-6 text-center">
        {/* Price */}
        <div className="fade-up mb-4">
          <span className="text-[80px] lg:text-[120px] font-black tracking-tight text-gray-900 leading-none">&euro;49</span>
          <span className="text-[20px] lg:text-[24px] text-[#A0A0A0] ml-1">/maand</span>
        </div>

        <p className="fade-up stagger-1 text-lg lg:text-xl text-[#6B6B6B] mt-4 mb-10">
          Per bedrijf. Onbeperkt medewerkers. Alle features.
        </p>

        {/* CTA */}
        <div className="fade-up stagger-2">
          <a
            href="#contact"
            className="inline-flex items-center justify-center bg-[#0A0A0A] hover:bg-[#222] text-white font-bold px-12 py-5 rounded-[16px] text-lg transition-colors"
          >
            Start 30 dagen gratis
            <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>

        <p className="fade-up stagger-3 text-sm text-[#A0A0A0] mt-6">
          Geen creditcard &middot; Geen contract &middot; Opzeggen wanneer je wilt
        </p>

        {/* Competitor comparison */}
        <div className="fade-up stagger-4 mt-16 pt-10 border-t border-[#E8E6E0]">
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-[#A0A0A0]">
            <span>Teamleader &euro;37+/user</span>
            <span>&middot;</span>
            <span>Gripp &euro;153/3 users</span>
            <span>&middot;</span>
            <span>Simplicate &euro;140/5 users</span>
          </div>
          <p className="text-base font-bold text-gray-900 mt-3">
            FORGEdesk: &euro;49 totaal
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
