'use client';

import React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CTASection } from '@/components/CTA';
import { useScrollAnimation } from '@/components/useScrollAnimation';

interface FeatureCard {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface FeaturePageTemplateProps {
  /* Theme color key from tailwind palette */
  colorKey: 'lavender' | 'sage' | 'mist' | 'blush' | 'cream' | 'peach';
  badge: string;
  headline: React.ReactNode;
  subtext: string;
  heroVisual?: React.ReactNode;
  demo: React.ReactNode;
  demoLabel?: string;
  features: FeatureCard[];
  useCases?: { title: string; description: string }[];
}

const colorMap = {
  lavender: {
    gradient: 'from-lavender-light/40 to-white',
    pill: 'bg-lavender-light text-lavender-deep',
    cardBorder: 'border-lavender/20',
    cardHover: 'hover:border-lavender/40',
    iconBg: 'bg-lavender-light',
    iconText: 'text-lavender-deep',
    accentGradient: 'from-lavender-vivid to-lavender-deep',
    blob1: 'bg-lavender/10',
    blob2: 'bg-lavender-vivid/8',
  },
  sage: {
    gradient: 'from-sage-light/40 to-white',
    pill: 'bg-sage-light text-sage-deep',
    cardBorder: 'border-sage/20',
    cardHover: 'hover:border-sage/40',
    iconBg: 'bg-sage-light',
    iconText: 'text-sage-deep',
    accentGradient: 'from-sage-vivid to-sage-deep',
    blob1: 'bg-sage/10',
    blob2: 'bg-sage-vivid/8',
  },
  mist: {
    gradient: 'from-mist-light/40 to-white',
    pill: 'bg-mist-light text-mist-deep',
    cardBorder: 'border-mist/20',
    cardHover: 'hover:border-mist/40',
    iconBg: 'bg-mist-light',
    iconText: 'text-mist-deep',
    accentGradient: 'from-mist-vivid to-mist-deep',
    blob1: 'bg-mist/10',
    blob2: 'bg-mist-vivid/8',
  },
  blush: {
    gradient: 'from-blush-light/40 to-white',
    pill: 'bg-blush-light text-blush-deep',
    cardBorder: 'border-blush/20',
    cardHover: 'hover:border-blush/40',
    iconBg: 'bg-blush-light',
    iconText: 'text-blush-deep',
    accentGradient: 'from-blush-vivid to-blush-deep',
    blob1: 'bg-blush/10',
    blob2: 'bg-blush-vivid/8',
  },
  cream: {
    gradient: 'from-cream-light/40 to-white',
    pill: 'bg-cream-light text-cream-deep',
    cardBorder: 'border-cream/20',
    cardHover: 'hover:border-cream/40',
    iconBg: 'bg-cream-light',
    iconText: 'text-cream-deep',
    accentGradient: 'from-cream-vivid to-cream-deep',
    blob1: 'bg-cream/10',
    blob2: 'bg-cream-vivid/8',
  },
  peach: {
    gradient: 'from-peach-light/40 to-white',
    pill: 'bg-peach-light text-peach-deep',
    cardBorder: 'border-peach/20',
    cardHover: 'hover:border-peach/40',
    iconBg: 'bg-peach-light',
    iconText: 'text-peach-deep',
    accentGradient: 'from-peach-vivid to-peach-deep',
    blob1: 'bg-peach/10',
    blob2: 'bg-peach-vivid/8',
  },
};

export const FeaturePageTemplate: React.FC<FeaturePageTemplateProps> = ({
  colorKey,
  badge,
  headline,
  subtext,
  heroVisual,
  demo,
  demoLabel,
  features,
  useCases,
}) => {
  const heroRef = useScrollAnimation();
  const demoRef = useScrollAnimation();
  const gridRef = useScrollAnimation();
  const useCaseRef = useScrollAnimation();
  const c = colorMap[colorKey];

  return (
    <>
      <Header />
      <main className="pt-20">
        {/* ─── Hero ─── */}
        <section ref={heroRef} className={`relative py-20 lg:py-32 bg-gradient-to-b ${c.gradient} overflow-hidden`}>
          <div className={`absolute top-20 -left-32 w-[500px] h-[500px] rounded-full blur-[120px] ${c.blob1} pointer-events-none`} />
          <div className={`absolute bottom-0 -right-20 w-[400px] h-[400px] rounded-full blur-[100px] ${c.blob2} pointer-events-none`} />

          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16">
              <div className="lg:w-1/2 mb-12 lg:mb-0">
                <span className={`fade-up pastel-pill ${c.pill} mb-6 inline-flex`}>{badge}</span>
                <h1 className="fade-up stagger-1 text-4xl md:text-5xl lg:text-[56px] font-black tracking-tight leading-[1.1] mb-6">
                  {headline}
                </h1>
                <p className="fade-up stagger-2 text-lg text-gray-500 leading-relaxed max-w-lg mb-8">
                  {subtext}
                </p>
                <div className="fade-up stagger-3 flex flex-col sm:flex-row gap-3">
                  <a
                    href="https://app.forgedesk.nl/registreren"
                    className="inline-flex items-center justify-center bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white font-bold px-8 py-4 rounded-2xl transition-all hover:scale-105 shadow-md text-[15px]"
                  >
                    Gratis proberen
                    <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </a>
                  <a
                    href="/#pricing"
                    className="inline-flex items-center justify-center bg-white hover:bg-gray-50 text-gray-700 font-semibold px-8 py-4 rounded-2xl transition-colors border border-gray-200 text-[15px]"
                  >
                    Bekijk pricing
                  </a>
                </div>
              </div>
              {heroVisual && (
                <div className="fade-up stagger-2 lg:w-1/2">
                  {heroVisual}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ─── Live Demo ─── */}
        <section ref={demoRef} className="py-20 lg:py-28 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            {demoLabel && (
              <div className="text-center mb-12">
                <h2 className="fade-up text-3xl md:text-4xl font-black tracking-tight mb-3">
                  {demoLabel}
                </h2>
                <p className="fade-up stagger-1 text-gray-400 text-base">Klik, typ en ontdek — dit werkt echt.</p>
              </div>
            )}
            <div className="fade-up stagger-2">
              {demo}
            </div>
          </div>
        </section>

        {/* ─── Feature Grid ─── */}
        <section ref={gridRef} className="py-20 lg:py-28 bg-gradient-to-b from-gray-50/80 to-white">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="fade-up text-3xl md:text-4xl font-black tracking-tight text-center mb-4">
              Alles wat je nodig hebt
            </h2>
            <p className="fade-up stagger-1 text-gray-400 text-center mb-14 max-w-lg mx-auto">
              Gebouwd voor creatieve bedrijven die sneller en slimmer willen werken.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((f, i) => (
                <div
                  key={f.title}
                  className={`fade-up stagger-${Math.min(i + 1, 6)} group bg-white rounded-2xl p-6 border ${c.cardBorder} ${c.cardHover} transition-all hover:shadow-lg hover:-translate-y-1`}
                >
                  <div className={`w-11 h-11 rounded-xl ${c.iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <div className={c.iconText}>{f.icon}</div>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Use Cases (optional) ─── */}
        {useCases && useCases.length > 0 && (
          <section ref={useCaseRef} className="py-20 lg:py-28 bg-white">
            <div className="max-w-5xl mx-auto px-6">
              <h2 className="fade-up text-3xl md:text-4xl font-black tracking-tight text-center mb-14">
                Hoe bedrijven dit gebruiken
              </h2>
              <div className="space-y-8">
                {useCases.map((uc, i) => (
                  <div key={uc.title} className={`fade-up stagger-${Math.min(i + 1, 6)} flex gap-6 items-start`}>
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${c.accentGradient} flex items-center justify-center flex-shrink-0 text-white font-bold text-sm`}>
                      {i + 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg mb-1">{uc.title}</h3>
                      <p className="text-gray-500 leading-relaxed">{uc.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── CTA ─── */}
        <CTASection />
      </main>
      <Footer />
    </>
  );
};
