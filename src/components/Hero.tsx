'use client';

import React from 'react';
import { useScrollAnimation } from './useScrollAnimation';

export const Hero: React.FC = () => {
  const ref = useScrollAnimation();

  return (
    <section ref={ref} className="relative pt-32 pb-20 lg:pt-44 lg:pb-32 bg-white overflow-hidden">
      {/* Subtle pastel accents */}
      <div className="absolute top-20 right-0 w-96 h-96 bg-blush-light rounded-full blur-3xl opacity-40" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-sage-light rounded-full blur-3xl opacity-40" />
      <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-mist-light rounded-full blur-3xl opacity-30" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Tagline */}
          <p className="fade-up text-sm font-semibold tracking-widest uppercase text-gray-400 mb-6">
            Door creatievelingen, voor creatievelingen
          </p>

          {/* Main Heading */}
          <h1 className="fade-up stagger-1 text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 leading-[1.08] tracking-tight mb-8">
            Je hele bedrijf.
            <br />
            <span className="text-gray-400">Eén app.</span>
            <br />
            <span className="relative inline-block">
              <span className="relative z-10">€49 per maand.</span>
              <span className="absolute bottom-2 left-0 w-full h-3 bg-cream opacity-60 -z-0 rounded" />
            </span>
          </h1>

          {/* Sub copy */}
          <p className="fade-up stagger-2 text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Offertes, projecten, werkbonnen, facturatie en CRM — alles wat je nodig hebt om je
            creatieve bedrijf te runnen. Zonder gedoe.
          </p>

          {/* CTA Buttons */}
          <div className="fade-up stagger-3 flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#pricing"
              className="inline-flex items-center justify-center bg-gray-900 hover:bg-gray-800 text-white font-semibold px-8 py-4 rounded-full transition-colors text-base"
            >
              Start gratis proefperiode
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
            <a
              href="#features"
              className="inline-flex items-center justify-center bg-white hover:bg-gray-50 text-gray-700 font-semibold px-8 py-4 rounded-full transition-colors text-base border border-gray-200"
            >
              Bekijk features
            </a>
          </div>

          {/* Trust badges */}
          <div className="fade-up stagger-4 mt-14 flex flex-wrap justify-center gap-8 text-sm text-gray-400">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Geen creditcard nodig
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              14 dagen gratis
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Direct aan de slag
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
