'use client';

import React, { useEffect, useRef, useState } from 'react';

const steps = [
  {
    label: 'Klant aanmaken',
    color: 'from-blush-vivid to-blush-deep',
    bg: 'bg-blush-light/50',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    label: 'Offerte versturen',
    color: 'from-sage-vivid to-sage-deep',
    bg: 'bg-sage-light/50',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    label: 'Project plannen',
    color: 'from-mist-vivid to-mist-deep',
    bg: 'bg-mist-light/50',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
      </svg>
    ),
  },
  {
    label: 'Factuur incasseren',
    color: 'from-lavender-vivid to-lavender-deep',
    bg: 'bg-lavender-light/50',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
  },
];

export const HowItWorks: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach((entry) => { if (entry.isIntersecting) { setIsVisible(true); observer.unobserve(entry.target); } }); },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-20 lg:py-32 bg-pastel-mesh relative overflow-hidden">
      <div className="absolute top-10 right-20 w-40 h-40 bg-lavender/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-20 w-56 h-56 bg-blush/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        <h2 className="text-[36px] lg:text-[40px] font-black tracking-tight text-center mb-4">
          Van idee tot <span className="text-gradient-pastel">factuur</span>
        </h2>
        <p className="text-center text-gray-500 mb-16 max-w-md mx-auto">In vier simpele stappen. Geen implementatie, geen consultant.</p>

        {/* Desktop */}
        <div className="hidden md:block relative">
          <svg className="absolute top-10 left-[12%] right-[12%] h-4 w-[76%] overflow-visible" preserveAspectRatio="none">
            <line x1="0" y1="8" x2="100%" y2="8" stroke="#E8E6E0" strokeWidth="2" />
            <defs>
              <linearGradient id="chainGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#E8A990" />
                <stop offset="33%" stopColor="#7DB88A" />
                <stop offset="66%" stopColor="#7BA3C4" />
                <stop offset="100%" stopColor="#A48BBF" />
              </linearGradient>
            </defs>
            <line x1="0" y1="8" x2="100%" y2="8" stroke="url(#chainGradient)" strokeWidth="3" className={`chain-line-fill ${isVisible ? 'visible' : ''}`} />
          </svg>

          <div className="grid grid-cols-4 gap-8 relative z-10">
            {steps.map((step, i) => (
              <div
                key={step.label}
                className="flex flex-col items-center text-center"
                style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'scale(1)' : 'scale(0)', transition: `all 0.5s ease-out ${0.3 + i * 0.4}s` }}
              >
                <div className={`w-20 h-20 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg`}>
                  {step.icon}
                </div>
                <p className="text-sm font-semibold text-gray-900">{step.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile */}
        <div className="md:hidden space-y-6">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-4">
              <div className={`w-14 h-14 bg-gradient-to-br ${step.color} rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-lg`}>
                {step.icon}
              </div>
              <div className="flex items-center gap-3">
                <p className="font-semibold text-gray-900">{step.label}</p>
                {i < steps.length - 1 && (
                  <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
