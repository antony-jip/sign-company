'use client';

import React, { useState } from 'react';
import { useScrollAnimation } from './useScrollAnimation';

export const AppLoginExperience: React.FC = () => {
  const ref = useScrollAnimation();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'login' | 'welcome' | 'setup'>('login');
  const [companyName, setCompanyName] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  const modules = [
    { id: 'offertes', name: 'Offertes', icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z', color: 'blush' },
    { id: 'planning', name: 'Planning', icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5', color: 'sage' },
    { id: 'facturatie', name: 'Facturatie', icon: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z', color: 'mist' },
    { id: 'werkbonnen', name: 'Werkbonnen', icon: 'M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5 3-3.75', color: 'cream' },
    { id: 'crm', name: 'CRM', icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z', color: 'lavender' },
    { id: 'ai', name: 'AI Tools', icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z', color: 'peach' },
  ];

  const colorMap: Record<string, { bg: string; text: string; border: string; selected: string }> = {
    blush: { bg: 'bg-blush-light/50', text: 'text-blush-deep', border: 'border-blush/30', selected: 'bg-blush border-blush-deep' },
    sage: { bg: 'bg-sage-light/50', text: 'text-sage-deep', border: 'border-sage/30', selected: 'bg-sage border-sage-deep' },
    mist: { bg: 'bg-mist-light/50', text: 'text-mist-deep', border: 'border-mist/30', selected: 'bg-mist border-mist-deep' },
    cream: { bg: 'bg-cream-light/50', text: 'text-cream-deep', border: 'border-cream/30', selected: 'bg-cream border-cream-deep' },
    lavender: { bg: 'bg-lavender-light/50', text: 'text-lavender-deep', border: 'border-lavender/30', selected: 'bg-lavender border-lavender-deep' },
    peach: { bg: 'bg-peach-light/50', text: 'text-peach-deep', border: 'border-peach/30', selected: 'bg-peach border-peach-deep' },
  };

  const toggleModule = (id: string) => {
    setSelectedModules(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleLogin = () => {
    if (email.includes('@')) {
      setStep('welcome');
      setTimeout(() => setStep('setup'), 2000);
    }
  };

  return (
    <section id="start" ref={ref} className="py-20 lg:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#151520] to-[#0A0A0A]" />

      {/* Pastel orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-lavender/10 rounded-full blur-3xl animate-pulse-soft pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-sage/10 rounded-full blur-3xl animate-pulse-soft pointer-events-none" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-0 w-64 h-64 bg-blush/8 rounded-full blur-3xl animate-pulse-soft pointer-events-none" style={{ animationDelay: '4s' }} />

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        <div className="text-center mb-12">
          <h2 className="fade-up text-4xl lg:text-6xl font-black tracking-tight text-white mb-4">
            Klaar om te <span className="text-gradient-pastel">starten</span>?
          </h2>
          <p className="fade-up stagger-1 text-lg text-gray-400 max-w-xl mx-auto">
            Maak je account aan en begin direct. Geen creditcard, geen implementatie.
          </p>
        </div>

        {/* Login/Onboarding card */}
        <div className="fade-up stagger-2 max-w-lg mx-auto">
          <div className="glass-dark rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
            {/* Browser bar */}
            <div className="bg-white/5 border-b border-white/10 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-blush/60" />
                <div className="w-3 h-3 rounded-full bg-sage/60" />
                <div className="w-3 h-3 rounded-full bg-mist/60" />
              </div>
              <div className="flex-1 bg-white/5 rounded-lg px-4 py-1 text-xs text-gray-500 text-center ml-4">
                app.forgedesk.nl
              </div>
            </div>

            <div className="p-8">
              {step === 'login' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <span className="text-2xl font-bold text-white tracking-tight">
                      FORGE<span className="font-light">desk</span>
                    </span>
                    <p className="text-gray-400 text-sm mt-2">Log in of maak een account aan</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-400 mb-1 block">E-mailadres</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                        placeholder="naam@bedrijf.nl"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-lavender/50 placeholder:text-gray-600"
                      />
                    </div>

                    <button
                      onClick={handleLogin}
                      className="w-full bg-gradient-to-r from-lavender-vivid to-lavender-deep hover:opacity-90 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      Ga verder
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </button>

                    <div className="relative py-3">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
                      <div className="relative flex justify-center">
                        <span className="bg-[#151520] px-4 text-xs text-gray-500">of</span>
                      </div>
                    </div>

                    <button className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Doorgaan met Google
                    </button>
                  </div>

                  <p className="text-center text-xs text-gray-600">
                    30 dagen gratis &middot; Geen creditcard nodig
                  </p>
                </div>
              )}

              {step === 'welcome' && (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-sage-vivid to-sage-deep flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white">Welkom bij FORGEdesk!</h3>
                  <p className="text-gray-400 text-sm">Even je werkplek inrichten...</p>
                  <div className="flex justify-center">
                    <div className="w-8 h-8 border-2 border-lavender-vivid border-t-transparent rounded-full animate-spin" />
                  </div>
                </div>
              )}

              {step === 'setup' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-white mb-1">Richt je werkplek in</h3>
                    <p className="text-gray-400 text-sm">Kies de modules die bij jou passen</p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-1 block">Bedrijfsnaam</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Jouw bedrijf"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-lavender/50 placeholder:text-gray-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-2 block">Modules</label>
                    <div className="grid grid-cols-2 gap-2">
                      {modules.map(m => {
                        const isSelected = selectedModules.includes(m.id);
                        return (
                          <button
                            key={m.id}
                            onClick={() => toggleModule(m.id)}
                            className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left ${
                              isSelected
                                ? `${colorMap[m.color].selected} text-white border-2`
                                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                            }`}
                          >
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d={m.icon} />
                            </svg>
                            <span className="text-sm font-medium">{m.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    className="w-full bg-gradient-to-r from-lavender-vivid to-lavender-deep hover:opacity-90 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    Start met FORGEdesk
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Reset button */}
          {step !== 'login' && (
            <button
              onClick={() => { setStep('login'); setEmail(''); setCompanyName(''); setSelectedModules([]); }}
              className="mx-auto mt-4 block text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Opnieuw beginnen
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default AppLoginExperience;
