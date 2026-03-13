'use client';

import React from 'react';
import { FeaturePageTemplate } from '@/components/features/FeaturePageTemplate';
import { EmailPageDemo } from '@/components/features/EmailPageDemo';

export default function EmailFeaturesPage() {
  return (
    <FeaturePageTemplate
      colorKey="mist"
      badge="Email & Communicatie"
      headline={
        <>
          Eén inbox voor je hele{' '}
          <span className="text-gradient-forge">team</span>
        </>
      }
      subtext="Verbind je Gmail, wijs emails toe aan collega's, en laat AI je antwoorden schrijven. Nooit meer zoeken in je mailbox."
      heroVisual={
        <div className="relative">
          <div className="bg-gradient-to-br from-mist-light via-mist/20 to-white rounded-3xl p-8 border border-mist/20 shadow-2xl">
            <div className="space-y-3">
              {/* Email preview cards */}
              {[
                { sender: 'Mark Jansen', subject: 'Re: Offerte lichtreclame', time: '10:23', color: 'bg-mist-vivid', initials: 'MJ', unread: true },
                { sender: 'Lisa de Vries', subject: 'Vraag over montage datum', time: '09:15', color: 'bg-lavender-vivid', initials: 'LV', unread: false },
                { sender: 'Garage De Wit', subject: 'Factuur ontvangen, dank!', time: 'gisteren', color: 'bg-sage-vivid', initials: 'GW', unread: false },
              ].map((email, i) => (
                <div
                  key={email.sender}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    i === 0
                      ? 'bg-mist-light/60 border border-mist/30 shadow-sm'
                      : 'bg-white/80 border border-gray-100'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full ${email.color} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white text-[10px] font-bold">{email.initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs truncate ${email.unread ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
                      {email.sender}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate">{email.subject}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">{email.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Floating notification badges */}
          <div className="absolute -top-3 -right-3 bg-white rounded-xl shadow-lg px-3 py-2 border border-mist/20 animate-float">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs font-medium text-gray-700">3 nieuw</span>
            </div>
          </div>
          <div className="absolute -bottom-3 -left-3 bg-white rounded-xl shadow-lg px-3 py-2 border border-mist/20 animate-float-slow">
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-mist-vivid" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <span className="text-xs font-medium text-gray-700">AI-antwoord klaar</span>
            </div>
          </div>
          <div className="absolute top-1/2 -right-5 bg-white rounded-xl shadow-lg px-3 py-2 border border-mist/20 animate-float">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-400" />
              <span className="text-xs font-medium text-gray-700">2 in behandeling</span>
            </div>
          </div>
        </div>
      }
      demo={<EmailPageDemo />}
      demoLabel="Je gedeelde inbox"
      features={[
        {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          ),
          title: 'Gedeelde Inbox',
          description: 'Alle teamcommunicatie op één plek. Verbind je Gmail of Outlook en beheer alle emails centraal.',
        },
        {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          ),
          title: 'AI Antwoorden',
          description: 'Laat AI je emails schrijven in de juiste toon. Van formeel tot informeel — altijd professioneel.',
        },
        {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
            </svg>
          ),
          title: 'Email Sequences',
          description: 'Automatische follow-up reeksen instellen. Nooit meer vergeten om een herinnering te sturen.',
        },
        {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
          title: 'Tracking',
          description: 'Zie wanneer je email geopend wordt. Weet precies wanneer je klant je offerte heeft bekeken.',
        },
      ]}
      useCases={[
        {
          title: 'Klant stuurt een vraag over montage',
          description: 'De email komt binnen in de gedeelde inbox. Je wijst hem toe aan de juiste monteur, die direct kan antwoorden. De klant krijgt snel een professioneel antwoord — zonder dat iemand hoeft te zoeken in zijn eigen mailbox.',
        },
        {
          title: 'Follow-up na verzonden offerte',
          description: 'Je stuurt een offerte en stelt een automatische follow-up in na 3 dagen. Als de klant de offerte opent maar niet reageert, krijg je een notificatie. Zo mis je nooit meer een kans.',
        },
        {
          title: 'Snel professioneel reageren met AI',
          description: 'Een leverancier stuurt een orderbevestiging. Met één klik schrijft AI een passend antwoord in de juiste toon. Je hoeft alleen nog te controleren en te verzenden — scheelt je minuten per email.',
        },
      ]}
    />
  );
}
