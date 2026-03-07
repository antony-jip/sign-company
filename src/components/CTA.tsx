'use client';

import React from 'react';
import { useScrollAnimation } from './useScrollAnimation';

export const CTASection: React.FC = () => {
  const ref = useScrollAnimation();

  return (
    <section id="contact" ref={ref} className="bg-gray-900 text-white py-20 lg:py-32">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <p className="fade-up text-sm font-semibold tracking-widest uppercase text-gray-500 mb-6">
          Klaar om te beginnen?
        </p>
        <h2 className="fade-up stagger-1 text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
          Start vandaag nog.
          <br />
          <span className="text-gray-500">Gratis.</span>
        </h2>
        <p className="fade-up stagger-2 text-lg text-gray-400 max-w-xl mx-auto mb-10">
          14 dagen gratis proberen. Geen creditcard nodig. Geen verplichtingen.
          Gewoon beginnen.
        </p>

        <div className="fade-up stagger-3 flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <a
            href="#pricing"
            className="inline-flex items-center justify-center bg-white hover:bg-gray-100 text-gray-900 font-semibold px-8 py-4 rounded-full transition-colors text-base"
          >
            Start gratis proefperiode
            <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
          <a
            href="https://wa.me/31612345678"
            className="inline-flex items-center justify-center bg-transparent hover:bg-white/10 text-white font-semibold px-8 py-4 rounded-full transition-colors text-base border border-white/20"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp ons
          </a>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
