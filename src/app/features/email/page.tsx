'use client';

import React, { useState } from 'react';
import FeaturePage from '@/components/landing/FeaturePage';

/* ─── Email Client Demo ─── */
function EmailDemo() {
  const [selectedEmail, setSelectedEmail] = useState<number | null>(null);
  const [aiReply, setAiReply] = useState('');
  const [generating, setGenerating] = useState(false);

  const emails = [
    {
      id: 1,
      from: 'Jan Jansen',
      initials: 'JJ',
      subject: 'Offerte gevelreclame',
      preview: 'Goedemiddag, ik heb de offerte ontvangen maar heb nog een vraag over...',
      body: 'Goedemiddag,\n\nIk heb de offerte ontvangen maar heb nog een vraag over de montagekosten. Kunnen jullie dit specificeren per uur? En is de levertijd nog steeds 3 weken?\n\nMet vriendelijke groet,\nJan Jansen\nBakkerij Jansen',
      time: '10:24',
      unread: true,
      tag: 'Offerte',
      tagColor: 'bg-lavender-light text-lavender-deep',
      klant: 'Bakkerij Jansen',
    },
    {
      id: 2,
      from: 'Lisa de Vries',
      initials: 'LV',
      subject: 'Planning aanpassen?',
      preview: 'Hi, is het mogelijk om de montage te verplaatsen naar volgende week...',
      body: 'Hi,\n\nIs het mogelijk om de montage te verplaatsen naar volgende week donderdag? We hebben nog wat vertraging bij de verbouwing.\n\nGr,\nLisa de Vries\nMatec Amsterdam',
      time: '09:15',
      unread: true,
      tag: 'Planning',
      tagColor: 'bg-sage-light text-sage-deep',
      klant: 'Matec Amsterdam',
    },
    {
      id: 3,
      from: 'Tom van Dijk',
      initials: 'TV',
      subject: 'Re: Factuur FV-2026-041',
      preview: 'Bedankt voor de herinnering. De betaling is onderweg...',
      body: 'Bedankt voor de herinnering. De betaling is onderweg en zou morgen op jullie rekening moeten staan.\n\nMet vriendelijke groet,\nTom van Dijk',
      time: 'Gisteren',
      unread: false,
      tag: 'Factuur',
      tagColor: 'bg-blush-light text-blush-deep',
      klant: 'Van Dijk Installatie',
    },
  ];

  const selectedMail = emails.find(e => e.id === selectedEmail);

  const generateReply = () => {
    if (!selectedMail) return;
    setGenerating(true);
    setAiReply('');

    const replies: Record<number, string> = {
      1: 'Beste heer Jansen,\n\nBedankt voor uw reactie. De montagekosten zijn berekend op basis van €65 per uur, geschat op 4 uur totaal. De levertijd is inderdaad 3 weken vanaf akkoord.\n\nIk stuur u graag een aangepaste specificatie toe.\n\nMet vriendelijke groet,\nTeam FORGEdesk',
      2: 'Hi Lisa,\n\nGeen probleem! Ik heb de planning aangepast naar donderdag 20 maart. Ons team is dan beschikbaar van 09:00 tot 14:00.\n\nKun je bevestigen dat de locatie dan toegankelijk is?\n\nGroet,\nTeam FORGEdesk',
      3: 'Beste Tom,\n\nBedankt voor de snelle reactie. Ik houd de betaling in de gaten en markeer de factuur als \'in behandeling\'.\n\nMet vriendelijke groet,\nTeam FORGEdesk',
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
    <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-ink-10 overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-12">
        {/* Email list */}
        <div className="md:col-span-5 border-r border-ink-10">
          <div className="px-5 py-3.5 border-b border-ink-10 bg-cream-light/30 flex items-center justify-between">
            <div>
              <p className="font-heading text-[15px] font-bold text-ink">Inbox</p>
              <p className="text-[11px] text-ink-40">{emails.filter(e => e.unread).length} ongelezen · Gmail sync</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sage-vivid" />
              <span className="text-[10px] text-ink-40">Twee-weg sync</span>
            </div>
          </div>
          <div className="divide-y divide-ink-05">
            {emails.map(email => (
              <button
                key={email.id}
                onClick={() => { setSelectedEmail(email.id); setAiReply(''); }}
                className={`w-full text-left px-5 py-3.5 transition-colors ${
                  selectedEmail === email.id ? 'bg-cream-light/40' : 'hover:bg-ink-05'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                    email.unread ? 'bg-cream text-cream-deep' : 'bg-ink-05 text-ink-40'
                  }`}>
                    {email.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-[13px] ${email.unread ? 'font-bold text-ink' : 'font-medium text-ink-60'}`}>
                        {email.from}
                      </span>
                      <span className="text-[11px] text-ink-40">{email.time}</span>
                    </div>
                    <p className={`text-[13px] truncate ${email.unread ? 'text-ink-80' : 'text-ink-40'}`}>{email.subject}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${email.tagColor}`}>{email.tag}</span>
                      <p className="text-[11px] text-ink-40 truncate">{email.preview}</p>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Email detail + CRM sidebar */}
        <div className="md:col-span-7">
          {selectedMail ? (
            <div className="flex flex-col md:flex-row h-full">
              {/* Email content */}
              <div className="flex-1 p-5 border-r border-ink-10">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-heading text-[16px] font-bold text-ink">{selectedMail.subject}</h3>
                    <p className="text-[13px] text-ink-40">Van: {selectedMail.from}</p>
                  </div>
                  <span className={`pastel-pill ${selectedMail.tagColor}`}>{selectedMail.tag}</span>
                </div>
                <div className="bg-ink-05 rounded-xl p-4 text-[14px] text-ink-60 whitespace-pre-line mb-4 leading-[1.7]">
                  {selectedMail.body}
                </div>

                {/* AI Reply */}
                <div className="border-t border-ink-10 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[12px] font-semibold text-ink-40 uppercase tracking-wide">Antwoord</p>
                    <button
                      onClick={generateReply}
                      disabled={generating}
                      className="flex items-center gap-1.5 text-[12px] font-semibold text-cream-deep hover:text-cream-vivid transition-colors disabled:opacity-50"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                      {generating ? 'Bezig...' : 'AI Antwoord'}
                    </button>
                  </div>
                  <div className="bg-cream-light/20 rounded-xl p-4 text-[14px] text-ink min-h-[80px] border border-cream/20 whitespace-pre-line leading-[1.7]">
                    {aiReply || <span className="text-ink-40 italic">Klik op &quot;AI Antwoord&quot; voor een concept...</span>}
                  </div>
                </div>
              </div>

              {/* CRM Sidebar */}
              <div className="w-full md:w-[180px] p-4 bg-ink-05/50 border-t md:border-t-0">
                <p className="text-[10px] font-semibold text-ink-40 uppercase tracking-wide mb-3">Klant</p>
                <div className="space-y-3">
                  <div>
                    <p className="text-[13px] font-medium text-ink">{selectedMail.klant}</p>
                    <p className="text-[11px] text-ink-40">Amsterdam</p>
                  </div>
                  <div className="border-t border-ink-10 pt-3">
                    <p className="text-[10px] text-ink-40 mb-1">Open offertes</p>
                    <p className="text-[14px] font-mono font-semibold text-ink">€2.450</p>
                  </div>
                  <div className="border-t border-ink-10 pt-3">
                    <p className="text-[10px] text-ink-40 mb-1">Laatste contact</p>
                    <p className="text-[12px] text-ink-60">Vandaag</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[350px] text-ink-40 text-[14px]">
              <div className="text-center">
                <svg className="w-10 h-10 mx-auto mb-3 text-ink-20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                Selecteer een e-mail
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EmailFeaturePage() {
  return (
    <FeaturePage
      color="cream"
      overline="E-mail"
      heading={<>E-mail gekoppeld aan je <span className="text-ember-gradient">projecten</span></>}
      subtitle="Volledig twee-weg Gmail koppeling via app password. Alles automatisch gekoppeld aan klanten en offertes."
      highlights={[
        {
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-1.135a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.5 8.627" />
            </svg>
          ),
          title: 'Automatisch Koppelen',
          description: 'E-mails worden automatisch aan klanten, offertes en projecten gekoppeld. Twee-weg sync met Gmail.',
        },
        {
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          ),
          title: 'AI Antwoorden',
          description: 'Laat AI een concept-antwoord schrijven op basis van de context. Pas aan en verstuur in seconden.',
        },
        {
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          ),
          title: 'CRM Sidebar',
          description: 'Bij elke mail zie je direct klantinfo: openstaande offertes, projectstatus en contacthistorie.',
        },
      ]}
      demo={<EmailDemo />}
      demoTitle="Probeer de inbox"
      demoSubtitle="Klik op een e-mail, bekijk de CRM-sidebar en laat AI een antwoord genereren."
    />
  );
}
