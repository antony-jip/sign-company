'use client';

import React, { useState } from 'react';
import { FeaturePageTemplate } from '@/components/FeaturePageTemplate';

/* ─── Inbox Simulator ─── */
const InboxSimulator: React.FC = () => {
  const [selectedEmail, setSelectedEmail] = useState<number | null>(null);
  const [aiReply, setAiReply] = useState('');
  const [generating, setGenerating] = useState(false);

  const emails = [
    {
      id: 1,
      from: 'Jan Jansen',
      subject: 'Offerte gevelreclame',
      preview: 'Goedemiddag, ik heb de offerte ontvangen maar heb nog een vraag over...',
      body: 'Goedemiddag,\n\nIk heb de offerte ontvangen maar heb nog een vraag over de montagekosten. Kunnen jullie dit specificeren per uur? En is de levertijd nog steeds 3 weken?\n\nMet vriendelijke groet,\nJan Jansen\nBakkerij Jansen',
      time: '10:24',
      unread: true,
      tag: 'Offerte',
      tagColor: 'bg-lavender-light text-lavender-deep',
    },
    {
      id: 2,
      from: 'Lisa de Vries',
      subject: 'Planning aanpassen?',
      preview: 'Hi, is het mogelijk om de montage te verplaatsen naar volgende week...',
      body: 'Hi,\n\nIs het mogelijk om de montage te verplaatsen naar volgende week donderdag? We hebben nog wat vertraging bij de verbouwing.\n\nGr,\nLisa de Vries\nMatec Amsterdam',
      time: '09:15',
      unread: true,
      tag: 'Planning',
      tagColor: 'bg-sage-light text-sage-deep',
    },
    {
      id: 3,
      from: 'Tom van Dijk',
      subject: 'Re: Factuur FV-2026-041',
      preview: 'Bedankt voor de herinnering. De betaling is onderweg...',
      body: 'Bedankt voor de herinnering. De betaling is onderweg en zou morgen op jullie rekening moeten staan.\n\nMet vriendelijke groet,\nTom van Dijk',
      time: 'Gisteren',
      unread: false,
      tag: 'Factuur',
      tagColor: 'bg-blush-light text-blush-deep',
    },
  ];

  const selectedMail = emails.find(e => e.id === selectedEmail);

  const generateReply = () => {
    if (!selectedMail) return;
    setGenerating(true);
    setAiReply('');

    const replies: Record<number, string> = {
      1: 'Beste heer Jansen,\n\nBedankt voor uw reactie. De montagekosten zijn berekend op basis van €65 per uur, geschat op 4 uur totaal. De levertijd is inderdaad 3 weken vanaf akkoord.\n\nIk stuur u graag een aangepaste specificatie toe. Heeft u verder nog vragen?\n\nMet vriendelijke groet,\nTeam FORGEdesk',
      2: 'Hi Lisa,\n\nGeen probleem! Ik heb de planning aangepast naar donderdag 20 maart. Ons team (Joris en Mark) is dan beschikbaar van 09:00 tot 14:00.\n\nKun je bevestigen dat de locatie dan toegankelijk is?\n\nGroet,\nTeam FORGEdesk',
      3: 'Beste Tom,\n\nBedankt voor de snelle reactie. Ik houd de betaling in de gaten en markeer de factuur als \'in behandeling\'.\n\nFijne dag!\n\nMet vriendelijke groet,\nTeam FORGEdesk',
    };

    const reply = replies[selectedMail.id] || '';
    let i = 0;
    const interval = setInterval(() => {
      if (i < reply.length) {
        setAiReply(reply.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setGenerating(false);
      }
    }, 15);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-cream/30 overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-5">
        {/* Email list */}
        <div className="md:col-span-2 border-r border-gray-100">
          <div className="px-4 py-3 border-b border-gray-100 bg-cream-light/30">
            <p className="font-bold text-gray-900 text-sm">Inbox</p>
            <p className="text-xs text-gray-400">{emails.filter(e => e.unread).length} ongelezen</p>
          </div>
          <div className="divide-y divide-gray-50">
            {emails.map(email => (
              <button
                key={email.id}
                onClick={() => { setSelectedEmail(email.id); setAiReply(''); }}
                className={`w-full text-left px-4 py-3 transition-colors ${
                  selectedEmail === email.id
                    ? 'bg-cream-light/40'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm ${email.unread ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
                    {email.from}
                  </span>
                  <span className="text-xs text-gray-400">{email.time}</span>
                </div>
                <p className={`text-sm truncate ${email.unread ? 'text-gray-800' : 'text-gray-500'}`}>{email.subject}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${email.tagColor}`}>{email.tag}</span>
                  <p className="text-xs text-gray-400 truncate">{email.preview}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Email detail */}
        <div className="md:col-span-3">
          {selectedMail ? (
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900">{selectedMail.subject}</h3>
                  <p className="text-sm text-gray-500">Van: {selectedMail.from}</p>
                </div>
                <span className={`pastel-pill ${selectedMail.tagColor}`}>{selectedMail.tag}</span>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-line mb-4">
                {selectedMail.body}
              </div>

              {/* AI Reply */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-900">Antwoord</p>
                  <button
                    onClick={generateReply}
                    disabled={generating}
                    className="flex items-center gap-1.5 text-xs font-semibold text-cream-deep hover:text-cream-vivid transition-colors disabled:opacity-50"
                  >
                    <svg className="w-3.5 h-3.5 ai-sparkle" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    {generating ? 'Bezig...' : 'AI Antwoord genereren'}
                  </button>
                </div>
                <div className="bg-cream-light/20 rounded-xl p-4 text-sm text-gray-700 min-h-[100px] border border-cream/20 whitespace-pre-line">
                  {aiReply || <span className="text-gray-400 italic">Klik op &quot;AI Antwoord genereren&quot; voor een concept...</span>}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[300px] text-gray-400 text-sm">
              Selecteer een e-mail om te lezen
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const inboxIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" />
  </svg>
);

const sparkleIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
  </svg>
);

const linkIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-1.135a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.5 8.627" />
  </svg>
);

export default function EmailFeaturePage() {
  return (
    <FeaturePageTemplate
      color="cream"
      badge="E-mail"
      title="E-mail direct gekoppeld aan je"
      titleHighlight="projecten"
      subtitle="Geen losse e-mails meer zoeken. FORGEdesk koppelt inkomende mail automatisch aan klanten, offertes en projecten. Met AI-gegenereerde antwoorden."
      highlights={[
        {
          icon: inboxIcon,
          title: 'Slimme Inbox',
          description: 'Alle zakelijke e-mail op één plek. Automatisch gekoppeld aan de juiste klant en het juiste project.',
        },
        {
          icon: sparkleIcon,
          title: 'AI Antwoorden',
          description: 'Laat AI een concept-antwoord schrijven op basis van de context. Pas aan en verstuur in seconden.',
        },
        {
          icon: linkIcon,
          title: 'Automatisch Koppelen',
          description: 'E-mails worden automatisch gekoppeld aan klanten, offertes en projecten. Niets gaat verloren.',
        },
      ]}
      demo={<InboxSimulator />}
      demoTitle="Probeer de inbox uit"
      demoSubtitle="Klik op een e-mail en laat AI een antwoord genereren. Precies zoals het in de app werkt."
    />
  );
}
