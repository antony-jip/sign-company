'use client';

import { useInView } from '@/hooks/useInView';
import { useState, useEffect } from 'react';

const tabs = [
  { id: 'offertes', label: 'Offertes', icon: '📋' },
  { id: 'werkbonnen', label: 'Werkbonnen', icon: '🔧' },
  { id: 'planning', label: 'Planning', icon: '📅' },
  { id: 'klantportaal', label: 'Klantportaal', icon: '👤' },
];

function OffertesView({ animate }: { animate: boolean }) {
  return (
    <div className="bg-bg p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-heading font-bold text-ink">Offertes</h3>
          <p className="text-[13px] text-ink-40">12 offertes deze maand</p>
        </div>
        <div className="bg-ink text-white text-[13px] px-4 py-2 rounded-full font-semibold">
          + Nieuwe offerte
        </div>
      </div>
      <div className="hidden sm:grid grid-cols-5 gap-4 text-[12px] font-mono font-medium text-ink-40 uppercase tracking-[0.06em] pb-3 border-b border-ink-10">
        <span>Nummer</span><span>Klant</span><span>Omschrijving</span><span>Bedrag</span><span>Status</span>
      </div>
      {[
        { nr: 'OFF-2026-042', klant: 'Brouwer Reclame', omschrijving: 'Lichtreclame gevelletters', bedrag: '\u20AC 4.250,00', status: 'Verstuurd', statusClass: 'bg-[#FEF3C7] text-[#92400E]' },
        { nr: 'OFF-2026-041', klant: 'Van Dijk Interieur', omschrijving: 'Raambelettering 3 filialen', bedrag: '\u20AC 1.890,00', status: 'Akkoord', statusClass: 'bg-sage-light text-sage-deep' },
        { nr: 'OFF-2026-040', klant: 'Gemeente Utrecht', omschrijving: 'Wayfinding borden parkeergarage', bedrag: '\u20AC 6.750,00', status: 'Concept', statusClass: 'bg-mist-light text-mist-deep' },
        { nr: 'OFF-2026-039', klant: 'Caf\u00E9 De Smid', omschrijving: 'Terrasschermen + uithangbord', bedrag: '\u20AC 2.340,00', status: 'Gefactureerd', statusClass: 'bg-lavender-light text-lavender-deep' },
      ].map((row, i) => (
        <div
          key={row.nr}
          className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4 py-3 border-b border-ink-05 items-center text-sm"
          style={{
            opacity: animate ? 1 : 0,
            transform: animate ? 'translateY(0)' : 'translateY(16px)',
            transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${0.1 + i * 0.08}s`,
          }}
        >
          <span className="font-mono text-[11px] text-ink-40">{row.nr}</span>
          <span className="font-medium text-ink">{row.klant}</span>
          <span className="text-ink-60 hidden sm:block">{row.omschrijving}</span>
          <span className="font-mono font-medium text-ink">{row.bedrag}</span>
          <span><span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-semibold ${row.statusClass}`}>{row.status}</span></span>
        </div>
      ))}
    </div>
  );
}

function WerkbonnenView({ animate }: { animate: boolean }) {
  return (
    <div className="bg-bg p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-heading font-bold text-ink">Werkbon WB-2026-018</h3>
          <p className="text-[13px] text-ink-40">Brouwer Reclame &middot; Lichtreclame gevelletters</p>
        </div>
        <span className="bg-sage-light text-sage-deep text-[11px] font-semibold px-3 py-1 rounded-full">In uitvoering</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="font-mono text-[11px] text-ink-40 uppercase tracking-wide mb-3">Taken</p>
          {['Gevelletters monteren', 'LED-verlichting aansluiten', 'Bekabeling wegwerken'].map((task, i) => (
            <div
              key={task}
              className="flex items-center gap-3 py-2 border-b border-ink-05"
              style={{ opacity: animate ? 1 : 0, transform: animate ? 'translateX(0)' : 'translateX(-16px)', transition: `all 0.5s ease ${0.1 + i * 0.1}s` }}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${i === 0 ? 'border-sage-vivid bg-sage-light' : 'border-ink-20'}`}>
                {i === 0 && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 6l2 2 4-4" stroke="#5A8264" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </div>
              <span className={`text-[14px] ${i === 0 ? 'text-ink-40 line-through' : 'text-ink'}`}>{task}</span>
            </div>
          ))}
        </div>
        <div>
          <p className="font-mono text-[11px] text-ink-40 uppercase tracking-wide mb-3">Foto&apos;s</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { bg: 'bg-blush-light', label: 'Voorgevel' },
              { bg: 'bg-mist-light', label: 'Detail LED' },
              { bg: 'bg-cream-light', label: 'Bekabeling' },
              { bg: 'bg-ink-05', label: '+ Upload', isDashed: true },
            ].map((photo, i) => (
              <div
                key={photo.label}
                className={`aspect-[4/3] rounded-lg ${photo.bg} flex items-center justify-center text-[12px] text-ink-40 ${photo.isDashed ? 'border-2 border-dashed border-ink-20' : ''}`}
                style={{ opacity: animate ? 1 : 0, transition: `opacity 0.5s ease ${0.3 + i * 0.1}s` }}
              >
                {photo.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanningView({ animate }: { animate: boolean }) {
  const days = [
    { day: 'Ma 17', items: [{ title: 'Gevelletters Brouwer', color: 'bg-blush-light border-blush text-blush-deep' }, { title: 'Offerte De Smid', color: 'bg-sage-light border-sage text-sage-deep' }] },
    { day: 'Di 18', items: [{ title: 'Raambelettering Van Dijk', color: 'bg-lavender-light border-lavender text-lavender-deep' }] },
    { day: 'Wo 19', items: [{ title: 'Wayfinding Gemeente', color: 'bg-mist-light border-mist text-mist-deep' }, { title: 'Montage LED', color: 'bg-peach-light border-peach text-peach-deep' }] },
    { day: 'Do 20', items: [{ title: 'Terrasschermen caf\u00E9', color: 'bg-cream-light border-cream text-cream-deep' }] },
    { day: 'Vr 21', items: [] },
  ];

  return (
    <div className="bg-bg p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-heading font-bold text-ink">Planning</h3>
          <p className="text-[13px] text-ink-40">Week 12 &middot; Maart 2026</p>
        </div>
        <div className="flex gap-2">
          <span className="bg-ink-05 text-ink-60 text-[12px] px-3 py-1.5 rounded-full font-medium">Week</span>
          <span className="text-ink-40 text-[12px] px-3 py-1.5 rounded-full font-medium">Maand</span>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-3">
        {days.map((d, di) => (
          <div key={d.day}>
            <p className="font-mono text-[11px] text-ink-40 uppercase tracking-wide mb-2 text-center">{d.day}</p>
            <div className="space-y-2 min-h-[120px]">
              {d.items.map((item, ii) => (
                <div
                  key={item.title}
                  className={`rounded-lg border px-2.5 py-2 text-[11px] font-medium ${item.color}`}
                  style={{ opacity: animate ? 1 : 0, transform: animate ? 'translateY(0)' : 'translateY(8px)', transition: `all 0.4s ease ${0.15 + di * 0.08 + ii * 0.05}s` }}
                >
                  {item.title}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KlantportaalView({ animate }: { animate: boolean }) {
  return (
    <div className="bg-bg p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-heading font-bold text-ink">Klantportaal</h3>
          <p className="text-[13px] text-ink-40">Brouwer Reclame &middot; Ingelogd als klant</p>
        </div>
        <span className="bg-blush-light text-blush-deep text-[11px] font-semibold px-3 py-1 rounded-full">1 offerte wacht op goedkeuring</span>
      </div>
      <div
        className="rounded-xl border border-ink-10 bg-white p-5 mb-4"
        style={{ opacity: animate ? 1 : 0, transform: animate ? 'translateY(0)' : 'translateY(12px)', transition: 'all 0.5s ease 0.1s' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-medium text-ink text-[14px]">Offerte OFF-2026-042</p>
            <p className="text-[12px] text-ink-40">Lichtreclame gevelletters &middot; &euro;4.250,00</p>
          </div>
          <span className="bg-[#FEF3C7] text-[#92400E] text-[10px] font-semibold px-2.5 py-1 rounded-full">Wacht op goedkeuring</span>
        </div>
        <div className="flex gap-3">
          <button className="bg-sage text-white text-[13px] px-5 py-2 rounded-full font-semibold">Goedkeuren</button>
          <button className="bg-ink-05 text-ink-60 text-[13px] px-5 py-2 rounded-full font-medium">Bekijk PDF</button>
        </div>
      </div>
      <div
        className="rounded-xl border border-ink-10 bg-white p-5"
        style={{ opacity: animate ? 1 : 0, transform: animate ? 'translateY(0)' : 'translateY(12px)', transition: 'all 0.5s ease 0.25s' }}
      >
        <p className="font-mono text-[11px] text-ink-40 uppercase tracking-wide mb-3">Berichten</p>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-ink flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">FD</div>
            <div className="bg-ink-05 rounded-xl px-3 py-2 text-[13px] text-ink-60 max-w-[80%]">
              Goedemiddag! De offerte voor de gevelletters staat klaar. Laat gerust weten als je vragen hebt.
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <div className="bg-sage-light rounded-xl px-3 py-2 text-[13px] text-sage-deep max-w-[80%]">
              Ziet er goed uit! Kunnen jullie maandag beginnen?
            </div>
            <div className="w-7 h-7 rounded-full bg-blush flex items-center justify-center text-blush-deep text-[10px] font-bold flex-shrink-0">BR</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppPreview() {
  const { ref, isInView } = useInView();
  const [activeTab, setActiveTab] = useState(0);
  const [animateContent, setAnimateContent] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);

  // Auto-rotate tabs
  useEffect(() => {
    if (!isInView || !autoRotate) return;
    const timer = setInterval(() => {
      setAnimateContent(false);
      setTimeout(() => {
        setActiveTab((prev) => (prev + 1) % tabs.length);
        setAnimateContent(true);
      }, 150);
    }, 4000);
    return () => clearInterval(timer);
  }, [isInView, autoRotate]);

  const handleTabClick = (index: number) => {
    setAutoRotate(false);
    setAnimateContent(false);
    setTimeout(() => {
      setActiveTab(index);
      setAnimateContent(true);
    }, 150);
  };

  const views = [
    <OffertesView key="offertes" animate={animateContent} />,
    <WerkbonnenView key="werkbonnen" animate={animateContent} />,
    <PlanningView key="planning" animate={animateContent} />,
    <KlantportaalView key="klantportaal" animate={animateContent} />,
  ];

  return (
    <section ref={ref} className="relative" style={{ paddingTop: 40, paddingBottom: 80 }}>
      <div className="max-w-[1040px] mx-auto px-6">
        <div
          className="browser-frame glow-border transition-all duration-1000"
          style={{
            opacity: isInView ? 1 : 0,
            transform: isInView ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.96)',
          }}
        >
          {/* Browser chrome with tabs */}
          <div className="bg-ink-05 border-b border-ink-10 px-4 py-3 flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-ink-20" />
              <div className="w-3 h-3 rounded-full bg-ink-20" />
              <div className="w-3 h-3 rounded-full bg-ink-20" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="bg-white rounded-md px-4 py-1 text-[11px] text-ink-40 font-mono border border-ink-10 max-w-[240px] w-full text-center">
                app.forgedesk.io
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div className="bg-white border-b border-ink-10 px-6 flex gap-1 overflow-x-auto">
            {tabs.map((tab, i) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(i)}
                className={`px-4 py-2.5 text-[13px] font-medium transition-all relative whitespace-nowrap ${
                  activeTab === i ? 'text-ink' : 'text-ink-40 hover:text-ink-60'
                }`}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
                {activeTab === i && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-ink rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="min-h-[320px] transition-opacity duration-150" style={{ opacity: animateContent ? 1 : 0 }}>
            {views[activeTab]}
          </div>
        </div>
      </div>

      {/* Floating notification — pops out of the frame */}
      <div
        className="absolute -right-2 md:right-8 top-[180px] z-20 hidden md:block float-element"
        style={{
          opacity: isInView ? 1 : 0,
          transform: isInView ? 'translateX(0)' : 'translateX(40px)',
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.8s',
          animationDelay: '1s',
        }}
      >
        <div className="bg-white rounded-xl shadow-lg border border-ink-10 p-3 flex items-center gap-3 max-w-[220px]">
          <div className="w-8 h-8 rounded-full bg-sage-light flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 8l3 3 5-5" stroke="#5A8264" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="text-[12px] font-semibold text-ink">Offerte goedgekeurd</p>
            <p className="text-[11px] text-ink-40">Brouwer Reclame</p>
          </div>
        </div>
      </div>
    </section>
  );
}
