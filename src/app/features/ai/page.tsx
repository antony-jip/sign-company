'use client';

import React, { useState } from 'react';
import { FeaturePageTemplate } from '@/components/FeaturePageTemplate';

/* ─── Forgie Chat Demo ─── */
const ForgieChat: React.FC = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant' as const, text: 'Hoi! Ik ben Forgie, je AI-assistent. Hoe kan ik je helpen?' },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);

  const responses: Record<string, string> = {
    offerte: 'Ik heb offerte OFF-2026-089 gevonden voor Bakkerij Jansen. Totaal: €2.450 excl. BTW. Status: verstuurd op 10 maart. Wil je de details zien?',
    planning: 'Volgende week heb je 3 montages gepland: maandag (LED lichtreclame), woensdag (gevelreclame) en vrijdag (wrapping). Wil je de planning openen?',
    factuur: 'Er staan 2 openstaande facturen: FAC-2026-041 (€1.200, 14 dagen over tijd) en FAC-2026-045 (€3.800, nog 5 dagen). Zal ik een herinnering sturen?',
    default: 'Goed idee! Ik kan je helpen met offertes, planning, facturen, klantgegevens en meer. Vraag maar raak!',
  };

  const handleSend = () => {
    if (!input.trim() || typing) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'assistant' as const, text: userMsg }]);
    setInput('');
    setTyping(true);

    const key = Object.keys(responses).find(k => userMsg.toLowerCase().includes(k)) || 'default';

    setTimeout(() => {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'user' as const, text: userMsg },
        { role: 'assistant' as const, text: responses[key] },
      ]);
      setTyping(false);
    }, 1200);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-peach/30 overflow-hidden">
      <div className="bg-gradient-to-r from-peach-light to-peach-light/50 px-5 py-3 border-b border-peach/20 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-peach flex items-center justify-center">
          <svg className="w-4 h-4 text-peach-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm">Forgie</p>
          <p className="text-xs text-peach-deep">AI Assistent</p>
        </div>
      </div>

      <div className="h-72 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
              msg.role === 'user'
                ? 'bg-gray-900 text-white rounded-br-md'
                : 'bg-peach-light/60 text-gray-800 rounded-bl-md'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="bg-peach-light/60 px-4 py-2.5 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-peach-deep/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-peach-deep/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-peach-deep/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Vraag iets aan Forgie..."
            className="flex-1 bg-gray-50 rounded-xl px-4 py-2.5 text-sm border border-gray-100 focus:outline-none focus:ring-2 focus:ring-peach/50"
          />
          <button
            onClick={handleSend}
            className="bg-peach-deep hover:bg-peach-vivid text-white px-4 py-2.5 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
        <div className="flex gap-2 mt-2">
          {['Toon mijn offertes', 'Wat staat er op de planning?', 'Open facturen'].map(q => (
            <button
              key={q}
              onClick={() => { setInput(q); }}
              className="text-xs bg-peach-light/40 text-peach-deep px-3 py-1.5 rounded-full hover:bg-peach-light transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─── Tekst Verbeteraar Demo ─── */
const TekstVerbeteraar: React.FC = () => {
  const [original] = useState('Beste klant, hierbij de offerte voor uw gevelreclame. We gaan het maken van rvs letters. Prijs is 2400 euro. Groetjes');
  const [improved, setImproved] = useState('');
  const [loading, setLoading] = useState(false);

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
    }, 20);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-peach/30 p-5 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-peach-light flex items-center justify-center">
          <svg className="w-4 h-4 text-peach-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm">Tekst Verbeteraar</p>
          <p className="text-xs text-gray-400">AI herschrijft je tekst professioneel</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-2">Origineel</p>
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 min-h-[140px] border border-gray-100">
            {original}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-peach-deep mb-2">Verbeterd door AI</p>
          <div className="bg-peach-light/20 rounded-xl p-4 text-sm text-gray-800 min-h-[140px] border border-peach/20 whitespace-pre-line">
            {improved || <span className="text-gray-400 italic">Klik op verbeter om te zien...</span>}
          </div>
        </div>
      </div>

      <button
        onClick={handleImprove}
        disabled={loading}
        className="mt-4 w-full bg-gradient-to-r from-peach-deep to-peach-vivid hover:from-peach-vivid hover:to-peach-deep text-white font-semibold px-6 py-3 rounded-xl transition-all hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4 ai-sparkle" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        {loading ? 'Bezig met verbeteren...' : 'Verbeter met AI'}
      </button>
    </div>
  );
};

const sparkleIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
  </svg>
);

const editIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
  </svg>
);

const eyeIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export default function AIFeaturePage() {
  return (
    <FeaturePageTemplate
      color="peach"
      badge="AI-Powered"
      title="Slimmer werken met"
      titleHighlight="kunstmatige intelligentie"
      subtitle="FORGEdesk heeft AI ingebouwd in elke module. Van chatassistent tot tekst verbeteren — AI helpt je sneller en professioneler werken."
      highlights={[
        {
          icon: sparkleIcon,
          title: 'Forgie Chat',
          description: 'Stel vragen over je data in gewone taal. Forgie vindt offertes, planning, klantinfo en meer in seconden.',
        },
        {
          icon: editIcon,
          title: 'Tekst Verbeteraar',
          description: 'Laat AI je e-mails, offertes en berichten herschrijven naar professioneel Nederlands. Eén klik, klaar.',
        },
        {
          icon: eyeIcon,
          title: 'Slimme Inzichten',
          description: 'AI analyseert je bedrijfsdata en geeft proactief advies over openstaande facturen, conversie en planning.',
        },
      ]}
      demo={
        <div>
          <ForgieChat />
          <TekstVerbeteraar />
        </div>
      }
      demoTitle="Probeer de AI zelf uit"
      demoSubtitle="Chat met Forgie of verbeter een tekst. Precies zoals het in de app werkt."
    />
  );
}
