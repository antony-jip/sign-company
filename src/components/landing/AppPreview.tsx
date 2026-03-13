'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const tabs = [
  { id: 'offertes', label: 'Offertes', icon: '📋' },
  { id: 'werkbonnen', label: 'Werkbonnen', icon: '🔧' },
  { id: 'planning', label: 'Planning', icon: '📅' },
  { id: 'klantportaal', label: 'Klantportaal', icon: '👤' },
];

/* ── Animation variants ────────────────────────────────────────── */

const rowStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const rowFade = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 150 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

const slideIn = {
  hidden: { opacity: 0, x: -14 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { type: 'spring', damping: 25, stiffness: 150, delay: 0.05 + i * 0.08 },
  }),
};

const photoFade = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', damping: 20, stiffness: 120, delay: 0.2 + i * 0.08 },
  }),
};

const cardUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { type: 'spring', damping: 25, stiffness: 140, delay },
  }),
};

const planItem = {
  hidden: { opacity: 0, y: 10 },
  visible: (d: number) => ({
    opacity: 1,
    y: 0,
    transition: { type: 'spring', damping: 22, stiffness: 130, delay: d },
  }),
};

/* ── Tab content views ─────────────────────────────────────────── */

function OffertesView() {
  return (
    <div className="bg-bg p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-heading font-bold text-ink">Offertes</h3>
          <p className="text-[13px] text-ink-40">12 offertes deze maand</p>
        </div>
        <motion.div
          className="bg-ink text-white text-[13px] px-4 py-2 rounded-full font-semibold"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
        >
          + Nieuwe offerte
        </motion.div>
      </div>
      <div className="hidden sm:grid grid-cols-5 gap-4 text-[12px] font-mono font-medium text-ink-40 uppercase tracking-[0.06em] pb-3 border-b border-ink-10">
        <span>Nummer</span><span>Klant</span><span>Omschrijving</span><span>Bedrag</span><span>Status</span>
      </div>
      <motion.div initial="hidden" animate="visible" variants={rowStagger}>
        {[
          { nr: 'OFF-2026-042', klant: 'Brouwer Reclame', omschrijving: 'Lichtreclame gevelletters', bedrag: '\u20AC 4.250,00', status: 'Verstuurd', statusClass: 'bg-[#FEF3C7] text-[#92400E]' },
          { nr: 'OFF-2026-041', klant: 'Van Dijk Interieur', omschrijving: 'Raambelettering 3 filialen', bedrag: '\u20AC 1.890,00', status: 'Akkoord', statusClass: 'bg-sage-light text-sage-deep' },
          { nr: 'OFF-2026-040', klant: 'Gemeente Utrecht', omschrijving: 'Wayfinding borden parkeergarage', bedrag: '\u20AC 6.750,00', status: 'Concept', statusClass: 'bg-mist-light text-mist-deep' },
          { nr: 'OFF-2026-039', klant: 'Café De Smid', omschrijving: 'Terrasschermen + uithangbord', bedrag: '\u20AC 2.340,00', status: 'Gefactureerd', statusClass: 'bg-lavender-light text-lavender-deep' },
        ].map((row) => (
          <motion.div
            key={row.nr}
            className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4 py-3 border-b border-ink-05 items-center text-sm"
            variants={rowFade}
          >
            <span className="font-mono text-[11px] text-ink-40">{row.nr}</span>
            <span className="font-medium text-ink">{row.klant}</span>
            <span className="text-ink-60 hidden sm:block">{row.omschrijving}</span>
            <span className="font-mono font-medium text-ink">{row.bedrag}</span>
            <span><span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-semibold ${row.statusClass}`}>{row.status}</span></span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

function WerkbonnenView() {
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
            <motion.div
              key={task}
              className="flex items-center gap-3 py-2 border-b border-ink-05"
              initial="hidden"
              animate="visible"
              custom={i}
              variants={slideIn}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${i === 0 ? 'border-sage-vivid bg-sage-light' : 'border-ink-20'}`}>
                {i === 0 && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 6l2 2 4-4" stroke="#5A8264" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </div>
              <span className={`text-[14px] ${i === 0 ? 'text-ink-40 line-through' : 'text-ink'}`}>{task}</span>
            </motion.div>
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
              <motion.div
                key={photo.label}
                className={`aspect-[4/3] rounded-lg ${photo.bg} flex items-center justify-center text-[12px] text-ink-40 ${photo.isDashed ? 'border-2 border-dashed border-ink-20' : ''}`}
                initial="hidden"
                animate="visible"
                custom={i}
                variants={photoFade}
              >
                {photo.label}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanningView() {
  const days = [
    { day: 'Ma 17', items: [{ title: 'Gevelletters Brouwer', color: 'bg-blush-light border-blush text-blush-deep' }, { title: 'Offerte De Smid', color: 'bg-sage-light border-sage text-sage-deep' }] },
    { day: 'Di 18', items: [{ title: 'Raambelettering Van Dijk', color: 'bg-lavender-light border-lavender text-lavender-deep' }] },
    { day: 'Wo 19', items: [{ title: 'Wayfinding Gemeente', color: 'bg-mist-light border-mist text-mist-deep' }, { title: 'Montage LED', color: 'bg-peach-light border-peach text-peach-deep' }] },
    { day: 'Do 20', items: [{ title: 'Terrasschermen café', color: 'bg-cream-light border-cream text-cream-deep' }] },
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
                <motion.div
                  key={item.title}
                  className={`rounded-lg border px-2.5 py-2 text-[11px] font-medium ${item.color}`}
                  initial="hidden"
                  animate="visible"
                  custom={0.1 + di * 0.06 + ii * 0.04}
                  variants={planItem}
                >
                  {item.title}
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KlantportaalView() {
  return (
    <div className="bg-bg p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-heading font-bold text-ink">Klantportaal</h3>
          <p className="text-[13px] text-ink-40">Brouwer Reclame &middot; Ingelogd als klant</p>
        </div>
        <span className="bg-blush-light text-blush-deep text-[11px] font-semibold px-3 py-1 rounded-full">1 offerte wacht op goedkeuring</span>
      </div>
      <motion.div
        className="rounded-xl border border-ink-10 bg-white p-5 mb-4"
        initial="hidden"
        animate="visible"
        custom={0.1}
        variants={cardUp}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-medium text-ink text-[14px]">Offerte OFF-2026-042</p>
            <p className="text-[12px] text-ink-40">Lichtreclame gevelletters &middot; &euro;4.250,00</p>
          </div>
          <span className="bg-[#FEF3C7] text-[#92400E] text-[10px] font-semibold px-2.5 py-1 rounded-full">Wacht op goedkeuring</span>
        </div>
        <div className="flex gap-3">
          <motion.button
            className="bg-sage text-white text-[13px] px-5 py-2 rounded-full font-semibold"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
          >
            Goedkeuren
          </motion.button>
          <motion.button
            className="bg-ink-05 text-ink-60 text-[13px] px-5 py-2 rounded-full font-medium"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
          >
            Bekijk PDF
          </motion.button>
        </div>
      </motion.div>
      <motion.div
        className="rounded-xl border border-ink-10 bg-white p-5"
        initial="hidden"
        animate="visible"
        custom={0.25}
        variants={cardUp}
      >
        <p className="font-mono text-[11px] text-ink-40 uppercase tracking-wide mb-3">Berichten</p>
        <div className="space-y-3">
          <motion.div className="flex gap-3" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35, type: 'spring', damping: 25 }}>
            <div className="w-7 h-7 rounded-full bg-ink flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">FD</div>
            <div className="bg-ink-05 rounded-xl px-3 py-2 text-[13px] text-ink-60 max-w-[80%]">
              Goedemiddag! De offerte voor de gevelletters staat klaar. Laat gerust weten als je vragen hebt.
            </div>
          </motion.div>
          <motion.div className="flex gap-3 justify-end" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5, type: 'spring', damping: 25 }}>
            <div className="bg-sage-light rounded-xl px-3 py-2 text-[13px] text-sage-deep max-w-[80%]">
              Ziet er goed uit! Kunnen jullie maandag beginnen?
            </div>
            <div className="w-7 h-7 rounded-full bg-blush flex items-center justify-center text-blush-deep text-[10px] font-bold flex-shrink-0">BR</div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Tab content animation wrapper ─────────────────────────────── */

const tabContentVariants = {
  enter: { opacity: 0, y: 12 },
  center: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 150 } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.15 } },
};

/* ── Main component ────────────────────────────────────────────── */

export default function AppPreview() {
  const [activeTab, setActiveTab] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [isInView, setIsInView] = useState(false);

  // Auto-rotate tabs
  useEffect(() => {
    if (!isInView || !autoRotate) return;
    const timer = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % tabs.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [isInView, autoRotate]);

  const handleTabClick = (index: number) => {
    setAutoRotate(false);
    setActiveTab(index);
  };

  const views = [
    <OffertesView key="offertes" />,
    <WerkbonnenView key="werkbonnen" />,
    <PlanningView key="planning" />,
    <KlantportaalView key="klantportaal" />,
  ];

  return (
    <section className="relative" style={{ paddingTop: 40, paddingBottom: 80 }}>
      <div className="max-w-[1040px] mx-auto px-6">
        <motion.div
          className="browser-frame glow-border"
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ type: 'spring', damping: 22, stiffness: 80 }}
          onViewportEnter={() => setIsInView(true)}
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
                className={`px-4 py-2.5 text-[13px] font-medium transition-colors relative whitespace-nowrap ${
                  activeTab === i ? 'text-ink' : 'text-ink-40 hover:text-ink-60'
                }`}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
                {activeTab === i && (
                  <motion.span
                    className="absolute bottom-0 left-2 right-2 h-[2px] bg-ink rounded-full"
                    layoutId="activeTab"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Content with AnimatePresence */}
          <div className="min-h-[320px] overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                variants={tabContentVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                {views[activeTab]}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Floating notification */}
      <motion.div
        className="absolute -right-2 md:right-8 top-[180px] z-20 hidden md:block"
        initial={{ opacity: 0, x: 40, scale: 0.9 }}
        whileInView={{ opacity: 1, x: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.8 }}
      >
        <motion.div
          className="bg-white rounded-xl shadow-lg border border-ink-10 p-3 flex items-center gap-3 max-w-[220px]"
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
        >
          <div className="w-8 h-8 rounded-full bg-sage-light flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 8l3 3 5-5" stroke="#5A8264" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="text-[12px] font-semibold text-ink">Offerte goedgekeurd</p>
            <p className="text-[11px] text-ink-40">Brouwer Reclame</p>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
