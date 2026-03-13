'use client';

import React, { useState } from 'react';
import { FeaturePageTemplate } from '@/components/FeaturePageTemplate';

/* ─── Klantportaal Simulator ─── */
const PortalSimulator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overzicht' | 'offertes' | 'projecten'>('overzicht');
  const [comments, setComments] = useState([
    { id: 1, author: 'Jan Jansen', text: 'Kunnen de letters iets groter?', time: '2 uur geleden', avatar: 'JJ' },
    { id: 2, author: 'FORGEdesk', text: 'Ja, we passen het ontwerp aan. Nieuwe versie komt morgen.', time: '1 uur geleden', avatar: 'FD' },
  ]);
  const [newComment, setNewComment] = useState('');

  const addComment = () => {
    if (!newComment.trim()) return;
    setComments(prev => [...prev, {
      id: Date.now(),
      author: 'Jan Jansen',
      text: newComment.trim(),
      time: 'Zojuist',
      avatar: 'JJ',
    }]);
    setNewComment('');
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-mist/30 overflow-hidden">
      {/* Portal Header */}
      <div className="bg-gradient-to-r from-mist-light to-mist-light/50 px-6 py-4 border-b border-mist/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-mist flex items-center justify-center text-mist-deep font-bold text-sm">
              JJ
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Bakkerij Jansen</p>
              <p className="text-xs text-mist-deep">Klantportaal</p>
            </div>
          </div>
          <span className="pastel-pill bg-mist-light text-mist-deep border border-mist/30">
            3 actieve projecten
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {[
          { key: 'overzicht' as const, label: 'Overzicht' },
          { key: 'offertes' as const, label: 'Offertes' },
          { key: 'projecten' as const, label: 'Projecten' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'text-mist-deep border-b-2 border-mist-deep'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {activeTab === 'overzicht' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-mist-light/40 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">3</p>
                <p className="text-xs text-mist-deep">Projecten</p>
              </div>
              <div className="bg-lavender-light/40 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">2</p>
                <p className="text-xs text-lavender-deep">Offertes</p>
              </div>
              <div className="bg-sage-light/40 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">1</p>
                <p className="text-xs text-sage-deep">Afgerond</p>
              </div>
            </div>

            {/* Comment pins */}
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-3">Berichten</p>
              <div className="space-y-3">
                {comments.map(c => (
                  <div key={c.id} className="flex gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      c.avatar === 'FD' ? 'bg-sage-light text-sage-deep' : 'bg-mist-light text-mist-deep'
                    }`}>
                      {c.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-gray-900">{c.author}</span>
                        <span className="text-xs text-gray-400">{c.time}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addComment()}
                  placeholder="Schrijf een bericht..."
                  className="flex-1 bg-gray-50 rounded-xl px-4 py-2.5 text-sm border border-gray-100 focus:outline-none focus:ring-2 focus:ring-mist/50"
                />
                <button
                  onClick={addComment}
                  className="bg-mist-deep hover:bg-mist-vivid text-white px-4 py-2.5 rounded-xl transition-colors text-sm font-medium"
                >
                  Verstuur
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'offertes' && (
          <div className="space-y-3">
            {[
              { nr: 'OFF-2026-089', titel: 'LED Lichtreclame', bedrag: '€2.450', status: 'Verstuurd', statusColor: 'bg-mist-light text-mist-deep' },
              { nr: 'OFF-2026-076', titel: 'Gevelreclame + montage', bedrag: '€4.800', status: 'Goedgekeurd', statusColor: 'bg-sage-light text-sage-deep' },
            ].map(o => (
              <div key={o.nr} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-mist/30 transition-colors">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{o.titel}</p>
                  <p className="text-xs text-gray-400">{o.nr}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900">{o.bedrag}</span>
                  <span className={`pastel-pill ${o.statusColor}`}>{o.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'projecten' && (
          <div className="space-y-3">
            {[
              { naam: 'LED Lichtreclame', voortgang: 65, fase: 'Productie', color: 'bg-mist' },
              { naam: 'Gevelletters kantoor', voortgang: 100, fase: 'Opgeleverd', color: 'bg-sage' },
              { naam: 'Wrapping bedrijfsbus', voortgang: 20, fase: 'Ontwerp', color: 'bg-lavender' },
            ].map(p => (
              <div key={p.naam} className="p-4 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-gray-900 text-sm">{p.naam}</p>
                  <span className="text-xs text-gray-400">{p.fase}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${p.color} transition-all duration-500`}
                    style={{ width: `${p.voortgang}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">{p.voortgang}% voltooid</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const usersIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

const chatIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
  </svg>
);

const eyeIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export default function KlantportaalFeaturePage() {
  return (
    <FeaturePageTemplate
      color="mist"
      badge="Klantportaal"
      title="Jouw klanten, altijd"
      titleHighlight="op de hoogte"
      subtitle="Geef klanten een eigen portaal waar ze offertes bekijken, projectvoortgang volgen en berichten sturen. Professioneel en transparant."
      highlights={[
        {
          icon: usersIcon,
          title: 'Eigen Klantomgeving',
          description: 'Elke klant krijgt een eigen portaal met login. Geen losse e-mails meer, alles op één plek.',
        },
        {
          icon: chatIcon,
          title: 'Berichten & Feedback',
          description: 'Klanten kunnen direct reageren op offertes en ontwerpen. Alle communicatie in één thread.',
        },
        {
          icon: eyeIcon,
          title: 'Live Projectvoortgang',
          description: 'Klanten zien real-time hoe hun project vordert. Van ontwerp tot montage — altijd transparant.',
        },
      ]}
      demo={<PortalSimulator />}
      demoTitle="Bekijk het klantportaal"
      demoSubtitle="Zo ziet jouw klant het portaal. Navigeer tussen tabs en stuur een bericht."
    />
  );
}
