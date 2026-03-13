'use client';

import React from 'react';
import Navbar from './landing/Navbar';
import LandingFooter from './landing/Footer';
import { useScrollAnimation } from './useScrollAnimation';

type ColorTheme = 'peach' | 'lavender' | 'mist' | 'cream' | 'sage' | 'blush';

interface FeatureHighlight {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface FeaturePageTemplateProps {
  color: ColorTheme;
  badge: string;
  title: string;
  titleHighlight: string;
  subtitle: string;
  highlights: FeatureHighlight[];
  demo: React.ReactNode;
  demoTitle: string;
  demoSubtitle: string;
}

const colorConfig: Record<ColorTheme, {
  badgeBg: string;
  badgeText: string;
  border: string;
  iconBg: string;
  iconText: string;
  accent: string;
  gradient: string;
}> = {
  peach: {
    badgeBg: 'bg-peach-light/60',
    badgeText: 'text-peach-deep',
    border: 'border-peach/30',
    iconBg: 'bg-peach-light',
    iconText: 'text-peach-deep',
    accent: 'text-peach-vivid',
    gradient: 'from-peach-light/30 via-white to-white',
  },
  lavender: {
    badgeBg: 'bg-lavender-light/60',
    badgeText: 'text-lavender-deep',
    border: 'border-lavender/30',
    iconBg: 'bg-lavender-light',
    iconText: 'text-lavender-deep',
    accent: 'text-lavender-vivid',
    gradient: 'from-lavender-light/30 via-white to-white',
  },
  mist: {
    badgeBg: 'bg-mist-light/60',
    badgeText: 'text-mist-deep',
    border: 'border-mist/30',
    iconBg: 'bg-mist-light',
    iconText: 'text-mist-deep',
    accent: 'text-mist-vivid',
    gradient: 'from-mist-light/30 via-white to-white',
  },
  cream: {
    badgeBg: 'bg-cream-light/60',
    badgeText: 'text-cream-deep',
    border: 'border-cream/30',
    iconBg: 'bg-cream-light',
    iconText: 'text-cream-deep',
    accent: 'text-cream-vivid',
    gradient: 'from-cream-light/30 via-white to-white',
  },
  sage: {
    badgeBg: 'bg-sage-light/60',
    badgeText: 'text-sage-deep',
    border: 'border-sage/30',
    iconBg: 'bg-sage-light',
    iconText: 'text-sage-deep',
    accent: 'text-sage-vivid',
    gradient: 'from-sage-light/30 via-white to-white',
  },
  blush: {
    badgeBg: 'bg-blush-light/60',
    badgeText: 'text-blush-deep',
    border: 'border-blush/30',
    iconBg: 'bg-blush-light',
    iconText: 'text-blush-deep',
    accent: 'text-blush-vivid',
    gradient: 'from-blush-light/30 via-white to-white',
  },
};

export const FeaturePageTemplate: React.FC<FeaturePageTemplateProps> = ({
  color,
  badge,
  title,
  titleHighlight,
  subtitle,
  highlights,
  demo,
  demoTitle,
  demoSubtitle,
}) => {
  const ref = useScrollAnimation();
  const c = colorConfig[color];

  return (
    <>
      <Navbar />
      <main ref={ref} className="pt-24">
        {/* Hero */}
        <section className={`bg-gradient-to-b ${c.gradient} py-16 lg:py-24`}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto">
              <div className={`fade-up inline-flex items-center gap-2 ${c.badgeBg} ${c.badgeText} px-4 py-2 rounded-full text-sm font-semibold mb-6 border ${c.border}`}>
                {badge}
              </div>
              <h1 className="fade-up stagger-1 text-4xl lg:text-6xl font-black tracking-tight mb-6">
                {title}{' '}
                <span className="text-gradient-pastel">{titleHighlight}</span>
              </h1>
              <p className="fade-up stagger-2 text-lg lg:text-xl text-gray-500 leading-relaxed">
                {subtitle}
              </p>
            </div>
          </div>
        </section>

        {/* Highlights */}
        <section className="py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {highlights.map((item, i) => (
                <div
                  key={i}
                  className={`fade-up stagger-${i + 1} bg-white rounded-2xl p-6 border ${c.border} shadow-sm hover:shadow-md transition-shadow`}
                >
                  <div className={`w-12 h-12 rounded-xl ${c.iconBg} flex items-center justify-center mb-4`}>
                    <div className={c.iconText}>{item.icon}</div>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Live Demo */}
        <section className="py-16 lg:py-24 bg-gradient-to-b from-white to-[#FAFAF7]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="fade-up text-3xl lg:text-4xl font-black tracking-tight mb-4">
                {demoTitle}
              </h2>
              <p className="fade-up stagger-1 text-gray-500 max-w-2xl mx-auto">
                {demoSubtitle}
              </p>
            </div>
            <div className="fade-up stagger-2 max-w-4xl mx-auto">
              {demo}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <h2 className="fade-up text-3xl lg:text-4xl font-black tracking-tight mb-4">
              Klaar om te beginnen?
            </h2>
            <p className="fade-up stagger-1 text-gray-500 mb-8 max-w-xl mx-auto">
              Probeer FORGEdesk 14 dagen gratis. Geen creditcard nodig.
            </p>
            <div className="fade-up stagger-2 flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://app.forgedesk.io/registreren"
                className="bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white font-bold px-8 py-4 rounded-2xl transition-all hover:scale-105 shadow-sm"
              >
                Gratis proberen
              </a>
              <a
                href="/"
                className="border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-bold px-8 py-4 rounded-2xl transition-all hover:scale-105"
              >
                Terug naar home
              </a>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </>
  );
};

export default FeaturePageTemplate;
