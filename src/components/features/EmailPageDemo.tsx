'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

/* ─── Types ─── */
type EmailStatus = 'nieuw' | 'in behandeling' | 'afgerond';

interface DemoEmail {
  id: number;
  sender: string;
  initials: string;
  avatarColor: string;
  subject: string;
  preview: string;
  time: string;
  status: EmailStatus;
  unread: boolean;
  to: string;
  date: string;
  body: string;
  aiReply: string;
}

/* ─── Status color map ─── */
const statusColors: Record<EmailStatus, { dot: string; bg: string; text: string }> = {
  nieuw: { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
  'in behandeling': { dot: 'bg-orange-400', bg: 'bg-orange-50', text: 'text-orange-700' },
  afgerond: { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
};

const statusOptions: EmailStatus[] = ['nieuw', 'in behandeling', 'afgerond'];

/* ─── Team members ─── */
const team = [
  { initials: 'J', name: 'Joris', color: 'bg-mist-vivid' },
  { initials: 'M', name: 'Mark', color: 'bg-lavender-vivid' },
  { initials: 'L', name: 'Lisa', color: 'bg-peach-vivid' },
];

/* ─── Demo emails ─── */
const initialEmails: DemoEmail[] = [
  {
    id: 1,
    sender: 'Mark Jansen',
    initials: 'MJ',
    avatarColor: 'bg-mist-vivid',
    subject: 'Re: Offerte lichtreclame',
    preview: 'Bedankt voor de offerte. Ik heb nog een vraag over de montagekosten...',
    time: '10:23',
    status: 'nieuw',
    unread: true,
    to: 'info@signcompany.nl',
    date: 'Vandaag, 10:23',
    body: `Beste Sign Company,

Bedankt voor de offerte voor de LED lichtreclame. Het ontwerp ziet er goed uit! Ik heb nog wel een vraag over de montagekosten — zijn die inclusief het hoogwerkergebruik?

Daarnaast wil ik graag weten of het mogelijk is om de letters in een warmwitte kleur te maken in plaats van koelwit. We willen graag een warme uitstraling die bij onze bakkerij past.

Kunnen jullie volgende week langskomen om de exacte positie te bespreken?

Met vriendelijke groet,
Mark Jansen
Bakkerij Jansen`,
    aiReply: `Beste Mark,

Bedankt voor je bericht! Goed om te horen dat het ontwerp bevalt.

Wat betreft je vragen:
- De montagekosten zijn inclusief hoogwerkergebruik, daar hoef je je geen zorgen over te maken.
- Warmwit (3000K) is zeker mogelijk en past inderdaad perfect bij een bakkerij. Ik pas de offerte hierop aan.

Ik kom graag volgende week langs om de exacte positie te bepalen. Schikt dinsdag- of woensdagochtend?

Met vriendelijke groet,
Sign Company`,
  },
  {
    id: 2,
    sender: 'Lisa de Vries',
    initials: 'LV',
    avatarColor: 'bg-lavender-vivid',
    subject: 'Vraag over montage datum',
    preview: 'Hoi, ik vroeg me af wanneer de montage van onze gevelreclame gepland staat...',
    time: '09:15',
    status: 'in behandeling',
    unread: false,
    to: 'info@signcompany.nl',
    date: 'Vandaag, 09:15',
    body: `Hoi,

Ik vroeg me af wanneer de montage van onze gevelreclame gepland staat. We hebben binnenkort een opening van onze nieuwe locatie en het zou fijn zijn als alles er tegen die tijd hangt.

De opening is op 28 maart. Is dat haalbaar?

Groetjes,
Lisa de Vries
De Vries Interiors`,
    aiReply: `Hoi Lisa,

Wat leuk dat jullie nieuwe locatie bijna klaar is! De montage staat op dit moment gepland voor 24 maart, dus ruim voor jullie opening op de 28e.

Ons team komt die ochtend om 08:00 en verwacht rond 14:00 klaar te zijn. Ik stuur je volgende week nog een bevestiging met de exacte details.

Succes met de voorbereidingen!

Groetjes,
Sign Company`,
  },
  {
    id: 3,
    sender: 'Garage De Wit',
    initials: 'GW',
    avatarColor: 'bg-sage-vivid',
    subject: 'Factuur ontvangen, dank!',
    preview: 'We hebben de factuur ontvangen en deze is goedgekeurd. Betaling volgt...',
    time: 'gisteren',
    status: 'afgerond',
    unread: false,
    to: 'info@signcompany.nl',
    date: 'Gisteren, 16:42',
    body: `Beste Sign Company,

We hebben de factuur (F-2026-089) ontvangen en deze is goedgekeurd door onze administratie. De betaling wordt binnen 14 dagen overgemaakt.

Nogmaals bedankt voor het snelle werk aan ons nieuwe bedrijfsbord. Het ziet er fantastisch uit — we krijgen al complimenten van klanten!

Met vriendelijke groet,
Peter de Wit
Garage De Wit`,
    aiReply: `Beste Peter,

Wat fijn om te horen! Bedankt voor de snelle goedkeuring van de factuur.

Super dat jullie al complimenten krijgen — dat is altijd het mooiste om te horen. Mocht je in de toekomst nog iets nodig hebben, denk aan seizoensborden of raamfolie, laat het gerust weten.

Tot de volgende keer!

Met vriendelijke groet,
Sign Company`,
  },
  {
    id: 4,
    sender: 'Probo',
    initials: 'PB',
    avatarColor: 'bg-blush-vivid',
    subject: 'Orderbevestiging #4821',
    preview: 'Uw bestelling is bevestigd. Verwachte levertijd: 3-5 werkdagen...',
    time: 'gisteren',
    status: 'nieuw',
    unread: true,
    to: 'inkoop@signcompany.nl',
    date: 'Gisteren, 14:08',
    body: `Geachte klant,

Hierbij bevestigen wij uw bestelling #4821.

Orderoverzicht:
- 2x Dibond plaat 3mm wit (1500x1000mm) — €45,80
- 1x Vinyl print full color (2000x1200mm) — €38,50
- 1x Laminaat glans overlay — €12,00

Subtotaal: €96,30 excl. BTW
Verwachte levertijd: 3-5 werkdagen
Verzendmethode: DPD

U ontvangt een track & trace zodra uw bestelling is verzonden.

Met vriendelijke groet,
Probo — Uw printpartner`,
    aiReply: `Beste Probo,

Bedankt voor de orderbevestiging. De bestelling ziet er correct uit.

Kunnen jullie de levering op dinsdag of woensdag plannen? Dan is er iemand aanwezig om de materialen in ontvangst te nemen.

Met vriendelijke groet,
Sign Company`,
  },
  {
    id: 5,
    sender: 'Restaurant Het Anker',
    initials: 'HA',
    avatarColor: 'bg-peach-vivid',
    subject: 'Wijziging raambelettering',
    preview: 'We willen graag een aanpassing aan de raambelettering. De openingstijden...',
    time: '2 dagen',
    status: 'nieuw',
    unread: true,
    to: 'info@signcompany.nl',
    date: 'Ma 11 maart, 11:30',
    body: `Hallo,

We willen graag een aanpassing aan de raambelettering die jullie vorig jaar hebben aangebracht. Onze openingstijden zijn gewijzigd en die staan nog op de oude manier op het raam.

Nieuwe tijden:
- Ma t/m do: 11:00 - 22:00
- Vr en za: 11:00 - 23:00
- Zo: 12:00 - 21:00

Kunnen jullie ook meteen het terrasbordje vernieuwen? Het is een beetje verbleekt door de zon.

Groeten,
Familie Bakker
Restaurant Het Anker`,
    aiReply: `Hallo familie Bakker,

Geen probleem, we passen de openingstijden op de raambelettering aan. Ik zet het op de planning — we kunnen dit waarschijnlijk aankomende donderdag of vrijdag doen.

Voor het terrasbordje maak ik een aparte kleine offerte. We gebruiken dit keer UV-bestendig materiaal zodat het langer mooi blijft.

Ik neem morgen contact op met de exacte planning.

Met vriendelijke groet,
Sign Company`,
  },
];

/* ─── Sparkle icon ─── */
const Sparkle = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
  </svg>
);

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

/* ═══════════════════════════════════════
   EmailPageDemo — Live inbox simulator
   ═══════════════════════════════════════ */
export const EmailPageDemo: React.FC = () => {
  const [emails, setEmails] = useState<DemoEmail[]>(initialEmails);
  const [selectedId, setSelectedId] = useState(1);
  const [assignedTo, setAssignedTo] = useState<Record<number, string>>({});
  const [showAssignPicker, setShowAssignPicker] = useState(false);
  const [aiState, setAiState] = useState<'idle' | 'loading' | 'typing'>('idle');
  const [showReplyBox, setShowReplyBox] = useState(false);
  const assignRef = useRef<HTMLDivElement>(null);

  const selected = emails.find(e => e.id === selectedId)!;
  const aiReplyText = selected.aiReply;

  const { displayed: typedReply, done: typingDone } = useTypingEffect(
    aiReplyText,
    25,
    aiState === 'typing',
  );

  /* Mark email as read on select */
  const handleSelect = useCallback((id: number) => {
    setSelectedId(id);
    setAiState('idle');
    setShowReplyBox(false);
    setShowAssignPicker(false);
    setEmails(prev =>
      prev.map(e => (e.id === id ? { ...e, unread: false } : e)),
    );
  }, []);

  /* Change status */
  const handleStatusChange = useCallback((status: EmailStatus) => {
    setEmails(prev =>
      prev.map(e => (e.id === selectedId ? { ...e, status } : e)),
    );
  }, [selectedId]);

  /* Assign team member */
  const handleAssign = useCallback((initials: string) => {
    setAssignedTo(prev => ({ ...prev, [selectedId]: initials }));
    setShowAssignPicker(false);
  }, [selectedId]);

  /* AI reply */
  const handleAiReply = useCallback(() => {
    if (aiState !== 'idle') return;
    setShowReplyBox(true);
    setAiState('loading');
    setTimeout(() => {
      setAiState('typing');
    }, 1500);
  }, [aiState]);

  /* Close assign picker on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (assignRef.current && !assignRef.current.contains(e.target as Node)) {
        setShowAssignPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = emails.filter(e => e.unread).length;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-mist/30 overflow-hidden h-[580px] flex">
        {/* ─── Email List (left) ─── */}
        <div className="w-[40%] border-r border-gray-100 flex flex-col">
          {/* List header */}
          <div className="bg-gradient-to-r from-mist-light to-mist/20 px-4 py-3 border-b border-mist/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-mist-vivid to-mist-deep flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <span className="font-bold text-sm text-gray-900">Inbox</span>
            </div>
            {unreadCount > 0 && (
              <span className="bg-mist-vivid text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>

          {/* Email items */}
          <div className="flex-1 overflow-y-auto">
            {emails.map(email => {
              const sc = statusColors[email.status];
              const isSelected = email.id === selectedId;
              return (
                <button
                  key={email.id}
                  onClick={() => handleSelect(email.id)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 transition-colors ${
                    isSelected
                      ? 'bg-mist-light/50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full ${email.avatarColor} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white text-xs font-bold">{email.initials}</span>
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-sm truncate ${email.unread ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
                          {email.sender}
                        </span>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{email.time}</span>
                      </div>
                      <p className={`text-xs truncate mb-1 ${email.unread ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                        {email.subject}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-400 truncate pr-2">{email.preview}</p>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.dot}`} />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Detail Panel (right) ─── */}
        <div className="w-[60%] flex flex-col">
          {/* Email header */}
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-bold text-gray-900 text-base leading-tight">{selected.subject}</h3>
              {/* Status dropdown */}
              <select
                value={selected.status}
                onChange={e => handleStatusChange(e.target.value as EmailStatus)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer appearance-none ${statusColors[selected.status].bg} ${statusColors[selected.status].text}`}
                style={{ paddingRight: '1.5rem', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' fill='none' stroke='%236B7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.4rem center' }}
              >
                {statusOptions.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <div className={`w-5 h-5 rounded-full ${selected.avatarColor} flex items-center justify-center`}>
                  <span className="text-white text-[9px] font-bold">{selected.initials}</span>
                </div>
                <strong className="text-gray-600">{selected.sender}</strong>
              </span>
              <span>aan {selected.to}</span>
              <span className="ml-auto">{selected.date}</span>
            </div>
          </div>

          {/* Email body */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {selected.body}
            </div>

            {/* Reply box */}
            {showReplyBox && (
              <div className="mt-5 border border-mist/30 rounded-xl overflow-hidden">
                <div className="bg-mist-light/30 px-4 py-2 border-b border-mist/20 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-mist-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                  </svg>
                  <span className="text-xs font-semibold text-mist-deep">Antwoord aan {selected.sender}</span>
                </div>
                <div className="px-4 py-3 min-h-[120px] bg-white">
                  {aiState === 'loading' && (
                    <div className="flex items-center gap-2 text-mist-deep py-6 justify-center">
                      <Sparkle className="w-5 h-5 animate-spin" />
                      <span className="text-sm font-medium">AI schrijft...</span>
                    </div>
                  )}
                  {aiState === 'typing' && (
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                      {typedReply}
                      {!typingDone && <span className="inline-block w-0.5 h-4 bg-mist-vivid animate-pulse ml-0.5 align-middle" />}
                    </p>
                  )}
                  {aiState === 'idle' && showReplyBox && (
                    <p className="text-sm text-gray-300 italic">Typ je antwoord of gebruik AI Antwoord...</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action bar */}
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center gap-2 flex-wrap">
            {/* Assign button */}
            <div className="relative" ref={assignRef}>
              <button
                onClick={() => setShowAssignPicker(!showAssignPicker)}
                className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-600"
              >
                {assignedTo[selectedId] ? (
                  <span className={`w-5 h-5 rounded-full ${team.find(t => t.initials === assignedTo[selectedId])?.color || 'bg-gray-400'} flex items-center justify-center`}>
                    <span className="text-white text-[9px] font-bold">{assignedTo[selectedId]}</span>
                  </span>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                )}
                Toewijzen
              </button>
              {showAssignPicker && (
                <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-200 rounded-xl shadow-lg p-2 flex gap-1.5 z-20">
                  {team.map(t => (
                    <button
                      key={t.initials}
                      onClick={() => handleAssign(t.initials)}
                      className={`w-9 h-9 rounded-full ${t.color} flex items-center justify-center hover:scale-110 transition-transform ${
                        assignedTo[selectedId] === t.initials ? 'ring-2 ring-offset-2 ring-mist-vivid' : ''
                      }`}
                      title={t.name}
                    >
                      <span className="text-white text-xs font-bold">{t.initials}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* AI Reply button */}
            <button
              onClick={handleAiReply}
              disabled={aiState !== 'idle'}
              className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg bg-gradient-to-r from-mist-vivid to-mist-deep text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Sparkle className="w-4 h-4" />
              AI Antwoord
            </button>

            {/* Reply button */}
            <button
              onClick={() => { setShowReplyBox(true); setAiState('idle'); }}
              className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
              Beantwoorden
            </button>

            {/* Assigned badge */}
            {assignedTo[selectedId] && (
              <span className="ml-auto text-xs text-gray-400 flex items-center gap-1.5">
                Toegewezen aan
                <span className={`w-5 h-5 rounded-full ${team.find(t => t.initials === assignedTo[selectedId])?.color || 'bg-gray-400'} flex items-center justify-center`}>
                  <span className="text-white text-[9px] font-bold">{assignedTo[selectedId]}</span>
                </span>
                <strong className="text-gray-600">{team.find(t => t.initials === assignedTo[selectedId])?.name}</strong>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
