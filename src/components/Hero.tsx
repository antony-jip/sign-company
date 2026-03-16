'use client';

import React, { useEffect, useRef } from 'react';
import { DisplayCards } from './DisplayCards';
import { ContainerScroll } from './ContainerScroll';

export const Hero: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const canvas = section.querySelector('.hero-canvas') as HTMLElement;
      if (canvas) {
        const factor = scrollY * 0.3;
        canvas.style.transform = `translateY(${factor}px)`;
        canvas.style.opacity = `${Math.max(0, 1 - scrollY / 600)}`;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section ref={sectionRef} className="relative bg-pastel-mesh overflow-hidden pt-24 pb-0 lg:pt-32">
      {/* Decorative floating orbs */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-lavender/20 rounded-full blur-3xl animate-float pointer-events-none" />
      <div className="absolute top-40 left-10 w-48 h-48 bg-blush/25 rounded-full blur-3xl animate-float-slow pointer-events-none" />
      <div className="absolute bottom-40 right-10 w-56 h-56 bg-sage/20 rounded-full blur-3xl animate-float pointer-events-none" style={{ animationDelay: '3s' }} />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-start lg:gap-12">
          {/* LEFT SIDE */}
          <div className="lg:w-[38%] flex-shrink-0 mb-10 lg:mb-0 lg:pt-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm text-gray-600 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-gray-100 shadow-sm">
              <span className="w-2 h-2 bg-sage-vivid rounded-full animate-pulse" />
              Nu met AI-tools
            </div>

            <h1 className="text-[40px] lg:text-[52px] font-black tracking-tight leading-[1.08] max-w-md mb-6">
              <span className="text-gradient-forge">Alles-in-één</span> software voor de creatieve branche.
            </h1>

            <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-sm">
              Projecten, offertes, werkbonnen en facturen. Met AI-tools die je werk sneller en slimmer maken.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <a
                href="#start"
                className="inline-flex items-center justify-center bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white font-bold px-8 py-4 rounded-2xl text-base transition-all hover:scale-[1.02] shadow-lg shadow-gray-900/20"
              >
                Start gratis
                <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
              <a
                href="#ai-tools"
                className="inline-flex items-center justify-center gap-2 bg-lavender-light/60 hover:bg-lavender-light text-lavender-deep font-semibold px-6 py-4 rounded-2xl text-base transition-all border border-lavender/30"
              >
                <svg className="w-4 h-4 ai-sparkle" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                AI-tools bekijken
              </a>
            </div>

            <div className="flex flex-wrap gap-2 mt-6 mb-10">
              <span className="pastel-pill bg-blush-light text-blush-deep">Geen creditcard</span>
              <span className="pastel-pill bg-sage-light text-sage-deep">30 dagen gratis</span>
              <span className="pastel-pill bg-mist-light text-mist-deep">Onbeperkt users</span>
            </div>

            <div className="hidden lg:flex justify-start">
              <DisplayCards />
            </div>
          </div>

          {/* RIGHT SIDE — Workshop Canvas */}
          <div className="hidden lg:block lg:w-[62%]">
            <div className="hero-canvas relative bg-gradient-to-br from-white/60 to-white/30 backdrop-blur-sm rounded-3xl min-h-[520px] p-6 border border-white/40 shadow-xl">
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ overflow: 'visible' }}>
                <path className="draw-line" d="M 140,95 Q 200,100 260,130" fill="none" stroke="#DDD5E8" strokeWidth="2" strokeDasharray="6,6" opacity="0.5" />
                <path className="draw-line" d="M 380,210 Q 390,240 370,270" fill="none" stroke="#C8D5CC" strokeWidth="2" strokeDasharray="6,6" opacity="0.5" />
                <path className="draw-line" d="M 350,300 Q 300,340 280,360" fill="none" stroke="#CDD5DE" strokeWidth="2" strokeDasharray="6,6" opacity="0.5" />
                <path className="draw-line" d="M 280,420 Q 350,430 420,400" fill="none" stroke="#F0D9D0" strokeWidth="2" strokeDasharray="6,6" opacity="0.5" />
              </svg>

              {/* Klantkaart */}
              <div className="hero-card-1 absolute top-6 left-6 bg-white rounded-2xl shadow-md p-5 w-[220px] z-10 border border-blush/20" style={{ borderTop: '3px solid #E8A990' }}>
                <p className="font-bold text-gray-900 text-sm mb-2">Bakkerij Jansen</p>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <svg className="w-3.5 h-3.5 text-blush-vivid" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  0228 351960
                </div>
                <p className="text-xs text-gray-400 mt-2">3 projecten &middot; &euro;12.400 omzet</p>
              </div>

              {/* Offerte card */}
              <div className="hero-card-2 absolute top-16 left-[260px] bg-white rounded-2xl shadow-md p-5 w-[260px] z-10 border border-sage/20" style={{ borderTop: '3px solid #7DB88A' }}>
                <p className="text-xs text-gray-400 font-medium mb-1">OFF-2026-048</p>
                <p className="font-bold text-gray-900 text-sm mb-3">Lichtreclame voorgevel</p>
                <div className="space-y-1 text-xs text-gray-500">
                  <div className="flex justify-between"><span>LED module &middot; 8u</span><span>&euro;960</span></div>
                  <div className="flex justify-between"><span>Montage &middot; 4u</span><span>&euro;480</span></div>
                  <div className="flex justify-between"><span>Transport</span><span>&euro;85</span></div>
                </div>
                <div className="border-t border-gray-100 mt-3 pt-2 flex justify-between">
                  <span className="text-xs text-gray-400">Totaal</span>
                  <span className="font-bold text-sm text-gray-900">&euro;1.525</span>
                </div>
              </div>

              {/* Goedgekeurd */}
              <div className="hero-card-3 absolute top-[180px] left-[420px] bg-gradient-to-r from-sage-vivid to-sage-deep rounded-xl shadow-lg px-4 py-2.5 z-20">
                <span className="text-white font-semibold text-sm flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Offerte goedgekeurd
                </span>
              </div>

              {/* AI Forgie mini */}
              <div className="hero-card-4 absolute top-[230px] left-[30px] bg-white rounded-2xl shadow-md p-4 w-[210px] z-10 border border-lavender/20" style={{ borderTop: '3px solid #A48BBF' }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-lavender-vivid to-lavender-deep flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-lavender-deep">Forgie AI</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">Offerte is aangemaakt en klaar om te versturen.</p>
              </div>

              {/* Planning */}
              <div className="hero-card-5 absolute top-[290px] left-[260px] bg-white rounded-2xl shadow-md p-4 w-[200px] z-10 border border-mist/20" style={{ borderTop: '3px solid #7BA3C4' }}>
                <p className="text-xs text-gray-400 font-medium mb-1">Ma 14 mrt</p>
                <p className="font-bold text-gray-900 text-sm mb-1">Montage lichtreclame</p>
                <p className="text-xs text-gray-500 mb-1">Team: Joris, Mark</p>
                <p className="text-xs text-gray-400">09:00 - 14:00</p>
              </div>

              {/* Factuur */}
              <div className="hero-card-6 absolute bottom-6 right-6 bg-white rounded-2xl shadow-md p-4 w-[200px] z-10 border border-cream/30" style={{ borderTop: '3px solid #C4B88A' }}>
                <p className="text-xs text-gray-400 font-medium mb-1">F-2026-031</p>
                <p className="font-bold text-gray-900 text-lg mb-2">&euro;1.525,00</p>
                <span className="inline-block bg-gradient-to-r from-sage-vivid to-sage-deep text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Betaald
                </span>
              </div>
            </div>
          </div>

          {/* MOBILE strip */}
          <div className="lg:hidden">
            <div className="hero-scroll-strip -mx-6">
              <div className="flex-shrink-0 bg-white rounded-2xl shadow-md p-5 w-[220px] border border-blush/20" style={{ borderTop: '3px solid #E8A990' }}>
                <p className="font-bold text-gray-900 text-sm mb-2">Bakkerij Jansen</p>
                <p className="text-xs text-gray-400 mt-2">3 projecten &middot; &euro;12.400 omzet</p>
              </div>
              <div className="flex-shrink-0 bg-white rounded-2xl shadow-md p-4 w-[210px] border border-lavender/20" style={{ borderTop: '3px solid #A48BBF' }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-lavender-vivid to-lavender-deep flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-lavender-deep">Forgie AI</span>
                </div>
                <p className="text-xs text-gray-500">Offerte aangemaakt en klaar.</p>
              </div>
              <div className="flex-shrink-0 bg-white rounded-2xl shadow-md p-5 w-[260px] border border-sage/20" style={{ borderTop: '3px solid #7DB88A' }}>
                <p className="text-xs text-gray-400 font-medium mb-1">OFF-2026-048</p>
                <p className="font-bold text-gray-900 text-sm">Lichtreclame voorgevel</p>
                <div className="border-t border-gray-100 mt-3 pt-2 flex justify-between">
                  <span className="text-xs text-gray-400">Totaal</span>
                  <span className="font-bold text-sm text-gray-900">&euro;1.525</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-16 lg:mt-12">
          <div className="animate-bounce-slow text-gray-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* ContainerScroll */}
      <div className="mt-8 lg:mt-16 px-6">
        <ContainerScroll>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl lg:rounded-3xl shadow-2xl overflow-hidden border border-white/40 max-w-[900px] mx-auto">
            <div className="bg-white/80 border-b border-gray-100 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-blush-vivid/60" />
                <div className="w-3 h-3 rounded-full bg-sage-vivid/60" />
                <div className="w-3 h-3 rounded-full bg-mist-vivid/60" />
              </div>
              <div className="flex-1 bg-gray-50 rounded-lg px-4 py-1 text-xs text-gray-400 text-center ml-4">
                app.forgedesk.io
              </div>
            </div>

            <div className="p-6 lg:p-8 bg-gradient-to-b from-white to-gray-50/50">
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-bold text-gray-900">FORGE<span className="font-light">desk</span></span>
                <div className="flex gap-6 text-xs text-gray-400">
                  <span className="text-gray-900 font-semibold">Dashboard</span>
                  <span>Offertes</span>
                  <span>Klanten</span>
                  <span className="text-lavender-deep font-semibold flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    AI
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-blush/20">
                  <p className="text-xs text-blush-deep mb-1">Omzet deze maand</p>
                  <p className="text-xl font-bold text-gray-900">&euro;14.850</p>
                  <p className="text-xs text-sage-deep font-semibold mt-1">&#8593; 23%</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-sage/20">
                  <p className="text-xs text-sage-deep mb-1">Open offertes</p>
                  <p className="text-xl font-bold text-gray-900">7</p>
                  <p className="text-xs text-gray-500 mt-1">&euro;8.420 waarde</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-mist/20">
                  <p className="text-xs text-mist-deep mb-1">Projecten actief</p>
                  <p className="text-xl font-bold text-gray-900">4</p>
                  <p className="text-xs text-gray-500 mt-1">2 deze week gepland</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-sage-vivid" />
                    <span className="text-sm text-gray-900">Bakkerij Jansen · Lichtreclame</span>
                  </div>
                  <span className="text-xs text-gray-400">Vandaag</span>
                </div>
                <div className="flex items-center justify-between bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blush-vivid" />
                    <span className="text-sm text-gray-900">Garage De Vries · Gevelreclame</span>
                  </div>
                  <span className="text-xs text-gray-400">Gisteren</span>
                </div>
              </div>
            </div>
          </div>
        </ContainerScroll>
      </div>

      <div className="pb-16 lg:pb-20" />
    </section>
  );
};

export default Hero;
