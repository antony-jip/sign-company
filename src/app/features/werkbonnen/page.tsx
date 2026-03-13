'use client';

import React, { useState } from 'react';
import FeaturePage from '@/components/landing/FeaturePage';

/* ─── Werkbon Demo ─── */
function WerkbonDemo() {
  const [tasks, setTasks] = useState([
    { id: 1, desc: 'LED lichtreclame monteren boven ingang', done: false },
    { id: 2, desc: 'Bekabeling aansluiten en testen', done: false },
    { id: 3, desc: 'Oplevering controleren met klant', done: false },
  ]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [signed, setSigned] = useState(false);

  const toggleTask = (id: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const addPhoto = () => {
    const mockPhotos = ['Montage voorgevel', 'Detail bevestiging', 'LED-test', 'Eindresultaat'];
    if (photos.length < 4) {
      setPhotos(prev => [...prev, mockPhotos[prev.length]]);
    }
  };

  const allDone = tasks.every(t => t.done);

  return (
    <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-ink-10 overflow-hidden">
      {/* Header */}
      <div className="bg-sage-light/40 px-5 py-3.5 border-b border-ink-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sage flex items-center justify-center">
              <svg className="w-4 h-4 text-sage-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
              </svg>
            </div>
            <div>
              <p className="font-heading text-[15px] font-bold text-ink">Werkbon WB-2026-034</p>
              <p className="text-[11px] text-ink-40">Overgenomen uit OFF-2026-089 · Bakkerij Jansen</p>
            </div>
          </div>
          <span className="pastel-pill bg-lavender-light text-lavender-deep text-[10px]">Vanuit offerte</span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Monteur info */}
        <div className="flex items-center gap-3 p-3 bg-ink-05 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-mist flex items-center justify-center text-[11px] font-bold text-mist-deep">
            JK
          </div>
          <div>
            <p className="text-[13px] font-medium text-ink">Joris Kok</p>
            <p className="text-[11px] text-ink-40">Monteur · Vandaag 09:00 – 14:00</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[12px] font-mono text-ink-60">Bakkerij Jansen</p>
            <p className="text-[11px] text-ink-40">Dorpsstraat 42, Hoorn</p>
          </div>
        </div>

        {/* Taken */}
        <div>
          <p className="text-[12px] font-semibold text-ink-40 uppercase tracking-wide mb-3">
            Taken (overgenomen uit offerte)
          </p>
          <div className="space-y-2">
            {tasks.map(task => (
              <button
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
                  task.done
                    ? 'border-sage/30 bg-sage-light/20'
                    : 'border-ink-10 hover:border-sage/40'
                }`}
              >
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                  task.done
                    ? 'border-sage-vivid bg-sage-vivid'
                    : 'border-ink-20'
                }`}>
                  {task.done && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`text-[14px] ${task.done ? 'text-ink-40 line-through' : 'text-ink'}`}>
                  {task.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Foto uploads */}
        <div>
          <p className="text-[12px] font-semibold text-ink-40 uppercase tracking-wide mb-3">
            Foto&apos;s ter plekke
          </p>
          <div className="grid grid-cols-4 gap-2">
            {photos.map((photo, i) => (
              <div key={i} className="aspect-square rounded-xl bg-gradient-to-br from-sage-light to-mist-light border border-ink-10 flex items-center justify-center p-2">
                <div className="text-center">
                  <svg className="w-5 h-5 text-sage-deep mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-[9px] text-ink-40 leading-tight">{photo}</p>
                </div>
              </div>
            ))}
            {photos.length < 4 && (
              <button
                onClick={addPhoto}
                className="aspect-square rounded-xl border-2 border-dashed border-ink-10 hover:border-sage flex items-center justify-center transition-colors"
              >
                <div className="text-center">
                  <svg className="w-5 h-5 text-ink-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                  </svg>
                  <p className="text-[9px] text-ink-40 mt-1">Foto</p>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Ondertekenen */}
        <div className="border-t border-ink-10 pt-5">
          {allDone && !signed ? (
            <button
              onClick={() => setSigned(true)}
              className="w-full bg-ink hover:bg-ink-80 text-white font-semibold py-3 rounded-xl transition-all hover:-translate-y-0.5 text-[14px] flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
              </svg>
              Werkbon afronden
            </button>
          ) : signed ? (
            <div className="text-center p-4 bg-sage-light/20 rounded-xl border border-sage/20">
              <svg className="w-8 h-8 text-sage-deep mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[14px] font-semibold text-sage-deep">Werkbon afgerond!</p>
              <p className="text-[12px] text-ink-40 mt-1">Klaar om te printen of digitaal te delen</p>
              <div className="flex gap-2 mt-3 justify-center">
                <button className="text-[12px] bg-ink-05 hover:bg-ink-10 text-ink font-medium px-4 py-2 rounded-lg transition-colors">
                  Print
                </button>
                <button className="text-[12px] bg-ink-05 hover:bg-ink-10 text-ink font-medium px-4 py-2 rounded-lg transition-colors">
                  Deel digitaal
                </button>
              </div>
            </div>
          ) : (
            <p className="text-center text-[13px] text-ink-40">
              Rond alle taken af om de werkbon te voltooien
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WerkbonnenFeaturePage() {
  return (
    <FeaturePage
      color="sage"
      overline="Werkbonnen"
      heading={<>Van offerte naar werkbon in <span className="text-ember-gradient">één klik</span></>}
      subtitle="Omschrijving wordt overgenomen uit de offerte. De monteur weet precies wat hij moet doen. Foto's uploaden ter plekke."
      highlights={[
        {
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
          ),
          title: 'Automatisch vanuit Offerte',
          description: 'De omschrijving en taken worden direct overgenomen uit de offerte. Geen dubbel werk.',
        },
        {
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
          ),
          title: 'Foto-uploads op Locatie',
          description: 'Monteurs uploaden foto\'s direct ter plekke. Documenteer de montage voor je administratie.',
        },
        {
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 12h.008v.008h-.008V12zm-8.25 0h.008v.008H10.5V12z" />
            </svg>
          ),
          title: 'Print of Digitaal',
          description: 'Werkbon afgerond? Print hem uit of deel digitaal. Flexibel, zoals het hoort.',
        },
      ]}
      demo={<WerkbonDemo />}
      demoTitle="Probeer de werkbon"
      demoSubtitle="Vink taken af, upload foto's en rond de werkbon af. Precies zoals in de app."
    />
  );
}
