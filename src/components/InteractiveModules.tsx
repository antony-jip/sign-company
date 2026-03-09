'use client';

import React, { useState } from 'react';
import { useScrollAnimation } from './useScrollAnimation';

/* ─── Mini Offerte Builder ─── */
const OfferteBuilder: React.FC = () => {
  const [lines, setLines] = useState([
    { id: 1, desc: 'LED lichtreclame', qty: 1, price: 960 },
    { id: 2, desc: 'Montage', qty: 4, price: 120 },
    { id: 3, desc: 'Transport', qty: 1, price: 85 },
  ]);

  const addLine = () => {
    setLines(prev => [...prev, { id: Date.now(), desc: '', qty: 1, price: 0 }]);
  };

  const removeLine = (id: number) => {
    if (lines.length > 1) setLines(prev => prev.filter(l => l.id !== id));
  };

  const updateLine = (id: number, field: string, value: string | number) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const subtotal = lines.reduce((sum, l) => sum + l.qty * l.price, 0);
  const btw = subtotal * 0.21;
  const total = subtotal + btw;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-blush/30 p-5 interactive-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blush-light flex items-center justify-center">
            <svg className="w-4 h-4 text-blush-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">Offerte Builder</p>
            <p className="text-xs text-gray-400">OFF-2026-052</p>
          </div>
        </div>
        <span className="pastel-pill bg-blush-light text-blush-deep">Concept</span>
      </div>

      {/* Lines */}
      <div className="space-y-2 mb-3">
        {lines.map((line) => (
          <div key={line.id} className="flex items-center gap-2 group">
            <input
              type="text"
              value={line.desc}
              onChange={(e) => updateLine(line.id, 'desc', e.target.value)}
              placeholder="Omschrijving..."
              className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-sm border border-gray-100 focus:outline-none focus:ring-2 focus:ring-blush/50 min-w-0"
            />
            <input
              type="number"
              value={line.qty}
              onChange={(e) => updateLine(line.id, 'qty', Number(e.target.value))}
              className="w-14 bg-gray-50 rounded-lg px-2 py-2 text-sm text-center border border-gray-100 focus:outline-none focus:ring-2 focus:ring-blush/50"
              min={1}
            />
            <div className="relative w-24">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">&euro;</span>
              <input
                type="number"
                value={line.price}
                onChange={(e) => updateLine(line.id, 'price', Number(e.target.value))}
                className="w-full bg-gray-50 rounded-lg pl-7 pr-2 py-2 text-sm text-right border border-gray-100 focus:outline-none focus:ring-2 focus:ring-blush/50"
              />
            </div>
            <button
              onClick={() => removeLine(line.id)}
              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all p-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addLine}
        className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400 hover:text-blush-deep hover:border-blush transition-colors flex items-center justify-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Regel toevoegen
      </button>

      {/* Totals */}
      <div className="mt-4 pt-3 border-t border-gray-100 space-y-1">
        <div className="flex justify-between text-sm text-gray-500">
          <span>Subtotaal</span>
          <span>&euro;{subtotal.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-500">
          <span>BTW 21%</span>
          <span>&euro;{btw.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-base font-bold text-gray-900 pt-1">
          <span>Totaal</span>
          <span>&euro;{total.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>
  );
};

/* ─── Mini Planning Board ─── */
const PlanningBoard: React.FC = () => {
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Montage lichtreclame', client: 'Bakkerij Jansen', time: '09:00-14:00', team: 'Joris, Mark', color: 'blush', day: 'Ma 14' },
    { id: 2, title: 'Opmeting gevel', client: 'Matec Amsterdam', time: '10:00-11:30', team: 'Lisa', color: 'sage', day: 'Di 15' },
    { id: 3, title: 'Productie freesletters', client: 'Intern', time: 'Hele dag', team: 'Werkplaats', color: 'mist', day: 'Wo 16' },
    { id: 4, title: 'Wrapping bedrijfsbus', client: 'Loodgieter Van Dijk', time: '08:00-17:00', team: 'Tom, Sara', color: 'lavender', day: 'Do 17' },
  ]);

  const [dragId, setDragId] = useState<number | null>(null);

  const handleDragStart = (id: number) => setDragId(id);
  const handleDragOver = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (dragId === null || dragId === targetId) return;
    setTasks(prev => {
      const items = [...prev];
      const dragIndex = items.findIndex(t => t.id === dragId);
      const targetIndex = items.findIndex(t => t.id === targetId);
      const [dragged] = items.splice(dragIndex, 1);
      items.splice(targetIndex, 0, dragged);
      return items;
    });
  };

  const colorMap: Record<string, string> = {
    blush: 'border-l-blush bg-blush-light/40',
    sage: 'border-l-sage bg-sage-light/40',
    mist: 'border-l-mist bg-mist-light/40',
    lavender: 'border-l-lavender bg-lavender-light/40',
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-sage/30 p-5 interactive-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sage-light flex items-center justify-center">
            <svg className="w-4 h-4 text-sage-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">Weekplanning</p>
            <p className="text-xs text-gray-400">Week 12 &middot; Maart 2026</p>
          </div>
        </div>
        <span className="pastel-pill bg-sage-light text-sage-deep">
          {tasks.length} taken
        </span>
      </div>

      <div className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            draggable
            onDragStart={() => handleDragStart(task.id)}
            onDragOver={(e) => handleDragOver(e, task.id)}
            className={`flex items-center gap-3 p-3 rounded-xl border-l-4 cursor-grab active:cursor-grabbing transition-all hover:scale-[1.01] ${colorMap[task.color]}`}
          >
            <div className="w-12 text-xs font-bold text-gray-400 flex-shrink-0">{task.day}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{task.title}</p>
              <p className="text-xs text-gray-500 truncate">{task.client} &middot; {task.time}</p>
            </div>
            <div className="flex-shrink-0">
              <span className="text-xs text-gray-400">{task.team}</span>
            </div>
            <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-3 text-center">Sleep om te herordenen</p>
    </div>
  );
};

/* ─── Mini Dashboard ─── */
const DashboardPreview: React.FC = () => {
  const [period, setPeriod] = useState<'week' | 'maand' | 'jaar'>('maand');

  const data = {
    week: { omzet: 3800, offertes: 3, projecten: 2, conversie: 78 },
    maand: { omzet: 14850, offertes: 12, projecten: 4, conversie: 72 },
    jaar: { omzet: 168400, offertes: 134, projecten: 48, conversie: 68 },
  };

  const bars = {
    week: [40, 65, 50, 80, 55, 70, 90],
    maand: [45, 60, 75, 50, 85, 65, 70, 90, 55, 80, 95, 60],
    jaar: [60, 45, 70, 80, 55, 90, 85, 75, 65, 95, 80, 70],
  };

  const d = data[period];
  const b = bars[period];

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-mist/30 p-5 interactive-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-mist-light flex items-center justify-center">
            <svg className="w-4 h-4 text-mist-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">Dashboard</p>
            <p className="text-xs text-gray-400">Realtime inzicht</p>
          </div>
        </div>
        <div className="flex gap-1 bg-gray-50 rounded-lg p-0.5">
          {(['week', 'maand', 'jaar'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-xs font-medium px-2.5 py-1 rounded-md transition-all ${
                period === p ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-blush-light/40 rounded-xl p-3">
          <p className="text-xs text-blush-deep font-medium">Omzet</p>
          <p className="text-lg font-bold text-gray-900">&euro;{d.omzet.toLocaleString('nl-NL')}</p>
        </div>
        <div className="bg-sage-light/40 rounded-xl p-3">
          <p className="text-xs text-sage-deep font-medium">Offertes</p>
          <p className="text-lg font-bold text-gray-900">{d.offertes}</p>
        </div>
        <div className="bg-mist-light/40 rounded-xl p-3">
          <p className="text-xs text-mist-deep font-medium">Projecten</p>
          <p className="text-lg font-bold text-gray-900">{d.projecten}</p>
        </div>
        <div className="bg-lavender-light/40 rounded-xl p-3">
          <p className="text-xs text-lavender-deep font-medium">Conversie</p>
          <p className="text-lg font-bold text-gray-900">{d.conversie}%</p>
        </div>
      </div>

      {/* Mini chart */}
      <div className="bg-gray-50 rounded-xl p-3">
        <p className="text-xs font-semibold text-gray-400 mb-2">Omzet trend</p>
        <div className="flex items-end gap-1 h-16">
          {b.map((val, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm transition-all duration-500"
              style={{
                height: `${val}%`,
                background: `linear-gradient(to top, ${
                  i === b.length - 1 ? '#7DB88A' : '#C8D5CC'
                }, ${
                  i === b.length - 1 ? '#5A8264' : '#E4EBE6'
                })`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─── Main Interactive Modules Section ─── */
export const InteractiveModules: React.FC = () => {
  const ref = useScrollAnimation();

  return (
    <section ref={ref} className="py-20 lg:py-32 bg-gradient-to-b from-white to-[#FAFAF7]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12 lg:mb-16">
          <div className="fade-up inline-flex items-center gap-2 bg-peach-light/60 text-peach-deep px-4 py-2 rounded-full text-sm font-semibold mb-6 border border-peach/30">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
            </svg>
            Probeer het zelf
          </div>
          <h2 className="fade-up stagger-1 text-4xl lg:text-5xl font-black tracking-tight mb-4">
            Voel hoe het <span className="text-gradient-pastel">werkt</span>
          </h2>
          <p className="fade-up stagger-2 text-lg text-gray-500 max-w-2xl mx-auto">
            Geen screenshots, geen video&apos;s — probeer de modules zelf uit. Bouw een offerte, versleep je planning,
            of bekijk je dashboard. Precies zoals het in de app werkt.
          </p>
        </div>

        {/* Module grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="fade-up stagger-1">
            <OfferteBuilder />
          </div>
          <div className="fade-up stagger-2">
            <PlanningBoard />
          </div>
          <div className="fade-up stagger-3">
            <DashboardPreview />
          </div>
        </div>

        {/* CTA under modules */}
        <div className="fade-up stagger-4 text-center mt-12">
          <p className="text-gray-400 text-sm mb-4">Dit is slechts een voorproefje. De echte app heeft nog veel meer.</p>
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-bold px-8 py-4 rounded-2xl transition-all hover:scale-105"
          >
            Bekijk alle modules
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
};

export default InteractiveModules;
