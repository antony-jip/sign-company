'use client';

import React from 'react';
import { useScrollAnimation } from './useScrollAnimation';

const features = [
  {
    title: 'Offertes',
    description: 'Maak professionele offertes in minuten. Met templates, automatische nummering en digitale ondertekening.',
    bg: 'bg-blush-light',
    iconColor: 'text-blush-deep',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    title: 'Projecten',
    description: 'Beheer al je projecten op één plek. Van intake tot oplevering, met tijdregistratie en voortgang.',
    bg: 'bg-sage-light',
    iconColor: 'text-sage-deep',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    title: 'Werkbonnen',
    description: 'Digitale werkbonnen die je team op locatie invult. Met foto\'s, handtekeningen en directe koppeling aan projecten.',
    bg: 'bg-mist-light',
    iconColor: 'text-mist-deep',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: 'Facturatie',
    description: 'Factureer direct vanuit je projecten. Automatische herinneringen, BTW-berekening en koppeling met je boekhouding.',
    bg: 'bg-cream-light',
    iconColor: 'text-cream-deep',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'CRM',
    description: 'Ken je klanten. Contacthistorie, notities, bijlagen en een compleet overzicht per relatie.',
    bg: 'bg-blush-light',
    iconColor: 'text-blush-deep',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    title: 'E-mail',
    description: 'Stuur en ontvang e-mails direct vanuit FORGEdesk. Alles gekoppeld aan de juiste klant en het juiste project.',
    bg: 'bg-sage-light',
    iconColor: 'text-sage-deep',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
];

export const Features: React.FC = () => {
  const ref = useScrollAnimation();

  return (
    <section id="features" ref={ref} className="py-20 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="fade-up text-sm font-semibold tracking-widest uppercase text-gray-400 mb-4">
            Alles in één platform
          </p>
          <h2 className="fade-up stagger-1 text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-6">
            Alles wat je nodig hebt.
            <br />
            <span className="text-gray-400">Niets wat je niet nodig hebt.</span>
          </h2>
          <p className="fade-up stagger-2 text-lg text-gray-500 max-w-2xl mx-auto">
            Zes krachtige modules die naadloos samenwerken. Gebouwd voor hoe creatieve bedrijven écht werken.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`fade-up stagger-${index + 1} group rounded-2xl border border-gray-100 p-8 hover:shadow-lg hover:border-gray-200 transition-all duration-300`}
            >
              <div className={`w-14 h-14 ${feature.bg} ${feature.iconColor} rounded-2xl flex items-center justify-center mb-5`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-500 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
