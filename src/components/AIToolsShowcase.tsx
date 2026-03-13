'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useScrollAnimation } from './useScrollAnimation';

/* ─── Forgie AI Chat Demo ─── */
const ForgieDemo: React.FC = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const aiResponses: Record<string, string> = {
    'offerte': 'Ik heb offerte OFF-2026-052 aangemaakt voor Bakkerij Jansen. 3 regels: LED lichtreclame (€960), montage 4u (€480), transport (€85). Totaal: €1.525 excl. BTW. Wil je dat ik hem meteen verstuur?',
    'planning': 'De montage voor Bakkerij Jansen staat gepland op dinsdag 18 maart, 09:00-14:00. Team: Joris en Mark. Ik heb ook een herinneringsmail ingepland voor maandag.',
    'factuur': 'Factuur F-2026-034 is aangemaakt op basis van werkbon WB-2026-018. Bedrag: €1.845,25 incl. BTW. Automatische betaalherinnering staat op 7 dagen.',
    'klant': 'Bakkerij Jansen heeft 3 actieve projecten met een totale omzet van €12.400. Laatste contact: vorige week. Ik zie dat er nog een openstaande offerte is voor raambelettering.',
  };

  const suggestions = [
    { label: 'Maak een offerte', key: 'offerte' },
    { label: 'Plan een montage', key: 'planning' },
    { label: 'Stuur een factuur', key: 'factuur' },
    { label: 'Klantinfo ophalen', key: 'klant' },
  ];

  const handleSend = (text: string, key?: string) => {
    const userMsg = text || input;
    if (!userMsg.trim()) return;

    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsTyping(true);

    const responseKey = key || Object.keys(aiResponses).find(k => userMsg.toLowerCase().includes(k)) || 'offerte';

    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'ai', text: aiResponses[responseKey] || aiResponses['offerte'] }]);
    }, 1200 + Math.random() * 800);
  };

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-lavender/30 overflow-hidden h-[480px] flex flex-col">
      {/* Chat header */}
      <div className="bg-gradient-to-r from-lavender-light to-lavender/30 px-5 py-4 flex items-center gap-3 border-b border-lavender/20">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lavender-vivid to-lavender-deep flex items-center justify-center">
          <svg className="w-5 h-5 text-white ai-sparkle" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm">Forgie</p>
          <p className="text-xs text-lavender-deep">AI-assistent &middot; Online</p>
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
        {/* Welcome message */}
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-lavender to-lavender-vivid flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
            </div>
            <p className="font-bold text-gray-900 mb-1">Hoi! Ik ben Forgie</p>
            <p className="text-sm text-gray-500 mb-6">Jouw AI-assistent in FORGEdesk. Probeer het uit!</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map(s => (
                <button
                  key={s.key}
                  onClick={() => handleSend(s.label, s.key)}
                  className="text-xs font-medium px-3 py-2 rounded-xl bg-lavender-light hover:bg-lavender/40 text-lavender-deep transition-all hover:scale-105"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
              msg.role === 'user'
                ? 'bg-gray-900 text-white rounded-br-md'
                : 'bg-white shadow-sm border border-lavender/20 text-gray-700 rounded-bl-md'
            }`}>
              {msg.role === 'ai' && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <svg className="w-3.5 h-3.5 text-lavender-vivid" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  <span className="text-xs font-semibold text-lavender-deep">Forgie</span>
                </div>
              )}
              {msg.text}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white shadow-sm border border-lavender/20 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-lavender-vivid rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-lavender-vivid rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-lavender-vivid rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-100 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
            placeholder="Vraag Forgie iets..."
            className="flex-1 bg-gray-50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lavender/50 border border-gray-100"
          />
          <button
            onClick={() => handleSend(input)}
            className="bg-gradient-to-r from-lavender-vivid to-lavender-deep text-white rounded-xl px-4 py-2.5 hover:opacity-90 transition-opacity"
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

/* ─── Text Improvement Demo ─── */
const TekstVerbeteraarDemo: React.FC = () => {
  const [inputText, setInputText] = useState('Hoi wij maken uw lichtreclame en dat doen we al 40 jaar, wij zijn de beste keus voor u als u een mooie gevelreclame wilt laten maken');
  const [improved, setImproved] = useState('');
  const [isImproving, setIsImproving] = useState(false);
  const [tone, setTone] = useState<'professioneel' | 'vriendelijk' | 'overtuigend'>('professioneel');

  const improvements: Record<string, string> = {
    professioneel: 'Al ruim 40 jaar realiseren wij hoogwaardige lichtreclame en gevelreclame voor ondernemers die willen opvallen. Met onze ervaring en vakmanschap creëren wij een uitstraling die perfect bij uw merk past.',
    vriendelijk: 'Al meer dan 40 jaar helpen we ondernemers met prachtige lichtreclame en gevelreclame! We denken graag met je mee over een ontwerp dat echt bij jouw bedrijf past. Kom gerust langs voor een vrijblijvend gesprek.',
    overtuigend: 'Meer dan 40 jaar expertise in lichtreclame en gevelreclame. Onze klanten kiezen voor ons vanwege onze betrouwbaarheid, scherpe prijzen en oog voor detail. Vraag vandaag nog een vrijblijvende offerte aan.',
  };

  const handleImprove = () => {
    setIsImproving(true);
    setImproved('');
    setTimeout(() => {
      setIsImproving(false);
      setImproved(improvements[tone]);
    }, 1500);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-sage/30 overflow-hidden h-[480px] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-sage-light to-sage/30 px-5 py-4 flex items-center gap-3 border-b border-sage/20">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sage-vivid to-sage-deep flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm">Tekst Verbeteraar</p>
          <p className="text-xs text-sage-deep">AI-aangedreven copywriting</p>
        </div>
      </div>

      <div className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto">
        {/* Tone selector */}
        <div className="flex gap-2">
          {(['professioneel', 'vriendelijk', 'overtuigend'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTone(t); setImproved(''); }}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                tone === t
                  ? 'bg-sage text-white'
                  : 'bg-sage-light/50 text-sage-deep hover:bg-sage-light'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Input */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Originele tekst</label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full bg-gray-50 rounded-xl p-3 text-sm text-gray-700 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-sage/50 resize-none"
            rows={4}
          />
        </div>

        {/* Improve button */}
        <button
          onClick={handleImprove}
          disabled={isImproving}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-sage-vivid to-sage-deep text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-all disabled:opacity-60"
        >
          {isImproving ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Tekst wordt verbeterd...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Verbeter met AI
            </>
          )}
        </button>

        {/* Result */}
        {improved && (
          <div className="bg-sage-light/40 rounded-xl p-4 border border-sage/20">
            <div className="flex items-center gap-1.5 mb-2">
              <svg className="w-3.5 h-3.5 text-sage-vivid" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-xs font-semibold text-sage-deep">Verbeterde versie ({tone})</span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{improved}</p>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Signing Visualiser Demo ─── */
const SigningVisualiserDemo: React.FC = () => {
  const [text, setText] = useState('BAKKERIJ');
  const [style, setStyle] = useState<'doosletter' | 'freesletters' | 'neon'>('doosletter');
  const [color, setColor] = useState('#1A1A1A');
  const [bgColor, setBgColor] = useState('#F5F0EB');

  const styles = {
    doosletter: { label: 'Doosletters', shadow: '0 4px 12px rgba(0,0,0,0.3)', letterSpacing: '0.15em', fontWeight: 800 },
    freesletters: { label: 'Freesletters', shadow: '2px 2px 0px rgba(0,0,0,0.15)', letterSpacing: '0.08em', fontWeight: 700 },
    neon: { label: 'Neon', shadow: `0 0 10px ${color}80, 0 0 20px ${color}40, 0 0 40px ${color}20`, letterSpacing: '0.12em', fontWeight: 600 },
  };

  const colors = [
    { value: '#1A1A1A', label: 'Zwart' },
    { value: '#FFFFFF', label: 'Wit' },
    { value: '#C49585', label: 'Koper' },
    { value: '#5A8264', label: 'Groen' },
    { value: '#5D7A93', label: 'Blauw' },
    { value: '#D4856B', label: 'Oranje' },
  ];

  const bgColors = [
    { value: '#F5F0EB', label: 'Licht' },
    { value: '#2A2A2A', label: 'Donker' },
    { value: '#8B4513', label: 'Baksteen' },
    { value: '#D4D0C8', label: 'Beton' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-mist/30 overflow-hidden h-[480px] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-mist-light to-mist/30 px-5 py-4 flex items-center gap-3 border-b border-mist/20">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-mist-vivid to-mist-deep flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm">Signing Visualiser</p>
          <p className="text-xs text-mist-deep">Preview je gevelreclame</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Preview area */}
        <div
          className="flex-1 min-h-[200px] flex items-center justify-center p-6 transition-colors duration-500 relative overflow-hidden"
          style={{ backgroundColor: bgColor }}
        >
          {/* Building facade lines */}
          <div className="absolute inset-0 pointer-events-none opacity-10">
            <div className="absolute bottom-0 left-[20%] w-px h-full bg-gray-500" />
            <div className="absolute bottom-0 left-[80%] w-px h-full bg-gray-500" />
            <div className="absolute bottom-[30%] left-0 w-full h-px bg-gray-500" />
          </div>

          <div className="text-center relative z-10">
            <p
              className="text-3xl lg:text-4xl transition-all duration-500 select-none"
              style={{
                color: color,
                textShadow: styles[style].shadow,
                letterSpacing: styles[style].letterSpacing,
                fontWeight: styles[style].fontWeight,
              }}
            >
              {text || 'TEKST'}
            </p>
            {style === 'neon' && (
              <div
                className="absolute inset-0 blur-xl opacity-20 pointer-events-none"
                style={{ backgroundColor: color }}
              />
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 space-y-3 border-t border-gray-100">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Bedrijfsnaam</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value.toUpperCase())}
              className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm border border-gray-100 focus:outline-none focus:ring-2 focus:ring-mist/50"
              maxLength={20}
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Stijl</label>
              <div className="flex gap-1">
                {(Object.keys(styles) as Array<keyof typeof styles>).map(s => (
                  <button
                    key={s}
                    onClick={() => setStyle(s)}
                    className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-all ${
                      style === s
                        ? 'bg-mist text-white'
                        : 'bg-gray-50 text-gray-600 hover:bg-mist-light'
                    }`}
                  >
                    {styles[s].label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Kleur</label>
              <div className="flex gap-1.5">
                {colors.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${
                      color === c.value ? 'border-mist-deep scale-110' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Achtergrond</label>
              <div className="flex gap-1.5">
                {bgColors.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setBgColor(c.value)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${
                      bgColor === c.value ? 'border-mist-deep scale-110' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Main AI Tools Section ─── */
export const AIToolsShowcase: React.FC = () => {
  const ref = useScrollAnimation();
  const [activeTab, setActiveTab] = useState<'forgie' | 'tekst' | 'visualiser'>('forgie');

  const tabs = [
    {
      key: 'forgie' as const,
      label: 'Forgie',
      sublabel: 'AI-assistent',
      color: 'lavender',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
        </svg>
      ),
    },
    {
      key: 'tekst' as const,
      label: 'Tekst Verbeteraar',
      sublabel: 'AI-copywriting',
      color: 'sage',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
      ),
    },
    {
      key: 'visualiser' as const,
      label: 'Signing Visualiser',
      sublabel: 'Gevel-preview',
      color: 'mist',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <section id="ai-tools" ref={ref} className="py-20 lg:py-32 bg-pastel-mesh relative overflow-hidden">
      {/* Decorative orbs */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-lavender/20 rounded-full blur-3xl animate-pulse-soft pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-sage/15 rounded-full blur-3xl animate-pulse-soft pointer-events-none" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-mist/10 rounded-full blur-3xl animate-pulse-soft pointer-events-none" style={{ animationDelay: '4s' }} />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Section header */}
        <div className="text-center mb-12 lg:mb-16">
          <div className="fade-up inline-flex items-center gap-2 bg-lavender-light/60 text-lavender-deep px-4 py-2 rounded-full text-sm font-semibold mb-6 border border-lavender/30">
            <svg className="w-4 h-4 ai-sparkle" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            AI-Powered
          </div>
          <h2 className="fade-up stagger-1 text-4xl lg:text-5xl font-black tracking-tight mb-4">
            Slimmer werken met <span className="text-gradient-ai">AI-tools</span>
          </h2>
          <p className="fade-up stagger-2 text-lg text-gray-500 max-w-2xl mx-auto">
            Van offerte tot gevel. Onze AI-tools helpen je sneller, beter en creatiever werken. Probeer ze hieronder uit.
          </p>
        </div>

        {/* Tab navigation */}
        <div className="fade-up stagger-3 flex justify-center mb-8">
          <div className="inline-flex bg-white/80 backdrop-blur-sm rounded-2xl p-1.5 shadow-lg border border-gray-100">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === tab.key
                    ? `bg-${tab.color} text-white shadow-md`
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
                style={activeTab === tab.key ? {
                  background: tab.color === 'lavender' ? 'linear-gradient(135deg, #A48BBF, #7B6B8A)' :
                              tab.color === 'sage' ? 'linear-gradient(135deg, #7DB88A, #5A8264)' :
                              'linear-gradient(135deg, #7BA3C4, #5D7A93)'
                } : {}}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="fade-up stagger-4 flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
          {/* Description */}
          <div className="lg:w-[35%] lg:sticky lg:top-32">
            {activeTab === 'forgie' && (
              <div className="module-panel">
                <h3 className="text-2xl font-black mb-3">Forgie, je AI-collega</h3>
                <p className="text-gray-500 leading-relaxed mb-4">
                  Stel vragen in gewoon Nederlands. Forgie maakt offertes, plant montages,
                  haalt klantinfo op en stuurt facturen. Alsof je een extra collega hebt die alles weet.
                </p>
                <ul className="space-y-2">
                  {['Offertes maken in seconden', 'Planning automatiseren', 'Klantdata instant opvragen', 'Facturen genereren'].map(item => (
                    <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-5 h-5 rounded-full bg-lavender-light flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-lavender-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {activeTab === 'tekst' && (
              <div className="module-panel">
                <h3 className="text-2xl font-black mb-3">Teksten die converteren</h3>
                <p className="text-gray-500 leading-relaxed mb-4">
                  Plak je tekst erin, kies een toon, en onze AI herschrijft het tot professionele copy.
                  Perfect voor offertes, e-mails en websiteteksten.
                </p>
                <ul className="space-y-2">
                  {['3 tonen: professioneel, vriendelijk, overtuigend', 'Spellings- en grammaticacheck', 'SEO-geoptimaliseerde content', 'Direct kopiëren en plakken'].map(item => (
                    <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-5 h-5 rounded-full bg-sage-light flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-sage-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {activeTab === 'visualiser' && (
              <div className="module-panel">
                <h3 className="text-2xl font-black mb-3">Zie het voor je</h3>
                <p className="text-gray-500 leading-relaxed mb-4">
                  Laat je klant zien hoe hun gevelreclame eruitziet. Nog voor de productie begint.
                  Kies lettertype, stijl en kleur en deel de preview direct.
                </p>
                <ul className="space-y-2">
                  {['Doosletters, freesletters en neon', 'Realtime kleur- en stijlpreview', 'Deel met klanten via link', 'Direct opnemen in offerte'].map(item => (
                    <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-5 h-5 rounded-full bg-mist-light flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-mist-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Interactive demo */}
          <div className="lg:w-[65%] w-full">
            {activeTab === 'forgie' && <ForgieDemo />}
            {activeTab === 'tekst' && <TekstVerbeteraarDemo />}
            {activeTab === 'visualiser' && <SigningVisualiserDemo />}
          </div>
        </div>

        {/* Additional AI Features Grid */}
        <div className="mt-16 lg:mt-24">
          <div className="text-center mb-10">
            <h3 className="fade-up text-2xl lg:text-3xl font-black tracking-tight mb-3">
              En nog veel meer <span className="text-gradient-ai">AI-functies</span>
            </h3>
            <p className="fade-up stagger-1 text-gray-500 max-w-xl mx-auto">
              Forgie zit overal in FORGEdesk verweven. Deze slimme functies besparen je dagelijks tijd.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* AI Insight Widget */}
            <div className="fade-up stagger-1 group bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-lavender/20 hover:border-lavender/40 hover:shadow-lg transition-all">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-lavender to-lavender-vivid flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Slimme Inzichten</h4>
              <p className="text-sm text-gray-500 leading-relaxed">
                Proactieve meldingen op je dashboard: verlopen offertes, achterstallige taken, deadlines en budget-alerts. AI denkt met je mee.
              </p>
            </div>

            {/* Klant AI Chat */}
            <div className="fade-up stagger-2 group bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-sage/20 hover:border-sage/40 hover:shadow-lg transition-all">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sage to-sage-vivid flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Klant AI-analyse</h4>
              <p className="text-sm text-gray-500 leading-relaxed">
                Stel vragen over elke klant: omzet, projecthistorie, openstaande offertes en facturen. Per klant een eigen AI-chat.
              </p>
            </div>

            {/* AI Tekst Generator */}
            <div className="fade-up stagger-3 group bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-mist/20 hover:border-mist/40 hover:shadow-lg transition-all">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-mist to-mist-vivid flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Tekst Generator</h4>
              <p className="text-sm text-gray-500 leading-relaxed">
                Genereer complete e-mails, offerteteksten, project-updates, notulen en social media posts. Kies een toon en klaar.
              </p>
            </div>

            {/* Email AI */}
            <div className="fade-up stagger-1 group bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-lavender/20 hover:border-lavender/40 hover:shadow-lg transition-all">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-lavender-vivid to-lavender-deep flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Slimme E-mail</h4>
              <p className="text-sm text-gray-500 leading-relaxed">
                Herschrijf e-mails professioneler, genereer follow-ups, maak samenvattingen of vertaal direct naar Engels en terug.
              </p>
            </div>

            {/* AI Text Toolbar */}
            <div className="fade-up stagger-2 group bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-sage/20 hover:border-sage/40 hover:shadow-lg transition-all">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sage-vivid to-sage-deep flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Inline AI-toolbar</h4>
              <p className="text-sm text-gray-500 leading-relaxed">
                Selecteer tekst en een slimme toolbar verschijnt: herschrijf beknopt, uitgebreid, formeel, informeel of met humor. 9 acties met &eacute;&eacute;n klik.
              </p>
            </div>

            {/* AI Vertalen */}
            <div className="fade-up stagger-3 group bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-mist/20 hover:border-mist/40 hover:shadow-lg transition-all">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-mist-vivid to-mist-deep flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
                </svg>
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Direct Vertalen</h4>
              <p className="text-sm text-gray-500 leading-relaxed">
                Vertaal teksten, e-mails en offertes direct van Nederlands naar Engels en andersom. Ideaal voor internationale klanten.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AIToolsShowcase;
