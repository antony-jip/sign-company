'use client';

import React from 'react';
import { useScrollAnimation } from './useScrollAnimation';

const included = [
  'Onbeperkt offertes & facturen',
  'Projectbeheer met tijdregistratie',
  'Digitale werkbonnen',
  'CRM met contacthistorie',
  'E-mail integratie',
  'Productcatalogus & prijslijsten',
  'Rapportages & dashboards',
  'Onbeperkt gebruikers',
  'Nederlandse support',
  'Automatische back-ups',
  'Mobiel toegankelijk',
  'Maandelijks opzegbaar',
];

export const Pricing: React.FC = () => {
  const ref = useScrollAnimation();

  return (
    <section id="pricing" ref={ref} className="py-20 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="fade-up text-sm font-semibold tracking-widest uppercase text-gray-400 mb-4">
            Eén prijs, alles inbegrepen
          </p>
          <h2 className="fade-up stagger-1 text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
            Simpel. Eerlijk. Compleet.
          </h2>
        </div>

        <div className="fade-up stagger-2 max-w-lg mx-auto">
          <div className="rounded-3xl border-2 border-gray-900 p-10 relative">
            {/* Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="bg-gray-900 text-white text-sm font-semibold px-5 py-1.5 rounded-full">
                Alles inbegrepen
              </span>
            </div>

            {/* Price */}
            <div className="text-center mb-8 pt-2">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-6xl font-extrabold text-gray-900">€49</span>
                <span className="text-xl text-gray-400 font-medium">/ maand</span>
              </div>
              <p className="text-gray-500 mt-2">excl. BTW — maandelijks opzegbaar</p>
            </div>

            {/* Feature list */}
            <ul className="space-y-3 mb-10">
              {included.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-sage-deep mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <a
              href="#contact"
              className="block w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-4 rounded-full text-center transition-colors text-base"
            >
              Start 14 dagen gratis
            </a>
            <p className="text-center text-sm text-gray-400 mt-4">
              Geen creditcard nodig — direct aan de slag
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
