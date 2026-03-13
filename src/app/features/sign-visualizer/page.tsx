'use client';

import React, { useState } from 'react';
import FeaturePage from '@/components/landing/FeaturePage';

/* ─── Sign Visualizer Demo ─── */
function VisualizerDemo() {
  const [step, setStep] = useState<'upload' | 'prompt' | 'result'>('upload');
  const [fotoUploaded, setFotoUploaded] = useState(false);
  const [logoUploaded, setLogoUploaded] = useState(false);
  const [prompt, setPrompt] = useState('Plaats het logo als freesletters boven de ingang, verlicht met warm LED-licht');
  const [generating, setGenerating] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setStep('result');
    }, 2500);
  };

  return (
    <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-ink-10 overflow-hidden">
      {/* Header */}
      <div className="bg-blush-light/40 px-5 py-3.5 border-b border-ink-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blush flex items-center justify-center">
            <svg className="w-4 h-4 text-blush-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
          </div>
          <div>
            <p className="font-heading text-[15px] font-bold text-ink">Sign Visualizer</p>
            <p className="text-[11px] text-ink-40">AI-visualisatie voor je klant</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="pastel-pill bg-blush-light text-blush-deep text-[10px]">Powered by Claude Sonnet 4.6</span>
        </div>
      </div>

      <div className="p-6">
        {step === 'upload' && (
          <div className="space-y-5">
            <p className="text-[14px] text-ink-60">Upload een foto van de locatie en het logo van je klant.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Foto upload */}
              <button
                onClick={() => setFotoUploaded(true)}
                className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-all ${
                  fotoUploaded
                    ? 'border-sage bg-sage-light/20'
                    : 'border-ink-10 hover:border-blush bg-ink-05'
                }`}
              >
                {fotoUploaded ? (
                  <div>
                    <div className="w-full h-32 bg-gradient-to-br from-mist-light via-ink-05 to-mist rounded-lg mb-3 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-10 bg-ink-20 rounded mx-auto mb-1" />
                        <div className="w-24 h-6 bg-ink-10 rounded mx-auto" />
                        <div className="w-8 h-12 bg-mist-deep/20 rounded mx-auto mt-1" />
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-1.5">
                      <svg className="w-4 h-4 text-sage-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-[13px] font-medium text-sage-deep">Foto geüpload</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <svg className="w-10 h-10 mx-auto mb-3 text-ink-20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                    </svg>
                    <p className="text-[13px] font-medium text-ink-60">Foto van locatie</p>
                    <p className="text-[11px] text-ink-40 mt-1">Klik om te uploaden</p>
                  </div>
                )}
              </button>

              {/* Logo upload */}
              <button
                onClick={() => setLogoUploaded(true)}
                className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-all ${
                  logoUploaded
                    ? 'border-sage bg-sage-light/20'
                    : 'border-ink-10 hover:border-blush bg-ink-05'
                }`}
              >
                {logoUploaded ? (
                  <div>
                    <div className="w-full h-32 bg-white rounded-lg mb-3 flex items-center justify-center border border-ink-10">
                      <span className="font-heading text-[24px] font-black text-ink tracking-tight">LOGO</span>
                    </div>
                    <div className="flex items-center justify-center gap-1.5">
                      <svg className="w-4 h-4 text-sage-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-[13px] font-medium text-sage-deep">Logo geüpload</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <svg className="w-10 h-10 mx-auto mb-3 text-ink-20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <p className="text-[13px] font-medium text-ink-60">Logo van klant</p>
                    <p className="text-[11px] text-ink-40 mt-1">Klik om te uploaden</p>
                  </div>
                )}
              </button>
            </div>

            {fotoUploaded && logoUploaded && (
              <button
                onClick={() => setStep('prompt')}
                className="w-full bg-ink hover:bg-ink-80 text-white font-semibold py-3 rounded-xl transition-all hover:-translate-y-0.5 text-[14px]"
              >
                Volgende: prompt schrijven →
              </button>
            )}
          </div>
        )}

        {step === 'prompt' && (
          <div className="space-y-5">
            <div>
              <p className="text-[12px] font-semibold text-ink-40 uppercase tracking-wide mb-2">Beschrijf het gewenste resultaat</p>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                className="w-full bg-ink-05 rounded-xl px-4 py-3 text-[14px] border border-ink-10 focus:outline-none focus:ring-2 focus:ring-blush/40 text-ink placeholder:text-ink-40 resize-none leading-[1.7]"
                placeholder="Beschrijf hoe het logo geplaatst moet worden..."
              />
              <p className="text-[11px] text-ink-40 mt-2">
                Je prompt wordt gecontroleerd en verbeterd door Claude Sonnet 4.6 voor het beste resultaat.
              </p>
            </div>

            <div className="bg-blush-light/20 rounded-xl p-4 border border-blush/20 flex items-start gap-3">
              <svg className="w-5 h-5 text-blush-deep flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <div>
                <p className="text-[13px] font-medium text-blush-deep">Tokens</p>
                <p className="text-[12px] text-ink-60">Visualisaties kosten tokens die apart worden afgerekend. Gemiddeld ~€0,15 per render.</p>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full bg-ink hover:bg-ink-80 text-white font-semibold py-3 rounded-xl transition-all hover:-translate-y-0.5 text-[14px] flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {generating ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Claude verwerkt je prompt...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  Genereer visualisatie
                </>
              )}
            </button>
          </div>
        )}

        {step === 'result' && (
          <div className="space-y-5">
            {/* Mock result */}
            <div className="rounded-xl overflow-hidden border border-ink-10">
              <div className="w-full h-64 bg-gradient-to-br from-mist-light via-bg to-mist relative flex items-center justify-center">
                {/* Mock building with signage */}
                <div className="text-center relative">
                  <div className="w-48 h-8 bg-ink-20 rounded-sm mx-auto" />
                  <div className="relative">
                    <div className="font-heading text-[28px] font-black text-ink tracking-tight mt-2 drop-shadow-sm">
                      LOGO
                    </div>
                    <div className="absolute -inset-2 bg-peach/20 rounded-lg -z-10 blur-sm" />
                  </div>
                  <div className="w-56 h-36 bg-ink-10 rounded-sm mx-auto mt-2 relative">
                    <div className="absolute inset-x-8 top-4 bottom-4 bg-mist-light/60 rounded-sm" />
                  </div>
                  <div className="w-64 h-4 bg-ink-20 mx-auto mt-1" />
                </div>
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-peach/10 to-transparent" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="pastel-pill bg-sage-light text-sage-deep">AI-gegeneerd resultaat</span>
              <span className="text-[11px] text-ink-40">Powered by Claude Sonnet 4.6</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button className="bg-ink hover:bg-ink-80 text-white font-semibold py-3 rounded-xl transition-all hover:-translate-y-0.5 text-[13px]">
                Koppel aan offerte
              </button>
              <button className="bg-ink-05 hover:bg-ink-10 text-ink font-medium py-3 rounded-xl transition-colors text-[13px]">
                Meesturen als tekening
              </button>
            </div>

            <button
              onClick={() => { setStep('upload'); setFotoUploaded(false); setLogoUploaded(false); }}
              className="w-full text-[13px] text-ink-40 hover:text-ink-60 transition-colors py-2"
            >
              ← Opnieuw proberen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SignVisualizerPage() {
  return (
    <FeaturePage
      color="blush"
      overline="Sign Visualizer"
      heading={<>Laat je klant het <span className="text-ember-gradient">resultaat</span> zien</>}
      subtitle="Upload een foto en logo, maak een AI-visualisatie. Powered by Claude Sonnet 4.6. Koppel aan project of offerte."
      highlights={[
        {
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
          ),
          title: 'AI-Visualisatie',
          description: 'Upload een foto van de situatie + logo, schrijf een prompt. Claude Sonnet 4.6 genereert een realistische visualisatie.',
        },
        {
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-1.135a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.5 8.627" />
            </svg>
          ),
          title: 'Koppelen aan Offerte',
          description: 'Link de visualisatie direct aan een offerte of project. Je klant ziet het resultaat in het klantportaal.',
        },
        {
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          ),
          title: 'Meesturen als Tekening',
          description: 'Voeg de render toe als tekening bij je offerte of werkbon. Professioneel en overtuigend.',
        },
      ]}
      demo={<VisualizerDemo />}
      demoTitle="Maak een visualisatie"
      demoSubtitle="Upload een foto en logo, schrijf een prompt en zie het resultaat."
    />
  );
}
