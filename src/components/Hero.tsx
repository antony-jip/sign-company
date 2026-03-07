'use client';

import React, { useEffect, useRef } from 'react';

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
    <section ref={sectionRef} className="relative min-h-screen bg-[#FAFAF7] overflow-hidden pt-24 pb-16 lg:pt-32 lg:pb-20">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Desktop: side by side layout */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:gap-12">
          {/* LEFT SIDE — Text */}
          <div className="lg:w-[38%] flex-shrink-0 mb-10 lg:mb-0 lg:pt-8">
            {/* Logo + tagline */}
            <div className="mb-6">
              <span className="text-xl font-bold tracking-tight text-gray-900">
                FORGE<span className="font-light">desk</span>
              </span>
              <p className="text-lg text-[#6B6B6B] mt-1">
                Je hele werkproces. Een app.
              </p>
            </div>

            {/* Main heading */}
            <h1 className="text-[40px] lg:text-[48px] font-black tracking-tight leading-[1.1] max-w-md mb-8">
              <span className="text-gradient-forge">Smeed</span> je bedrijf tot een geoliede machine.
            </h1>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <a
                href="#pricing"
                className="inline-flex items-center justify-center bg-[#0A0A0A] hover:bg-[#222] text-white font-bold px-10 py-5 rounded-[14px] text-[17px] transition-colors"
              >
                Start 30 dagen gratis
                <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
              <a
                href="#features"
                className="inline-flex items-center text-[#1A1A1A] underline underline-offset-4 font-medium text-base hover:text-[#555] transition-colors py-3"
              >
                Bekijk hoe het werkt
              </a>
            </div>

            {/* Trust line */}
            <p className="text-sm text-[#A0A0A0] mt-6">
              Direct aan de slag &middot; Geen creditcard &middot; Onbeperkt medewerkers
            </p>
          </div>

          {/* RIGHT SIDE — Workshop Canvas (desktop) */}
          <div className="hidden lg:block lg:w-[62%]">
            <div className="hero-canvas relative bg-[#F4F3F0] rounded-3xl min-h-[520px] p-6">
              {/* SVG connection lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ overflow: 'visible' }}>
                <path
                  className="draw-line"
                  d="M 140,95 Q 200,100 260,130"
                  fill="none"
                  stroke="#E8E6E0"
                  strokeWidth="2"
                  strokeDasharray="6,6"
                  opacity="0.4"
                />
                <path
                  className="draw-line"
                  d="M 380,210 Q 390,240 370,270"
                  fill="none"
                  stroke="#E8E6E0"
                  strokeWidth="2"
                  strokeDasharray="6,6"
                  opacity="0.4"
                />
                <path
                  className="draw-line"
                  d="M 350,300 Q 300,340 280,360"
                  fill="none"
                  stroke="#E8E6E0"
                  strokeWidth="2"
                  strokeDasharray="6,6"
                  opacity="0.4"
                />
                <path
                  className="draw-line"
                  d="M 280,420 Q 350,430 420,400"
                  fill="none"
                  stroke="#E8E6E0"
                  strokeWidth="2"
                  strokeDasharray="6,6"
                  opacity="0.4"
                />
              </svg>

              {/* ELEMENT 1 — Klantkaart */}
              <div className="hero-card-1 absolute top-6 left-6 bg-white rounded-2xl shadow-md p-5 w-[220px] z-10" style={{ borderTop: '3px solid #F0D9D0' }}>
                <p className="font-bold text-gray-900 text-sm mb-2">Bakkerij Jansen</p>
                <div className="flex items-center gap-2 text-sm text-[#6B6B6B] mb-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  0228 351960
                </div>
                <p className="text-xs text-[#A0A0A0] mt-2">3 projecten &middot; &euro;12.400 omzet</p>
              </div>

              {/* ELEMENT 2 — Offerte card */}
              <div className="hero-card-2 absolute top-16 left-[260px] bg-white rounded-2xl shadow-md p-5 w-[260px] z-10" style={{ borderTop: '3px solid #C8D5CC' }}>
                <p className="text-xs text-[#A0A0A0] font-medium mb-1">OFF-2026-048</p>
                <p className="font-bold text-gray-900 text-sm mb-3">Lichtreclame voorgevel</p>
                <div className="space-y-1 text-xs text-[#6B6B6B]">
                  <div className="flex justify-between">
                    <span>LED module &middot; 8u</span>
                    <span>&euro;960</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Montage &middot; 4u</span>
                    <span>&euro;480</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transport</span>
                    <span>&euro;85</span>
                  </div>
                </div>
                <div className="border-t border-gray-100 mt-3 pt-2 flex justify-between">
                  <span className="text-xs text-[#A0A0A0]">Totaal</span>
                  <span className="font-bold text-sm text-gray-900">&euro;1.525</span>
                </div>
              </div>

              {/* ELEMENT 3 — Goedgekeurd notificatie */}
              <div className="hero-card-3 absolute top-[180px] left-[420px] bg-[#C8D5CC] rounded-xl shadow-lg px-4 py-2 z-20">
                <span className="text-white font-semibold text-sm flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Offerte goedgekeurd
                </span>
              </div>

              {/* ELEMENT 4 — Planning blok */}
              <div className="hero-card-4 absolute top-[260px] left-[240px] bg-white rounded-2xl shadow-md p-4 w-[200px] z-10" style={{ borderTop: '3px solid #CDD5DE' }}>
                <p className="text-xs text-[#A0A0A0] font-medium mb-1">Ma 14 mrt</p>
                <p className="font-bold text-gray-900 text-sm mb-1">Montage lichtreclame</p>
                <p className="text-xs text-[#6B6B6B] mb-1">Team: Joris, Mark</p>
                <p className="text-xs text-[#A0A0A0]">09:00 - 14:00</p>
              </div>

              {/* ELEMENT 5 — Factuur mini */}
              <div className="hero-card-5 absolute bottom-6 right-6 bg-white rounded-2xl shadow-md p-4 w-[200px] z-10" style={{ borderTop: '3px solid #EDE8D8' }}>
                <p className="text-xs text-[#A0A0A0] font-medium mb-1">F-2026-031</p>
                <p className="font-bold text-gray-900 text-lg mb-2">&euro;1.525,00</p>
                <span className="inline-block bg-[#C8D5CC] text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Betaald
                </span>
              </div>

              {/* ELEMENT 6 — Omzet indicator */}
              <div className="hero-card-6 absolute top-[280px] left-6 bg-cream/50 rounded-xl p-3 w-[140px] z-10">
                <p className="font-bold text-gray-900 text-lg">&euro;14.850</p>
                <p className="text-xs font-semibold text-[#5A8264]">&#8593; 23%</p>
                {/* Mini bar chart */}
                <div className="flex items-end gap-1.5 mt-2 h-8">
                  <div className="w-5 bg-blush/60 rounded-sm" style={{ height: '40%' }} />
                  <div className="w-5 bg-sage/60 rounded-sm" style={{ height: '65%' }} />
                  <div className="w-5 bg-mist/60 rounded-sm" style={{ height: '50%' }} />
                  <div className="w-5 bg-cream-deep/40 rounded-sm" style={{ height: '100%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* MOBILE — Horizontal scroll strip */}
          <div className="lg:hidden">
            <div className="hero-scroll-strip -mx-6">
              {/* Klantkaart */}
              <div className="flex-shrink-0 bg-white rounded-2xl shadow-md p-5 w-[220px]" style={{ borderTop: '3px solid #F0D9D0' }}>
                <p className="font-bold text-gray-900 text-sm mb-2">Bakkerij Jansen</p>
                <div className="flex items-center gap-2 text-sm text-[#6B6B6B] mb-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  0228 351960
                </div>
                <p className="text-xs text-[#A0A0A0] mt-2">3 projecten &middot; &euro;12.400 omzet</p>
              </div>

              {/* Offerte */}
              <div className="flex-shrink-0 bg-white rounded-2xl shadow-md p-5 w-[260px]" style={{ borderTop: '3px solid #C8D5CC' }}>
                <p className="text-xs text-[#A0A0A0] font-medium mb-1">OFF-2026-048</p>
                <p className="font-bold text-gray-900 text-sm mb-3">Lichtreclame voorgevel</p>
                <div className="space-y-1 text-xs text-[#6B6B6B]">
                  <div className="flex justify-between"><span>LED module &middot; 8u</span><span>&euro;960</span></div>
                  <div className="flex justify-between"><span>Montage &middot; 4u</span><span>&euro;480</span></div>
                  <div className="flex justify-between"><span>Transport</span><span>&euro;85</span></div>
                </div>
                <div className="border-t border-gray-100 mt-3 pt-2 flex justify-between">
                  <span className="text-xs text-[#A0A0A0]">Totaal</span>
                  <span className="font-bold text-sm text-gray-900">&euro;1.525</span>
                </div>
              </div>

              {/* Planning */}
              <div className="flex-shrink-0 bg-white rounded-2xl shadow-md p-4 w-[200px]" style={{ borderTop: '3px solid #CDD5DE' }}>
                <p className="text-xs text-[#A0A0A0] font-medium mb-1">Ma 14 mrt</p>
                <p className="font-bold text-gray-900 text-sm mb-1">Montage lichtreclame</p>
                <p className="text-xs text-[#6B6B6B] mb-1">Team: Joris, Mark</p>
                <p className="text-xs text-[#A0A0A0]">09:00 - 14:00</p>
              </div>

              {/* Factuur */}
              <div className="flex-shrink-0 bg-white rounded-2xl shadow-md p-4 w-[200px]" style={{ borderTop: '3px solid #EDE8D8' }}>
                <p className="text-xs text-[#A0A0A0] font-medium mb-1">F-2026-031</p>
                <p className="font-bold text-gray-900 text-lg mb-2">&euro;1.525,00</p>
                <span className="inline-block bg-[#C8D5CC] text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Betaald
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="flex justify-center mt-16 lg:mt-12">
          <div className="animate-bounce-slow text-[#A0A0A0]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
