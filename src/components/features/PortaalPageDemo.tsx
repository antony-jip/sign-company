'use client';

import React, { useState, useRef, useCallback } from 'react';

/* ─── Confetti Particle ─── */
interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  scale: number;
  delay: number;
}

const ConfettiOverlay: React.FC<{ show: boolean }> = ({ show }) => {
  const particles: Particle[] = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    x: 10 + Math.random() * 80,
    y: -10 - Math.random() * 20,
    color: ['#5A8264', '#7DB88A', '#C8D5CC', '#FFD700', '#F0A080', '#A48BBF'][i % 6],
    rotation: Math.random() * 360,
    scale: 0.6 + Math.random() * 0.6,
    delay: Math.random() * 0.5,
  }));

  if (!show) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-2.5 h-2.5 rounded-sm animate-confetti"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            backgroundColor: p.color,
            transform: `rotate(${p.rotation}deg) scale(${p.scale})`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti {
          0% { opacity: 1; transform: translateY(0) rotate(0deg); }
          100% { opacity: 0; transform: translateY(400px) rotate(720deg); }
        }
        .animate-confetti {
          animation: confetti 1.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

/* ─── Payment Loading Animation ─── */
const PaymentAnimation: React.FC<{ stage: 'idle' | 'loading' | 'done' }> = ({ stage }) => {
  if (stage === 'idle') return null;

  return (
    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center z-20 rounded-xl">
      {stage === 'loading' && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-sage-light border-t-sage-deep rounded-full animate-spin" />
          <p className="text-sm font-medium text-gray-500">Betaling verwerken...</p>
        </div>
      )}
      {stage === 'done' && (
        <div className="flex flex-col items-center gap-3 animate-scale-in">
          <div className="w-14 h-14 rounded-full bg-sage-deep flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <p className="text-lg font-bold text-sage-deep">Betaald!</p>
          <p className="text-xs text-gray-400">Bevestiging verstuurd per e-mail</p>
        </div>
      )}
      <style>{`
        @keyframes scaleIn {
          0% { opacity: 0; transform: scale(0.5); }
          50% { transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in { animation: scaleIn 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
};

/* ═══════════════════════════════════════
   TAB 1: Offerte
   ═══════════════════════════════════════ */
const OfferteTab: React.FC = () => {
  const [approved, setApproved] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showWijziging, setShowWijziging] = useState(false);
  const [wijzigingText, setWijzigingText] = useState('');
  const [wijzigingVerstuurd, setWijzigingVerstuurd] = useState(false);

  const handleGoedkeuren = () => {
    setApproved(true);
    setShowConfetti(true);
    setShowWijziging(false);
    setTimeout(() => setShowConfetti(false), 2500);
  };

  const handleVerstuurWijziging = () => {
    if (!wijzigingText.trim()) return;
    setWijzigingVerstuurd(true);
    setTimeout(() => {
      setShowWijziging(false);
      setWijzigingVerstuurd(false);
      setWijzigingText('');
    }, 2000);
  };

  const offerteRegels = [
    { omschrijving: 'LED lichtreclame 200x40cm', aantal: 1, prijs: 960 },
    { omschrijving: 'Montage op locatie (4 uur)', aantal: 1, prijs: 480 },
    { omschrijving: 'Transport en opslag', aantal: 1, prijs: 85 },
    { omschrijving: 'Aansluiting elektra', aantal: 1, prijs: 195 },
  ];

  const subtotaal = offerteRegels.reduce((sum, r) => sum + r.aantal * r.prijs, 0);
  const btw = subtotaal * 0.21;
  const totaal = subtotaal + btw;

  return (
    <div className="relative">
      <ConfettiOverlay show={showConfetti} />

      {/* Offerte header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Offerte</p>
          <p className="text-lg font-bold text-gray-900">OFF-2026-052</p>
        </div>
        {approved && (
          <div className="flex items-center gap-2 bg-sage-light px-3 py-1.5 rounded-full animate-scale-in">
            <svg className="w-4 h-4 text-sage-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-bold text-sage-deep">Goedgekeurd!</span>
          </div>
        )}
      </div>

      {/* Offerte tabel */}
      <div className="border border-gray-100 rounded-xl overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase">Omschrijving</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase text-center">Aantal</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase text-right">Prijs</th>
            </tr>
          </thead>
          <tbody>
            {offerteRegels.map((regel, i) => (
              <tr key={i} className="border-t border-gray-50">
                <td className="px-4 py-3 text-gray-700">{regel.omschrijving}</td>
                <td className="px-4 py-3 text-gray-500 text-center">{regel.aantal}</td>
                <td className="px-4 py-3 text-gray-900 font-medium text-right">&euro;{regel.prijs.toLocaleString('nl-NL')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totalen */}
      <div className="bg-gray-50 rounded-xl p-4 mb-5">
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>Subtotaal</span>
          <span>&euro;{subtotaal.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>BTW (21%)</span>
          <span>&euro;{btw.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
          <span>Totaal</span>
          <span>&euro;{totaal.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Acties */}
      {!approved && !showWijziging && (
        <div className="flex gap-3">
          <button
            onClick={handleGoedkeuren}
            className="flex-1 flex items-center justify-center gap-2 bg-sage-deep hover:bg-sage-vivid text-white font-semibold py-3 rounded-xl transition-all hover:scale-[1.02]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Goedkeuren
          </button>
          <button
            onClick={() => setShowWijziging(true)}
            className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-all hover:scale-[1.02]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
            Wijziging aanvragen
          </button>
        </div>
      )}

      {/* Wijziging formulier */}
      {showWijziging && !wijzigingVerstuurd && (
        <div className="border border-orange-200 bg-orange-50/50 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Wat wil je laten aanpassen?</p>
          <textarea
            value={wijzigingText}
            onChange={(e) => setWijzigingText(e.target.value)}
            placeholder="Beschrijf je gewenste wijziging..."
            className="w-full bg-white border border-orange-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none h-20"
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleVerstuurWijziging}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
              Verstuur
            </button>
            <button
              onClick={() => { setShowWijziging(false); setWijzigingText(''); }}
              className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2.5 transition-colors"
            >
              Annuleer
            </button>
          </div>
        </div>
      )}

      {/* Wijziging verstuurd bevestiging */}
      {wijzigingVerstuurd && (
        <div className="border border-sage/30 bg-sage-light/50 rounded-xl p-4 flex items-center gap-3 animate-scale-in">
          <div className="w-8 h-8 rounded-full bg-sage-deep flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-sage-deep">Wijziging verstuurd!</p>
            <p className="text-xs text-gray-500">Je ontvangt bericht zodra de offerte is aangepast.</p>
          </div>
        </div>
      )}

      {/* Bekeken timestamp */}
      <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Bekeken door klant op 13 mrt 2026 om 14:32
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════
   TAB 2: Ontwerp
   ═══════════════════════════════════════ */
interface Pin {
  id: number;
  x: number;
  y: number;
  comment: string;
  editing: boolean;
}

const OntwerpTab: React.FC = () => {
  const [pins, setPins] = useState<Pin[]>([]);
  const [editingText, setEditingText] = useState('');
  const svgRef = useRef<HTMLDivElement>(null);

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (pins.length >= 5) return;
    // Don't place pin if clicking on existing pin or input
    const target = e.target as HTMLElement;
    if (target.closest('[data-pin]') || target.closest('[data-pin-input]')) return;

    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Close any open editing pins without comment
    setPins(prev => prev.map(p => p.editing ? { ...p, editing: false } : p));

    const newPin: Pin = {
      id: Date.now(),
      x,
      y,
      comment: '',
      editing: true,
    };

    setPins(prev => [...prev, newPin]);
    setEditingText('');
  }, [pins.length]);

  const handleSaveComment = (pinId: number) => {
    setPins(prev =>
      prev.map(p =>
        p.id === pinId ? { ...p, comment: editingText || `Opmerking ${prev.indexOf(p) + 1}`, editing: false } : p
      )
    );
    setEditingText('');
  };

  const handleRemovePin = (pinId: number) => {
    setPins(prev => prev.filter(p => p.id !== pinId));
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Design canvas */}
      <div className="flex-1">
        <div
          ref={svgRef}
          className="relative rounded-xl overflow-hidden cursor-crosshair bg-gradient-to-b from-sky-100 to-sky-50 border border-gray-200"
          onClick={handleImageClick}
          style={{ minHeight: '320px' }}
        >
          {/* Building facade SVG */}
          <svg viewBox="0 0 500 320" className="w-full h-auto" fill="none">
            {/* Sky */}
            <rect width="500" height="320" fill="url(#sky)" />
            <defs>
              <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E0F2FE" />
                <stop offset="100%" stopColor="#F0F9FF" />
              </linearGradient>
            </defs>
            {/* Ground */}
            <rect x="0" y="260" width="500" height="60" fill="#E2E8F0" />
            <rect x="0" y="258" width="500" height="4" fill="#CBD5E1" />
            {/* Building */}
            <rect x="60" y="70" width="380" height="190" rx="4" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="2" />
            {/* Sign board */}
            <rect x="120" y="30" width="260" height="36" rx="6" fill="#1E293B" />
            <rect x="122" y="32" width="256" height="32" rx="5" fill="#0F172A" />
            <text x="250" y="54" textAnchor="middle" fill="#7DB88A" fontSize="16" fontWeight="800" fontFamily="sans-serif">BAKKERIJ JANSEN</text>
            {/* LED glow */}
            <ellipse cx="250" cy="68" rx="100" ry="5" fill="#7DB88A" opacity="0.12" />
            {/* Windows row 1 */}
            <rect x="85" y="90" width="55" height="45" rx="3" fill="#DBEAFE" stroke="#BFDBFE" />
            <rect x="160" y="90" width="55" height="45" rx="3" fill="#DBEAFE" stroke="#BFDBFE" />
            <rect x="235" y="90" width="55" height="45" rx="3" fill="#DBEAFE" stroke="#BFDBFE" />
            <rect x="310" y="90" width="55" height="45" rx="3" fill="#DBEAFE" stroke="#BFDBFE" />
            {/* Windows row 2 */}
            <rect x="85" y="155" width="55" height="45" rx="3" fill="#DBEAFE" stroke="#BFDBFE" />
            <rect x="160" y="155" width="55" height="45" rx="3" fill="#DBEAFE" stroke="#BFDBFE" />
            <rect x="310" y="155" width="55" height="45" rx="3" fill="#DBEAFE" stroke="#BFDBFE" />
            {/* Door */}
            <rect x="225" y="175" width="50" height="85" rx="3" fill="#94A3B8" stroke="#64748B" />
            <circle cx="267" cy="220" r="3" fill="#CBD5E1" />
            {/* Awning */}
            <path d="M215 175 L275 175 L280 165 L210 165 Z" fill="#5A8264" opacity="0.7" />
            {/* Window displays */}
            <rect x="85" y="220" width="120" height="40" rx="2" fill="#FEF3C7" stroke="#FDE68A" />
            <text x="145" y="244" textAnchor="middle" fill="#92400E" fontSize="8" fontWeight="600">VERS BROOD</text>
            <rect x="295" y="220" width="120" height="40" rx="2" fill="#FEF3C7" stroke="#FDE68A" />
            <text x="355" y="244" textAnchor="middle" fill="#92400E" fontSize="8" fontWeight="600">GEBAK &amp; TAART</text>
          </svg>

          {/* Placed pins */}
          {pins.map((pin, i) => (
            <div key={pin.id} data-pin style={{ position: 'absolute', left: `${pin.x}%`, top: `${pin.y}%`, transform: 'translate(-50%, -50%)' }}>
              <div className="w-7 h-7 rounded-full bg-sage-deep text-white text-xs font-bold flex items-center justify-center shadow-lg border-2 border-white cursor-pointer hover:scale-110 transition-transform">
                {i + 1}
              </div>
              {/* Comment input popover */}
              {pin.editing && (
                <div
                  data-pin-input
                  className="absolute top-9 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl border border-sage/30 p-3 w-52 z-30"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="text"
                    autoFocus
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveComment(pin.id); }}
                    placeholder="Typ je opmerking..."
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sage/50 mb-2"
                  />
                  <button
                    onClick={() => handleSaveComment(pin.id)}
                    className="w-full bg-sage-deep hover:bg-sage-vivid text-white text-xs font-semibold py-1.5 rounded-lg transition-colors"
                  >
                    Opslaan
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Hint overlay */}
          {pins.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/40 text-white text-sm font-medium px-4 py-2 rounded-full backdrop-blur-sm">
                Klik op het ontwerp om een opmerking te plaatsen
              </div>
            </div>
          )}

          {/* Pin counter */}
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-xs font-medium text-gray-500 px-2.5 py-1 rounded-full border border-gray-200">
            {pins.length}/5 pins
          </div>
        </div>
      </div>

      {/* Comments sidebar */}
      <div className="lg:w-52 flex-shrink-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Opmerkingen</p>
        {pins.length === 0 ? (
          <div className="text-sm text-gray-300 text-center py-6">
            Nog geen opmerkingen
          </div>
        ) : (
          <div className="space-y-2">
            {pins.map((pin, i) => (
              <div key={pin.id} className="flex items-start gap-2 bg-gray-50 rounded-lg p-2.5 group">
                <div className="w-5 h-5 rounded-full bg-sage-deep text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <p className="text-xs text-gray-700 flex-1 leading-relaxed">
                  {pin.comment || <span className="text-gray-300 italic">Typen...</span>}
                </p>
                <button
                  onClick={() => handleRemovePin(pin.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all flex-shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════
   TAB 3: Factuur
   ═══════════════════════════════════════ */
const FactuurTab: React.FC = () => {
  const [paymentStage, setPaymentStage] = useState<'idle' | 'loading' | 'done'>('idle');

  const handleBetaal = () => {
    setPaymentStage('loading');
    setTimeout(() => setPaymentStage('done'), 2000);
  };

  const factuurRegels = [
    { omschrijving: 'LED lichtreclame 200x40cm', bedrag: 960 },
    { omschrijving: 'Montage op locatie (4 uur)', bedrag: 480 },
    { omschrijving: 'Transport en opslag', bedrag: 85 },
    { omschrijving: 'Aansluiting elektra', bedrag: 195 },
  ];

  const subtotaal = factuurRegels.reduce((sum, r) => sum + r.bedrag, 0);
  const btw = subtotaal * 0.21;
  const totaal = subtotaal + btw;

  return (
    <div className="relative">
      <PaymentAnimation stage={paymentStage} />

      {/* Factuur header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Factuur</p>
          <p className="text-lg font-bold text-gray-900">FAC-2026-089</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${
          paymentStage === 'done'
            ? 'bg-sage-light text-sage-deep'
            : 'bg-orange-100 text-orange-600'
        }`}>
          <span className={`w-2 h-2 rounded-full ${paymentStage === 'done' ? 'bg-sage-deep' : 'bg-orange-500 animate-pulse'}`} />
          {paymentStage === 'done' ? 'Betaald' : 'Openstaand'}
        </div>
      </div>

      {/* Factuur info */}
      <div className="grid grid-cols-2 gap-4 mb-5 text-sm">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Factuurdatum</p>
          <p className="text-gray-700">10 maart 2026</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Vervaldatum</p>
          <p className="text-gray-700">24 maart 2026</p>
        </div>
      </div>

      {/* Regels */}
      <div className="border border-gray-100 rounded-xl overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase">Omschrijving</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase text-right">Bedrag</th>
            </tr>
          </thead>
          <tbody>
            {factuurRegels.map((regel, i) => (
              <tr key={i} className="border-t border-gray-50">
                <td className="px-4 py-3 text-gray-700">{regel.omschrijving}</td>
                <td className="px-4 py-3 text-gray-900 font-medium text-right">&euro;{regel.bedrag.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totalen */}
      <div className="bg-gray-50 rounded-xl p-4 mb-5">
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>Subtotaal</span>
          <span>&euro;{subtotaal.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>BTW (21%)</span>
          <span>&euro;{btw.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
          <span>Totaal</span>
          <span>&euro;{totaal.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Betaalgegevens + QR */}
      <div className="flex flex-col sm:flex-row gap-4 mb-5">
        {/* IBAN info */}
        <div className="flex-1 bg-sage-light/30 border border-sage/20 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Betaalgegevens</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">IBAN</span>
              <span className="font-mono text-gray-900 text-xs">NL91 ABNA 0417 1643 00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">T.n.v.</span>
              <span className="text-gray-900">Sign Company B.V.</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Kenmerk</span>
              <span className="font-mono text-gray-900 text-xs">FAC-2026-089</span>
            </div>
          </div>
        </div>

        {/* QR Code placeholder */}
        <div className="flex flex-col items-center justify-center bg-white border border-gray-200 rounded-xl p-4 w-32 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-20 h-20">
            {/* Simplified QR pattern */}
            <rect width="100" height="100" fill="white" />
            {/* Corner markers */}
            <rect x="5" y="5" width="25" height="25" fill="#1E293B" />
            <rect x="8" y="8" width="19" height="19" fill="white" />
            <rect x="11" y="11" width="13" height="13" fill="#1E293B" />
            <rect x="70" y="5" width="25" height="25" fill="#1E293B" />
            <rect x="73" y="8" width="19" height="19" fill="white" />
            <rect x="76" y="11" width="13" height="13" fill="#1E293B" />
            <rect x="5" y="70" width="25" height="25" fill="#1E293B" />
            <rect x="8" y="73" width="19" height="19" fill="white" />
            <rect x="11" y="76" width="13" height="13" fill="#1E293B" />
            {/* Data pattern */}
            <rect x="35" y="5" width="5" height="5" fill="#1E293B" />
            <rect x="45" y="5" width="5" height="5" fill="#1E293B" />
            <rect x="55" y="5" width="5" height="5" fill="#1E293B" />
            <rect x="35" y="15" width="5" height="5" fill="#1E293B" />
            <rect x="50" y="15" width="5" height="5" fill="#1E293B" />
            <rect x="60" y="15" width="5" height="5" fill="#1E293B" />
            <rect x="40" y="25" width="5" height="5" fill="#1E293B" />
            <rect x="55" y="25" width="5" height="5" fill="#1E293B" />
            <rect x="5" y="35" width="5" height="5" fill="#1E293B" />
            <rect x="15" y="35" width="5" height="5" fill="#1E293B" />
            <rect x="25" y="40" width="5" height="5" fill="#1E293B" />
            <rect x="35" y="35" width="5" height="5" fill="#1E293B" />
            <rect x="50" y="35" width="5" height="5" fill="#1E293B" />
            <rect x="60" y="40" width="5" height="5" fill="#1E293B" />
            <rect x="70" y="35" width="5" height="5" fill="#1E293B" />
            <rect x="80" y="40" width="5" height="5" fill="#1E293B" />
            <rect x="90" y="35" width="5" height="5" fill="#1E293B" />
            <rect x="5" y="50" width="5" height="5" fill="#1E293B" />
            <rect x="20" y="50" width="5" height="5" fill="#1E293B" />
            <rect x="35" y="50" width="5" height="5" fill="#1E293B" />
            <rect x="45" y="50" width="5" height="5" fill="#1E293B" />
            <rect x="55" y="50" width="5" height="5" fill="#1E293B" />
            <rect x="70" y="50" width="5" height="5" fill="#1E293B" />
            <rect x="85" y="50" width="5" height="5" fill="#1E293B" />
            <rect x="10" y="60" width="5" height="5" fill="#1E293B" />
            <rect x="25" y="60" width="5" height="5" fill="#1E293B" />
            <rect x="40" y="60" width="5" height="5" fill="#1E293B" />
            <rect x="55" y="60" width="5" height="5" fill="#1E293B" />
            <rect x="65" y="60" width="5" height="5" fill="#1E293B" />
            <rect x="80" y="60" width="5" height="5" fill="#1E293B" />
            <rect x="90" y="60" width="5" height="5" fill="#1E293B" />
            <rect x="35" y="70" width="5" height="5" fill="#1E293B" />
            <rect x="45" y="75" width="5" height="5" fill="#1E293B" />
            <rect x="55" y="70" width="5" height="5" fill="#1E293B" />
            <rect x="70" y="70" width="5" height="5" fill="#1E293B" />
            <rect x="85" y="70" width="5" height="5" fill="#1E293B" />
            <rect x="40" y="85" width="5" height="5" fill="#1E293B" />
            <rect x="55" y="80" width="5" height="5" fill="#1E293B" />
            <rect x="65" y="85" width="5" height="5" fill="#1E293B" />
            <rect x="75" y="80" width="5" height="5" fill="#1E293B" />
            <rect x="90" y="85" width="5" height="5" fill="#1E293B" />
            <rect x="80" y="90" width="5" height="5" fill="#1E293B" />
            <rect x="35" y="90" width="5" height="5" fill="#1E293B" />
          </svg>
          <p className="text-[10px] text-gray-400 mt-1">Scan om te betalen</p>
        </div>
      </div>

      {/* Betaal button */}
      {paymentStage !== 'done' && (
        <button
          onClick={handleBetaal}
          disabled={paymentStage === 'loading'}
          className="w-full flex items-center justify-center gap-2 bg-sage-deep hover:bg-sage-vivid text-white font-semibold py-3.5 rounded-xl transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
          </svg>
          Nu betalen
        </button>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════
   Main: Tabbed Portal Demo
   ═══════════════════════════════════════ */
export const PortaalPageDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    {
      label: 'Offerte',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
    },
    {
      label: 'Ontwerp',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
        </svg>
      ),
    },
    {
      label: 'Factuur',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Portal shell */}
      <div className="bg-white rounded-2xl shadow-xl border border-sage/30 overflow-hidden">
        {/* Portal header */}
        <div className="bg-gradient-to-r from-sage-light to-sage/30 px-5 py-4 flex items-center gap-3 border-b border-sage/20">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sage-vivid to-sage-deep flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-900 text-sm">Sign Company B.V.</p>
            <p className="text-xs text-sage-deep">Klantportaal &middot; Project #PRJ-2026-017</p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-sage-deep text-white text-xs font-bold flex items-center justify-center">
              MJ
            </div>
            <span className="text-xs text-gray-500">Mark Jansen</span>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-gray-100 bg-gray-50/50">
          {tabs.map((tab, i) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(i)}
              className={`flex items-center gap-2 text-sm font-semibold px-5 py-3 transition-all border-b-2 ${
                activeTab === i
                  ? 'border-sage-deep text-sage-deep bg-white'
                  : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5 sm:p-6">
          {activeTab === 0 && <OfferteTab />}
          {activeTab === 1 && <OntwerpTab />}
          {activeTab === 2 && <FactuurTab />}
        </div>
      </div>
    </div>
  );
};
