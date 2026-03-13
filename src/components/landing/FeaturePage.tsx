'use client';

import React from 'react';
import { useInView } from '@/hooks/useInView';
import { Button } from '@/components/ui/Button';
import Navbar from './Navbar';
import Footer from './Footer';

type ColorTheme = 'peach' | 'lavender' | 'mist' | 'cream' | 'sage' | 'blush';

interface Highlight {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface FeaturePageProps {
  color: ColorTheme;
  overline: string;
  heading: React.ReactNode;
  subtitle: string;
  highlights: Highlight[];
  demo: React.ReactNode;
  demoTitle: string;
  demoSubtitle: string;
}

const meshGradients: Record<ColorTheme, string> = {
  peach:
    'radial-gradient(ellipse at 20% 30%, rgba(250,232,224,0.6) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(245,213,200,0.4) 0%, transparent 45%), radial-gradient(ellipse at 50% 80%, rgba(247,236,231,0.5) 0%, transparent 50%), #FAFAF7',
  lavender:
    'radial-gradient(ellipse at 20% 30%, rgba(237,233,243,0.6) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(221,213,232,0.4) 0%, transparent 45%), radial-gradient(ellipse at 50% 80%, rgba(205,213,222,0.4) 0%, transparent 50%), #FAFAF7',
  mist:
    'radial-gradient(ellipse at 20% 30%, rgba(230,234,240,0.6) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(205,213,222,0.4) 0%, transparent 45%), radial-gradient(ellipse at 50% 80%, rgba(200,213,204,0.4) 0%, transparent 50%), #FAFAF7',
  cream:
    'radial-gradient(ellipse at 20% 30%, rgba(246,244,236,0.6) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(237,232,216,0.4) 0%, transparent 45%), radial-gradient(ellipse at 50% 80%, rgba(245,213,200,0.3) 0%, transparent 50%), #FAFAF7',
  sage:
    'radial-gradient(ellipse at 20% 30%, rgba(228,235,230,0.6) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(200,213,204,0.4) 0%, transparent 45%), radial-gradient(ellipse at 50% 80%, rgba(221,213,232,0.3) 0%, transparent 50%), #FAFAF7',
  blush:
    'radial-gradient(ellipse at 20% 30%, rgba(247,236,231,0.6) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(240,217,208,0.4) 0%, transparent 45%), radial-gradient(ellipse at 50% 80%, rgba(232,169,144,0.2) 0%, transparent 50%), #FAFAF7',
};

const colorStyles: Record<ColorTheme, { iconBg: string; iconText: string; pillBg: string; pillText: string }> = {
  peach:    { iconBg: 'bg-peach-light', iconText: 'text-peach-deep', pillBg: 'bg-peach-light/60', pillText: 'text-peach-deep' },
  lavender: { iconBg: 'bg-lavender-light', iconText: 'text-lavender-deep', pillBg: 'bg-lavender-light/60', pillText: 'text-lavender-deep' },
  mist:     { iconBg: 'bg-mist-light', iconText: 'text-mist-deep', pillBg: 'bg-mist-light/60', pillText: 'text-mist-deep' },
  cream:    { iconBg: 'bg-cream-light', iconText: 'text-cream-deep', pillBg: 'bg-cream-light/60', pillText: 'text-cream-deep' },
  sage:     { iconBg: 'bg-sage-light', iconText: 'text-sage-deep', pillBg: 'bg-sage-light/60', pillText: 'text-sage-deep' },
  blush:    { iconBg: 'bg-blush-light', iconText: 'text-blush-deep', pillBg: 'bg-blush-light/60', pillText: 'text-blush-deep' },
};

export default function FeaturePage({
  color,
  overline,
  heading,
  subtitle,
  highlights,
  demo,
  demoTitle,
  demoSubtitle,
}: FeaturePageProps) {
  const { ref: heroRef, isInView: heroVisible } = useInView();
  const { ref: highlightsRef, isInView: highlightsVisible } = useInView();
  const { ref: demoRef, isInView: demoVisible } = useInView();
  const { ref: ctaRef, isInView: ctaVisible } = useInView();

  const c = colorStyles[color];

  return (
    <>
      <Navbar />
      <main id="main-content">
        {/* Hero */}
        <section
          className="relative overflow-hidden"
          style={{ background: meshGradients[color], paddingTop: 160, paddingBottom: 100 }}
        >
          <div
            ref={heroRef}
            className="container text-center max-w-[700px]"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(32px)',
              transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <p className="font-mono text-[12px] font-medium text-ink-40 uppercase tracking-[0.06em] mb-4">
              {overline}
            </p>
            <h1 className="font-heading section-heading text-ink mb-6">
              {heading}
            </h1>
            <p className="text-[19px] leading-[1.7] text-ink-60 max-w-[540px] mx-auto">
              {subtitle}
            </p>
          </div>
        </section>

        {/* Highlights */}
        <section style={{ paddingTop: 100, paddingBottom: 100 }}>
          <div ref={highlightsRef} className="container">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {highlights.map((item, i) => (
                <div
                  key={item.title}
                  style={{
                    opacity: highlightsVisible ? 1 : 0,
                    transform: highlightsVisible ? 'translateY(0)' : 'translateY(32px)',
                    transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.12}s`,
                  }}
                >
                  <div className={`w-12 h-12 rounded-xl ${c.iconBg} flex items-center justify-center ${c.iconText} mb-5`}>
                    {item.icon}
                  </div>
                  <h3 className="font-heading text-[18px] font-bold text-ink mb-2">
                    {item.title}
                  </h3>
                  <p className="text-[15px] leading-[1.7] text-ink-60">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Demo */}
        <section className="border-t border-ink-10" style={{ paddingTop: 100, paddingBottom: 100 }}>
          <div ref={demoRef} className="container">
            <div
              className="text-center mb-12"
              style={{
                opacity: demoVisible ? 1 : 0,
                transform: demoVisible ? 'translateY(0)' : 'translateY(32px)',
                transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <p className={`pastel-pill ${c.pillBg} ${c.pillText} mb-4`}>{overline}</p>
              <h2 className="font-heading step-title text-ink mb-3">{demoTitle}</h2>
              <p className="text-[16px] leading-[1.7] text-ink-60 max-w-[480px] mx-auto">{demoSubtitle}</p>
            </div>
            <div
              className="max-w-[900px] mx-auto"
              style={{
                opacity: demoVisible ? 1 : 0,
                transform: demoVisible ? 'translateY(0)' : 'translateY(24px)',
                transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
              }}
            >
              {demo}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section
          className="relative overflow-hidden"
          style={{ background: meshGradients[color], paddingTop: 120, paddingBottom: 120 }}
        >
          <div
            ref={ctaRef}
            className="container text-center"
            style={{
              opacity: ctaVisible ? 1 : 0,
              transform: ctaVisible ? 'translateY(0)' : 'translateY(32px)',
              transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <h2 className="font-heading section-heading text-ink mb-6">
              Klaar om te <span className="text-ember-gradient">smeden</span>?
            </h2>
            <p className="text-[19px] leading-[1.7] text-ink-60 mb-10 max-w-[480px] mx-auto">
              Start vandaag gratis. Geen creditcard, geen contract, geen gedoe.
            </p>
            <Button variant="ink" href="https://app.forgedesk.io">
              Start 30 dagen gratis &rarr;
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
