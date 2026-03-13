'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

/* ─── Typing animation hook ─── */
function useTypingEffect(text: string, speed = 25, trigger = false) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!trigger) { setDisplayed(''); setDone(false); return; }
    setDisplayed('');
    setDone(false);
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(iv); setDone(true); }
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed, trigger]);

  return { displayed, done };
}

/* ─── Sparkle SVG ─── */
const Sparkle = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
  </svg>
);

/* ═══════════════════════════════════════
   TAB 1: Forgie Chat Demo
   ═══════════════════════════════════════ */
const ForgieChat: React.FC = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string; metrics?: { label: string; value: string; trend?: string }[] }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const responses: Record<string, { text: string; metrics?: { label: string; value: string; trend?: string }[] }> = {
    omzet: {
      text: 'Je omzet deze maand is €24.850 — dat is 12% hoger dan vorige maand. Top 3 klanten: Bakkerij Jansen (€8.400), Garage De Wit (€5.200), Restaurant Het Anker (€4.100).',
      metrics: [
        { label: 'Omzet deze maand', value: '€24.850', trend: '+12%' },
        { label: 'Openstaande facturen', value: '€6.320', trend: '-3%' },
        { label: 'Actieve projecten', value: '7' },
      ],
    },
    offerte: {
      text: 'Ik heb offerte OFF-2026-052 aangemaakt voor Bakkerij Jansen. 3 regels: LED lichtreclame (€960), montage 4u (€480), transport (€85). Totaal: €1.525 excl. BTW. Wil je dat ik hem meteen verstuur?',
      metrics: [
        { label: 'Offerte', value: 'OFF-2026-052' },
        { label: 'Totaal excl. BTW', value: '€1.525' },
        { label: 'Status', value: 'Concept' },
      ],
    },
    planning: {
      text: 'Komende week staan er 3 montages gepland. Maandag: Garage De Wit (Joris + Mark, 09:00-13:00). Woensdag: Restaurant Het Anker (heel team, 08:00-17:00). Vrijdag: Bakkerij Jansen (Mark, 10:00-12:00).',
      metrics: [
        { label: 'Montages deze week', value: '3' },
        { label: 'Uren gepland', value: '18u' },
        { label: 'Team bezetting', value: '85%' },
      ],
    },
    klant: {
      text: 'Bakkerij Jansen is klant sinds maart 2024. Totale omzet: €12.400 over 5 projecten. Er staat nog 1 offerte open (raambelettering, €2.100). Laatste contact was 3 dagen geleden.',
      metrics: [
        { label: 'Klant sinds', value: 'Mrt 2024' },
        { label: 'Totale omzet', value: '€12.400' },
        { label: 'Open offertes', value: '1' },
      ],
    },
  };

  const suggestions = [
    { label: '📊 Hoe gaat mijn omzet?', key: 'omzet' },
    { label: '📝 Maak een offerte', key: 'offerte' },
    { label: '📅 Wat staat er gepland?', key: 'planning' },
    { label: '👤 Info over Bakkerij Jansen', key: 'klant' },
  ];

  const handleSend = useCallback((text: string, key?: string) => {
    if (isTyping) return;
    setMessages(prev => [...prev, { role: 'user', text }]);
    setIsTyping(true);

    const rKey = key || Object.keys(responses).find(k => text.toLowerCase().includes(k)) || 'omzet';
    const resp = responses[rKey] || responses.omzet;

    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'ai', text: resp.text, metrics: resp.metrics }]);
    }, 1000 + Math.random() * 600);
  }, [isTyping]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-lavender/30 overflow-hidden h-[520px] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-lavender-light to-lavender/30 px-5 py-4 flex items-center gap-3 border-b border-lavender/20">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lavender-vivid to-lavender-deep flex items-center justify-center">
          <Sparkle className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm">Forgie</p>
          <p className="text-xs text-lavender-deep">AI-assistent · Online</p>
        </div>
        <div className="ml-auto">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-lavender-deep bg-lavender/40 px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-sage-vivid rounded-full animate-pulse" />
            Actief
          </span>
        </div>
      </div>

      {/* Messages */}
      <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-lavender-light/20 to-white">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-lavender to-lavender-vivid flex items-center justify-center">
              <Sparkle className="w-7 h-7 text-white" />
            </div>
            <p className="font-bold text-gray-900 mb-1">Hoi! Ik ben Forgie 👋</p>
            <p className="text-sm text-gray-400 max-w-xs mx-auto">Ik ken je hele bedrijf. Vraag me alles — van omzet tot planning.</p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${m.role === 'user'
              ? 'bg-gradient-to-r from-lavender-vivid to-lavender-deep text-white rounded-2xl rounded-br-md px-4 py-3'
              : 'bg-gray-50 text-gray-800 rounded-2xl rounded-bl-md px-4 py-3 border border-gray-100'
            }`}>
              <p className="text-sm leading-relaxed">{m.text}</p>
              {m.metrics && (
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {m.metrics.map(mt => (
                    <div key={mt.label} className="bg-white/80 rounded-lg p-2 text-center border border-gray-100">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">{mt.label}</p>
                      <p className="text-sm font-bold text-gray-900">{mt.value}</p>
                      {mt.trend && <p className={`text-[10px] font-medium ${mt.trend.startsWith('+') ? 'text-sage-deep' : 'text-blush-deep'}`}>{mt.trend}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-50 rounded-2xl rounded-bl-md px-4 py-3 border border-gray-100">
              <div className="flex items-center gap-2">
                <Sparkle className="w-4 h-4 text-lavender-vivid animate-pulse" />
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-lavender animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-lavender animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-lavender animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggestions + Input */}
      <div className="border-t border-gray-100 bg-white p-3">
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {suggestions.map(s => (
              <button
                key={s.key}
                onClick={() => handleSend(s.label, s.key)}
                className="text-xs bg-lavender-light/60 hover:bg-lavender-light text-lavender-deep font-medium px-3 py-1.5 rounded-full transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Stel een vraag aan Forgie..."
            className="flex-1 bg-gray-50 rounded-xl px-4 py-2.5 text-sm border border-gray-100 focus:outline-none focus:ring-2 focus:ring-lavender/50"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                handleSend((e.target as HTMLInputElement).value);
                (e.target as HTMLInputElement).value = '';
              }
            }}
          />
          <button
            onClick={() => {
              const inp = document.querySelector<HTMLInputElement>('.forgie-input');
              if (inp?.value.trim()) { handleSend(inp.value); inp.value = ''; }
            }}
            className="bg-gradient-to-r from-lavender-vivid to-lavender-deep text-white rounded-xl px-4 hover:opacity-90 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════
   TAB 2: Tekst Verbeteraar Demo
   ═══════════════════════════════════════ */
const TekstVerbeteraar: React.FC = () => {
  const [tone, setTone] = useState<'formeel' | 'informeel' | 'zakelijk'>('zakelijk');
  const [isImproving, setIsImproving] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const original = `hoi mark,

de offerte voor die lichtreclame is klaar. het wordt 960 euro voor het bord en dan nog montage erbij. als je akkoord ben laat maar weten dan plannen we het in.

groetjes`;

  const improved: Record<string, string> = {
    formeel: `Geachte heer Jansen,

Hierbij ontvangt u onze offerte voor de LED lichtreclame aan uw bedrijfspand. De investering bedraagt €960,- voor het reclamebord, exclusief montagekosten. Een gedetailleerde specificatie vindt u in de bijlage.

Graag verneem ik of u akkoord gaat, zodat wij de montage voor u kunnen inplannen.

Met vriendelijke groet,
Sign Company`,
    informeel: `Hey Mark! 👋

De offerte voor je lichtreclame is klaar — €960 voor het bord, montage rekenen we apart af. Ik heb alles netjes in de bijlage gezet.

Laat even weten of het goed is, dan prikken we een datum!

Groet,
Sign Company`,
    zakelijk: `Beste Mark,

Bijgaand onze offerte voor de LED lichtreclame. Het reclamebord komt op €960,- excl. BTW. De montagekosten worden apart berekend op basis van de werkelijke uren.

Laat je weten of je akkoord gaat? Dan plannen wij de montage in.

Met vriendelijke groet,
Sign Company`,
  };

  const { displayed, done } = useTypingEffect(improved[tone], 18, showResult);

  const handleImprove = () => {
    setIsImproving(true);
    setShowResult(false);
    setTimeout(() => {
      setIsImproving(false);
      setShowResult(true);
    }, 800);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-lavender/30 overflow-hidden h-[520px] flex flex-col">
      <div className="bg-gradient-to-r from-lavender-light to-lavender/30 px-5 py-4 flex items-center gap-3 border-b border-lavender/20">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lavender-vivid to-lavender-deep flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm">Tekst Verbeteraar</p>
          <p className="text-xs text-lavender-deep">AI-schrijfhulp</p>
        </div>
      </div>

      <div className="flex-1 p-5 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
          {/* Original */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Origineel</p>
            <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 h-[calc(100%-80px)]">
              <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{original}</p>
            </div>
          </div>
          {/* Improved */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Verbeterd</p>
            <div className="bg-sage-light/30 border border-sage/30 rounded-xl p-4 h-[calc(100%-80px)] relative">
              {!showResult && !isImproving && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-sm text-gray-300">Klik &ldquo;Verbeter&rdquo; om te starten</p>
                </div>
              )}
              {isImproving && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-lavender-deep">
                    <Sparkle className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-medium">AI verbetert je tekst...</span>
                  </div>
                </div>
              )}
              {showResult && (
                <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                  {displayed}
                  {!done && <span className="inline-block w-0.5 h-4 bg-lavender-vivid animate-pulse ml-0.5" />}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="border-t border-gray-100 bg-white p-4 flex items-center justify-between">
        <div className="flex gap-2">
          {(['formeel', 'informeel', 'zakelijk'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTone(t); setShowResult(false); }}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                tone === t ? 'bg-lavender text-lavender-deep' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <button
          onClick={handleImprove}
          disabled={isImproving}
          className="flex items-center gap-2 bg-gradient-to-r from-lavender-vivid to-lavender-deep text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Sparkle className="w-4 h-4" />
          Verbeter
        </button>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════
   TAB 3: Signing Visualizer Preview
   ═══════════════════════════════════════ */
const VisualizerPreview: React.FC = () => {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setSliderPos(x);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => handleMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
    const onUp = () => setIsDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, [isDragging, handleMove]);

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-lavender/30 overflow-hidden h-[520px] flex flex-col">
      <div className="bg-gradient-to-r from-lavender-light to-lavender/30 px-5 py-4 flex items-center gap-3 border-b border-lavender/20">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lavender-vivid to-lavender-deep flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
          </svg>
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm">Signing Visualizer</p>
          <p className="text-xs text-lavender-deep">AI-mockup generator</p>
        </div>
      </div>

      <div className="flex-1 p-5 flex flex-col">
        {/* Before/After slider */}
        <div
          ref={containerRef}
          className="relative flex-1 rounded-xl overflow-hidden cursor-col-resize select-none bg-gray-100"
          onMouseDown={() => setIsDragging(true)}
          onTouchStart={() => setIsDragging(true)}
        >
          {/* "Before" — blank building */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-full bg-gradient-to-b from-sky-100 to-sky-50 flex items-end justify-center pb-4">
              {/* Simple building SVG */}
              <svg viewBox="0 0 400 250" className="w-full max-w-md" fill="none">
                <rect x="80" y="60" width="240" height="180" rx="4" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="2"/>
                <rect x="100" y="80" width="50" height="40" rx="2" fill="#F1F5F9" stroke="#CBD5E1"/>
                <rect x="170" y="80" width="50" height="40" rx="2" fill="#F1F5F9" stroke="#CBD5E1"/>
                <rect x="240" y="80" width="50" height="40" rx="2" fill="#F1F5F9" stroke="#CBD5E1"/>
                <rect x="100" y="140" width="50" height="40" rx="2" fill="#F1F5F9" stroke="#CBD5E1"/>
                <rect x="170" y="140" width="50" height="40" rx="2" fill="#F1F5F9" stroke="#CBD5E1"/>
                <rect x="240" y="140" width="50" height="40" rx="2" fill="#F1F5F9" stroke="#CBD5E1"/>
                <rect x="170" y="195" width="55" height="45" rx="2" fill="#94A3B8" stroke="#64748B"/>
                <text x="200" y="56" textAnchor="middle" fill="#94A3B8" fontSize="11" fontWeight="500">Leeg pand</text>
              </svg>
            </div>
          </div>

          {/* "After" — building with sign (clipped) */}
          <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
            <div className="w-full h-full bg-gradient-to-b from-sky-200 to-sky-100 flex items-end justify-center pb-4">
              <svg viewBox="0 0 400 250" className="w-full max-w-md" fill="none">
                <rect x="80" y="60" width="240" height="180" rx="4" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="2"/>
                <rect x="100" y="80" width="50" height="40" rx="2" fill="#F1F5F9" stroke="#CBD5E1"/>
                <rect x="170" y="80" width="50" height="40" rx="2" fill="#F1F5F9" stroke="#CBD5E1"/>
                <rect x="240" y="80" width="50" height="40" rx="2" fill="#F1F5F9" stroke="#CBD5E1"/>
                <rect x="100" y="140" width="50" height="40" rx="2" fill="#F1F5F9" stroke="#CBD5E1"/>
                <rect x="170" y="140" width="50" height="40" rx="2" fill="#F1F5F9" stroke="#CBD5E1"/>
                <rect x="240" y="140" width="50" height="40" rx="2" fill="#F1F5F9" stroke="#CBD5E1"/>
                <rect x="170" y="195" width="55" height="45" rx="2" fill="#94A3B8" stroke="#64748B"/>
                {/* LED Sign */}
                <rect x="110" y="22" width="180" height="30" rx="4" fill="#1E293B"/>
                <rect x="112" y="24" width="176" height="26" rx="3" fill="#0F172A"/>
                <text x="200" y="42" textAnchor="middle" fill="#6D9E8E" fontSize="14" fontWeight="800" fontFamily="sans-serif">BAKKERIJ JANSEN</text>
                {/* Glow effect */}
                <rect x="110" y="22" width="180" height="30" rx="4" fill="none" stroke="#6D9E8E" strokeWidth="1" opacity="0.5"/>
                <ellipse cx="200" cy="55" rx="80" ry="4" fill="#6D9E8E" opacity="0.15"/>
              </svg>
            </div>
          </div>

          {/* Slider handle */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-white shadow-lg z-10"
            style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center border-2 border-lavender">
              <svg className="w-5 h-5 text-lavender-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
            </div>
          </div>

          {/* Labels */}
          <div className="absolute top-3 left-3 bg-black/50 text-white text-xs font-medium px-2 py-1 rounded-md backdrop-blur-sm">
            Voor
          </div>
          <div className="absolute top-3 right-3 bg-black/50 text-white text-xs font-medium px-2 py-1 rounded-md backdrop-blur-sm">
            Na
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-3">
          Sleep de slider om het verschil te zien — dit is wat de Signing Visualizer genereert met AI
        </p>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════
   Main: Tabbed Demo Container
   ═══════════════════════════════════════ */
export const AIPageDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { label: 'Forgie Chat', icon: <Sparkle className="w-4 h-4" /> },
    {
      label: 'Tekst Verbeteraar',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
        </svg>
      ),
    },
    {
      label: 'Visualizer',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Tab bar */}
      <div className="flex gap-2 mb-6 justify-center">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(i)}
            className={`flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all ${
              activeTab === i
                ? 'bg-gradient-to-r from-lavender-vivid to-lavender-deep text-white shadow-md'
                : 'bg-white text-gray-500 hover:bg-lavender-light/50 border border-gray-200'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Active demo */}
      <div className="transition-opacity duration-300">
        {activeTab === 0 && <ForgieChat />}
        {activeTab === 1 && <TekstVerbeteraar />}
        {activeTab === 2 && <VisualizerPreview />}
      </div>
    </div>
  );
};
