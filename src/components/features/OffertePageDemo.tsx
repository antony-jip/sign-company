'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

/* ─── Types ─── */
interface OfferteLine {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

/* ─── Confetti ─── */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  life: number;
}

function fireConfetti(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  const colors = ['#E8A0BF', '#D4708F', '#C24D77', '#F2D0E0', '#FFD700', '#FF6B6B', '#4ECDC4'];
  const particles: Particle[] = [];

  for (let i = 0; i < 28; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 1) * 10 - 2,
      size: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 15,
      life: 1,
    });
  }

  let frameId: number;
  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;

    for (const p of particles) {
      if (p.life <= 0) continue;
      alive = true;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.3;
      p.rotation += p.rotationSpeed;
      p.life -= 0.015;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }

    if (alive) {
      frameId = requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  frameId = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(frameId);
}

/* ─── Helpers ─── */
let idCounter = 0;
const genId = () => `line-${++idCounter}-${Date.now()}`;

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n);

/* ─── Step Indicator ─── */
const StepIndicator: React.FC<{ currentStep: number }> = ({ currentStep }) => {
  const steps = [
    { num: 1, label: 'Builder' },
    { num: 2, label: 'Klant ontvangt' },
    { num: 3, label: 'Factuur' },
  ];

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((s, i) => (
        <React.Fragment key={s.num}>
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 ${
                currentStep === s.num
                  ? 'bg-gradient-to-br from-blush-vivid to-blush-deep text-white shadow-md scale-110'
                  : currentStep > s.num
                  ? 'bg-blush text-blush-deep'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {currentStep > s.num ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                s.num
              )}
            </div>
            <span
              className={`text-sm font-medium hidden sm:inline transition-colors ${
                currentStep === s.num ? 'text-blush-deep' : currentStep > s.num ? 'text-blush' : 'text-gray-400'
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-8 md:w-12 h-0.5 rounded transition-colors duration-500 ${currentStep > s.num ? 'bg-blush' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════
   STEP 1: Offerte Builder
   ═══════════════════════════════════════ */
const OfferteBuilder: React.FC<{
  lines: OfferteLine[];
  setLines: React.Dispatch<React.SetStateAction<OfferteLine[]>>;
  onSend: () => void;
}> = ({ lines, setLines, onSend }) => {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.price, 0);
  const btw = subtotal * 0.21;
  const total = subtotal + btw;

  const updateLine = (id: string, field: keyof OfferteLine, value: string | number) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
  };

  const addLine = () => {
    setLines((prev) => [...prev, { id: genId(), description: '', quantity: 1, price: 0 }]);
  };

  const removeLine = (id: string) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  /* ── Pointer-based drag reorder ── */
  const handlePointerDown = (e: React.PointerEvent, index: number) => {
    e.preventDefault();
    setDragIndex(index);
    setOverIndex(index);
    startY.current = e.clientY;
    currentY.current = e.clientY;
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragIndex === null) return;
      currentY.current = e.clientY;
      const diff = currentY.current - startY.current;
      const rowHeight = 56;
      const offset = Math.round(diff / rowHeight);
      const newIndex = Math.max(0, Math.min(lines.length - 1, dragIndex + offset));
      setOverIndex(newIndex);
    },
    [dragIndex, lines.length]
  );

  const handlePointerUp = useCallback(() => {
    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
      setLines((prev) => {
        const updated = [...prev];
        const [moved] = updated.splice(dragIndex, 1);
        updated.splice(overIndex, 0, moved);
        return updated;
      });
    }
    setDragIndex(null);
    setOverIndex(null);
  }, [dragIndex, overIndex, setLines]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">Offerte OFF-2026-047</h3>
          <p className="text-sm text-gray-400">Bakkerij Jansen &middot; 13 maart 2026</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Concept
        </span>
      </div>

      {/* Lines Table */}
      <div className="bg-white rounded-xl border border-blush/20 overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[24px_1fr_70px_90px_80px_32px] gap-2 px-4 py-2.5 bg-blush-light/30 border-b border-blush/10 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <span />
          <span>Omschrijving</span>
          <span className="text-right">Aantal</span>
          <span className="text-right">Prijs</span>
          <span className="text-right">Totaal</span>
          <span />
        </div>

        {/* Rows */}
        <div
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="divide-y divide-gray-50"
        >
          {lines.map((line, i) => (
            <div
              key={line.id}
              className={`grid grid-cols-[24px_1fr_70px_90px_80px_32px] gap-2 px-4 py-3 items-center transition-all ${
                dragIndex === i ? 'opacity-50 bg-blush-light/20' : overIndex === i && dragIndex !== null ? 'bg-blush-light/10' : 'hover:bg-gray-50/50'
              }`}
            >
              {/* Drag handle */}
              <button
                onPointerDown={(e) => handlePointerDown(e, i)}
                className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
                </svg>
              </button>

              {/* Description */}
              <input
                type="text"
                value={line.description}
                onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                className="text-sm text-gray-800 bg-transparent border-0 outline-none focus:ring-0 p-0 w-full placeholder:text-gray-300"
                placeholder="Omschrijving..."
              />

              {/* Quantity */}
              <input
                type="number"
                value={line.quantity}
                onChange={(e) => updateLine(line.id, 'quantity', Math.max(0, Number(e.target.value)))}
                min={0}
                className="text-sm text-gray-800 text-right bg-transparent border-0 outline-none focus:ring-0 p-0 w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />

              {/* Price */}
              <div className="flex items-center justify-end gap-0.5">
                <span className="text-xs text-gray-400">&euro;</span>
                <input
                  type="number"
                  value={line.price}
                  onChange={(e) => updateLine(line.id, 'price', Math.max(0, Number(e.target.value)))}
                  min={0}
                  step={0.01}
                  className="text-sm text-gray-800 text-right bg-transparent border-0 outline-none focus:ring-0 p-0 w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              {/* Line total */}
              <span className="text-sm font-medium text-gray-900 text-right">
                {formatCurrency(line.quantity * line.price)}
              </span>

              {/* Remove */}
              <button
                onClick={() => removeLine(line.id)}
                className={`text-gray-300 hover:text-red-400 transition-colors ${lines.length <= 1 ? 'opacity-0 pointer-events-none' : ''}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Add line */}
        <button
          onClick={addLine}
          className="w-full px-4 py-2.5 text-sm text-blush-deep hover:bg-blush-light/30 transition-colors flex items-center gap-2 font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Regel toevoegen
        </button>
      </div>

      {/* Totals */}
      <div className="bg-blush-light/20 rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm text-gray-500">
          <span>Subtotaal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-500">
          <span>BTW 21%</span>
          <span>{formatCurrency(btw)}</span>
        </div>
        <div className="h-px bg-blush/20" />
        <div className="flex justify-between text-base font-bold text-gray-900">
          <span>Totaal</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Send button */}
      <button
        onClick={onSend}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blush-vivid to-blush-deep text-white font-semibold py-3.5 rounded-xl hover:opacity-90 transition-opacity shadow-md"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
        </svg>
        Verstuur naar klant
      </button>
    </div>
  );
};

/* ═══════════════════════════════════════
   STEP 2: Klant Ontvangt
   ═══════════════════════════════════════ */
const KlantOntvangt: React.FC<{
  lines: OfferteLine[];
  onApprove: () => void;
  onBack: () => void;
}> = ({ lines, onApprove, onBack }) => {
  const [showEmail, setShowEmail] = useState(false);
  const [showViewed, setShowViewed] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const confettiCleanup = useRef<(() => void) | undefined>();

  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.price, 0);
  const btw = subtotal * 0.21;
  const total = subtotal + btw;

  useEffect(() => {
    const t1 = setTimeout(() => setShowEmail(true), 300);
    const t2 = setTimeout(() => setShowPdf(true), 800);
    const t3 = setTimeout(() => setShowViewed(true), 2000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const handleApprove = () => {
    if (canvasRef.current) {
      confettiCleanup.current = fireConfetti(canvasRef.current) as (() => void) | undefined;
    }
    setTimeout(onApprove, 800);
  };

  useEffect(() => {
    return () => confettiCleanup.current?.();
  }, []);

  return (
    <div className="space-y-4 relative">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-20" />

      {/* Email notification */}
      <div
        className={`transform transition-all duration-500 ${
          showEmail ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
        }`}
      >
        <div className="bg-white rounded-xl border border-blush/20 p-4 flex items-start gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blush-vivid to-blush-deep flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-900 text-sm">Nieuwe offerte ontvangen</p>
              <span className="text-xs text-gray-400">Zojuist</span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">Bakkerij Jansen heeft offerte OFF-2026-047 ontvangen per e-mail.</p>
          </div>
        </div>
      </div>

      {/* PDF preview */}
      <div
        className={`transform transition-all duration-500 delay-200 ${
          showPdf ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        <div className="bg-white rounded-xl border border-blush/20 shadow-lg overflow-hidden">
          {/* PDF "browser bar" */}
          <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-300" />
            </div>
            <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-gray-400 border border-gray-100 truncate">
              offerte-OFF-2026-047.pdf
            </div>
            {showViewed && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full animate-pulse">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Bekeken door klant
              </span>
            )}
          </div>

          {/* PDF content mockup */}
          <div className="p-6 space-y-4 bg-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Offerte</p>
                <p className="font-bold text-gray-900">OFF-2026-047</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Datum</p>
                <p className="text-sm font-medium text-gray-700">13 maart 2026</p>
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            {/* Mini table */}
            <div className="space-y-1.5">
              {lines.map((l) => (
                <div key={l.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">{l.description || 'Geen omschrijving'}</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(l.quantity * l.price)}</span>
                </div>
              ))}
            </div>

            <div className="h-px bg-gray-100" />

            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotaal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">BTW 21%</span>
              <span>{formatCurrency(btw)}</span>
            </div>
            <div className="flex justify-between font-bold text-base">
              <span>Totaal</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleApprove}
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blush-vivid to-blush-deep text-white font-semibold py-3.5 rounded-xl hover:opacity-90 transition-opacity shadow-md"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Goedkeuren
        </button>
        <button
          onClick={onBack}
          className="flex items-center justify-center gap-2 bg-white text-gray-600 font-medium py-3.5 px-5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
          </svg>
          Wijziging aanvragen
        </button>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════
   STEP 3: Factuur
   ═══════════════════════════════════════ */
const FactuurStep: React.FC<{
  lines: OfferteLine[];
  onReset: () => void;
}> = ({ lines, onReset }) => {
  const [showMorph, setShowMorph] = useState(true);
  const [showPaid, setShowPaid] = useState(false);
  const [checkScale, setCheckScale] = useState(false);

  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.price, 0);
  const btw = subtotal * 0.21;
  const total = subtotal + btw;

  useEffect(() => {
    const t1 = setTimeout(() => setShowMorph(false), 1500);
    const t2 = setTimeout(() => setShowPaid(true), 2500);
    const t3 = setTimeout(() => setCheckScale(true), 2700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Header with morph animation */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">
            {showMorph ? 'Converteren...' : 'Factuur'}
          </p>
          <h3 className="font-bold text-gray-900 text-lg transition-all duration-700">
            {showMorph ? (
              <span className="inline-flex items-center gap-2">
                <span className="opacity-50 line-through">OFF-2026-047</span>
                <svg className="w-4 h-4 text-blush-vivid animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
              </span>
            ) : (
              <span className="text-blush-deep">FAC-2026-047</span>
            )}
          </h3>
          <p className="text-sm text-gray-400">Bakkerij Jansen &middot; 13 maart 2026</p>
        </div>

        {/* Status badge */}
        <div
          className={`transform transition-all duration-500 ${
            showPaid ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-2 opacity-0 scale-90'
          }`}
        >
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full">
            <span
              className={`transform transition-all duration-300 ${checkScale ? 'scale-100' : 'scale-0'}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </span>
            Betaald
          </span>
        </div>
      </div>

      {/* Factuur card */}
      <div className="bg-white rounded-xl border border-blush/20 shadow-lg overflow-hidden">
        <div className="p-6 space-y-4">
          {/* Lines */}
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_70px_90px_80px] gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-100">
              <span>Omschrijving</span>
              <span className="text-right">Aantal</span>
              <span className="text-right">Prijs</span>
              <span className="text-right">Totaal</span>
            </div>
            {lines.map((l) => (
              <div key={l.id} className="grid grid-cols-[1fr_70px_90px_80px] gap-2 py-1.5 text-sm">
                <span className="text-gray-700">{l.description || 'Geen omschrijving'}</span>
                <span className="text-right text-gray-600">{l.quantity}</span>
                <span className="text-right text-gray-600">{formatCurrency(l.price)}</span>
                <span className="text-right font-medium text-gray-900">{formatCurrency(l.quantity * l.price)}</span>
              </div>
            ))}
          </div>

          <div className="h-px bg-gray-100" />

          {/* Totals */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotaal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>BTW 21%</span>
              <span>{formatCurrency(btw)}</span>
            </div>
            <div className="h-px bg-gray-100" />
            <div className="flex justify-between font-bold text-base text-gray-900">
              <span>Totaal</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {/* QR + bank info row */}
          <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
            {/* QR code placeholder */}
            <div className="flex-shrink-0">
              <svg width="64" height="64" viewBox="0 0 64 64" className="rounded-lg">
                <rect width="64" height="64" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="1" rx="4" />
                {/* Simplified QR pattern */}
                <rect x="8" y="8" width="16" height="16" fill="#1F2937" rx="2" />
                <rect x="10" y="10" width="12" height="12" fill="#F9FAFB" rx="1" />
                <rect x="12" y="12" width="8" height="8" fill="#1F2937" rx="1" />
                <rect x="40" y="8" width="16" height="16" fill="#1F2937" rx="2" />
                <rect x="42" y="10" width="12" height="12" fill="#F9FAFB" rx="1" />
                <rect x="44" y="12" width="8" height="8" fill="#1F2937" rx="1" />
                <rect x="8" y="40" width="16" height="16" fill="#1F2937" rx="2" />
                <rect x="10" y="42" width="12" height="12" fill="#F9FAFB" rx="1" />
                <rect x="12" y="44" width="8" height="8" fill="#1F2937" rx="1" />
                {/* Data blocks */}
                <rect x="28" y="8" width="4" height="4" fill="#1F2937" />
                <rect x="28" y="16" width="4" height="4" fill="#1F2937" />
                <rect x="32" y="12" width="4" height="4" fill="#1F2937" />
                <rect x="8" y="28" width="4" height="4" fill="#1F2937" />
                <rect x="16" y="28" width="4" height="4" fill="#1F2937" />
                <rect x="28" y="28" width="8" height="8" fill="#1F2937" rx="1" />
                <rect x="40" y="28" width="4" height="4" fill="#1F2937" />
                <rect x="48" y="28" width="4" height="4" fill="#1F2937" />
                <rect x="40" y="40" width="4" height="4" fill="#1F2937" />
                <rect x="48" y="44" width="4" height="4" fill="#1F2937" />
                <rect x="44" y="48" width="4" height="4" fill="#1F2937" />
                <rect x="52" y="40" width="4" height="8" fill="#1F2937" />
                <rect x="40" y="52" width="8" height="4" fill="#1F2937" />
              </svg>
            </div>
            <div className="text-xs text-gray-400 space-y-0.5">
              <p className="font-semibold text-gray-600">Betaalinformatie</p>
              <p>IBAN: NL91 ABNA 0417 1643 00</p>
              <p>T.n.v. Sign Company B.V.</p>
              <p>Ref: FAC-2026-047</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reset */}
      <button
        onClick={onReset}
        className="w-full flex items-center justify-center gap-2 bg-white text-gray-600 font-medium py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
        </svg>
        Opnieuw starten
      </button>
    </div>
  );
};

/* ═══════════════════════════════════════
   Main Export: OffertePageDemo
   ═══════════════════════════════════════ */
const defaultLines: OfferteLine[] = [
  { id: genId(), description: 'LED lichtreclame', quantity: 1, price: 960 },
  { id: genId(), description: 'Montage (4 uur)', quantity: 4, price: 120 },
  { id: genId(), description: 'Transport', quantity: 1, price: 85 },
];

export const OffertePageDemo: React.FC = () => {
  const [step, setStep] = useState(1);
  const [lines, setLines] = useState<OfferteLine[]>(defaultLines);

  const handleReset = () => {
    setStep(1);
    setLines([
      { id: genId(), description: 'LED lichtreclame', quantity: 1, price: 960 },
      { id: genId(), description: 'Montage (4 uur)', quantity: 4, price: 120 },
      { id: genId(), description: 'Transport', quantity: 1, price: 85 },
    ]);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <StepIndicator currentStep={step} />

      <div className="bg-gradient-to-b from-blush-light/30 to-white rounded-2xl border border-blush/20 shadow-xl p-6">
        {step === 1 && (
          <OfferteBuilder
            lines={lines}
            setLines={setLines}
            onSend={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <KlantOntvangt
            lines={lines}
            onApprove={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <FactuurStep
            lines={lines}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
};
