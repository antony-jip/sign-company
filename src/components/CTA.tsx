'use client';

import React from 'react';
import { useScrollAnimation } from './useScrollAnimation';

export const CTASection: React.FC = () => {
  const ref = useScrollAnimation();

  return (
    <section id="contact" ref={ref} className="bg-[#0A0A0A] text-white py-20 lg:py-32">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="fade-up text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-6">
          Klaar om te smeden?
        </h2>
        <p className="fade-up stagger-1 text-lg text-gray-400 max-w-xl mx-auto mb-10">
          30 dagen gratis proberen. Geen creditcard nodig. Geen verplichtingen.
        </p>

        <div className="fade-up stagger-2 flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="#pricing"
            className="inline-flex items-center justify-center bg-white hover:bg-gray-100 text-gray-900 font-bold px-10 py-5 rounded-[14px] transition-colors text-[17px]"
          >
            Start 30 dagen gratis
            <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
          <a
            href="https://wa.me/31612345678"
            className="inline-flex items-center justify-center bg-transparent hover:bg-white/10 text-white font-semibold px-8 py-4 rounded-[14px] transition-colors text-base border border-white/20"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
            Stel een vraag
          </a>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
