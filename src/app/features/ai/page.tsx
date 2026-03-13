'use client';

import React, { useState, useRef, useEffect } from 'react';
import FeaturePage from '@/components/landing/FeaturePage';

/* ─── Forgie Chat Demo ─── */
function ForgieChat() {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([
    { role: 'assistant', text: 'Hoi! Ik ben Forgie, je AI-assistent. Ik ken je hele administratie — vraag maar raak.' },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const responses: Record<string, string> = {
    offerte: 'Je hebt 12 offertes open staan met een totaalwaarde van €34.250. De oudste (OFF-2026-071 voor Matec) wacht al 18 dagen op akkoord. Wil je dat ik een herinnering voorbereid?',
    factuur: 'Er staat €8.420 aan open facturen. FAC-2026-041 (Bakkerij Jansen, €1.200) is 14 dagen over tijd. Zal ik een betalingsherinnering sturen?',
    open: 'Er staat €8.420 aan open facturen en €34.250 aan openstaande offertes. Totaal uitstaand: €42.670. De meeste openstaande posten zijn van Matec Amsterdam.',
    planning: 'Volgende week: ma LED-montage bij Jansen (Joris+Mark), wo gevelletters Studio Bloom, vr wrapping Matec. Wil je de details?',
    omzet: 'Deze maand: €28.400 omzet, 23% hoger dan vorige maand. Marge gemiddeld 42%. Top-klant: Matec Amsterdam (€12.800).',
    mail: 'Je hebt 3 ongelezen mails. Eén van Jan Jansen over offerte gevelreclame — hij vraagt om specificatie montagekosten. Zal ik een antwoord schrijven?',
    klant: 'Je hebt 47 actieve klanten. Top 3 op omzet: Matec Amsterdam (€52K), Van Dijk Installatie (€34K), Studio Bloom (€28K). Wil je een klantanalyse?',
    default: 'Ik kan je helpen met offertes, facturen, planning, klantgegevens, e-mails en meer. Ik ken je hele administratie — vraag maar!',
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, typing]);

  const handleSend = () => {
    if (!input.trim() || typing) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setTyping(true);

    const key = Object.keys(responses).find(k => userMsg.toLowerCase().includes(k)) || 'default';

    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', text: responses[key] }]);
      setTyping(false);
    }, 1200);
  };

  return (
    <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-ink-10 overflow-hidden">
      {/* Header */}
      <div className="bg-peach-light/40 px-5 py-3.5 border-b border-ink-10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-peach flex items-center justify-center">
          <svg className="w-4 h-4 text-peach-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <div>
          <p className="font-heading text-[15px] font-bold text-ink">Forgie</p>
          <p className="text-[11px] text-ink-40">AI Assistent · Gekoppeld aan je administratie</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sage-vivid" />
          <span className="text-[11px] text-ink-40">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="h-[320px] overflow-y-auto p-5 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-peach-light flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5 text-peach-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
            )}
            <div className={`max-w-[75%] px-4 py-2.5 text-[14px] leading-[1.6] ${
              msg.role === 'user'
                ? 'bg-ink text-white rounded-2xl rounded-br-md'
                : 'bg-ink-05 text-ink rounded-2xl rounded-bl-md'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-peach-light flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-peach-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div className="bg-ink-05 px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-ink-20 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-ink-20 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-ink-20 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-ink-10 bg-white">
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Vraag iets aan Forgie..."
            className="flex-1 bg-ink-05 rounded-xl px-4 py-2.5 text-[14px] border border-ink-10 focus:outline-none focus:ring-2 focus:ring-peach/40 text-ink placeholder:text-ink-40"
          />
          <button
            onClick={handleSend}
            disabled={typing}
            className="bg-ink hover:bg-ink-80 text-white px-4 py-2.5 rounded-xl transition-colors disabled:opacity-40"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {['Hoeveel staat er open?', 'Toon mijn planning', 'Analyseer mijn klanten', 'Vat mijn mail samen'].map(q => (
            <button
              key={q}
              onClick={() => setInput(q)}
              className="text-[12px] bg-peach-light/50 text-peach-deep px-3 py-1.5 rounded-full hover:bg-peach-light transition-colors font-medium"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Tekst Verbeteraar ─── */
function TekstVerbeteraar() {
  const [improved, setImproved] = useState('');
  const [loading, setLoading] = useState(false);

  const original = 'Beste klant, hierbij de offerte voor uw gevelreclame. We gaan het maken van rvs letters. Prijs is 2400 euro. Groetjes';

  const handleImprove = () => {
    setLoading(true);
    setImproved('');
    const result = 'Beste heer De Vries,\n\nHierbij ontvangt u onze offerte voor de gevelreclame aan uw bedrijfspand. Wij vervaardigen RVS-freesletters in uw huisstijl, inclusief LED-verlichting en professionele montage.\n\nInvestering: € 2.400,- excl. BTW\n\nWij kijken uit naar een prettige samenwerking.\n\nMet vriendelijke groet,\nTeam FORGEdesk';

    let i = 0;
    const interval = setInterval(() => {
      if (i < result.length) {
        setImproved(result.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setLoading(false);
      }
    }, 18);
  };

  return (
    <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-ink-10 p-6 mt-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-peach-light flex items-center justify-center">
          <svg className="w-4 h-4 text-peach-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
        </div>
        <div>
          <p className="font-heading text-[15px] font-bold text-ink">Tekst Verbeteraar</p>
          <p className="text-[11px] text-ink-40">AI herschrijft je tekst professioneel</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] font-semibold text-ink-40 uppercase tracking-wide mb-2">Origineel</p>
          <div className="bg-ink-05 rounded-xl p-4 text-[14px] text-ink-60 min-h-[160px] border border-ink-10 leading-[1.7]">
            {original}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-peach-deep uppercase tracking-wide mb-2">Verbeterd door AI</p>
          <div className="bg-peach-light/20 rounded-xl p-4 text-[14px] text-ink min-h-[160px] border border-peach/20 whitespace-pre-line leading-[1.7]">
            {improved || <span className="text-ink-40 italic">Klik op verbeter om te zien...</span>}
          </div>
        </div>
      </div>

      <button
        onClick={handleImprove}
        disabled={loading}
        className="mt-5 w-full bg-ink hover:bg-ink-80 text-white font-semibold px-6 py-3 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(0,0,0,0.15)] disabled:opacity-50 flex items-center justify-center gap-2 text-[14px]"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        {loading ? 'Bezig met verbeteren...' : 'Verbeter met AI'}
      </button>
    </div>
  );
}

export default function AIFeaturePage() {
  return (
    <FeaturePage
      color="peach"
      overline="AI Tools"
      heading={<>Slimmer werken met <span className="text-ember-gradient">AI</span></>}
      subtitle="Forgie, je AI-assistent. Gekoppeld aan je volledige administratie — open bedragen, offertestatus, klantdata en meer."
      highlights={[
        {
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          ),
          title: 'Chat Assistent',
          description: 'Stel vragen in gewone taal. Forgie kent je klanten, offertes, facturen en planning. Hoeveel staat er open? Wie moet ik bellen?',
        },
        {
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              <path d="M19.5 7.125L16.862 4.487" />
            </svg>
          ),
          title: 'Tekst Verbeteren',
          description: 'Laat AI je e-mails en offerteteksten herschrijven naar professioneel Nederlands. Eén klik, klaar.',
        },
        {
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" />
              <path d="M9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625z" />
              <path d="M16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          ),
          title: 'Slimme Inzichten',
          description: 'Mails samenvatten, klantanalyse, omzetinzichten. AI die proactief advies geeft op basis van je data.',
        },
      ]}
      demo={
        <div>
          <ForgieChat />
          <TekstVerbeteraar />
        </div>
      }
      demoTitle="Probeer Forgie zelf"
      demoSubtitle="Chat met je AI-assistent of verbeter een tekst. Precies zoals het in de app werkt."
    />
  );
}
