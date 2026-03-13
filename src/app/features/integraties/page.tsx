'use client';

import React, { useState } from 'react';
import { FeaturePageTemplate } from '@/components/FeaturePageTemplate';

/* ─── Integration Map ─── */
const IntegrationMap: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('alle');
  const [connected, setConnected] = useState<string[]>(['exact', 'mollie']);

  const integrations = [
    { id: 'exact', name: 'Exact Online', category: 'boekhouding', desc: 'Synchroniseer facturen en boekingen automatisch.', icon: '📊' },
    { id: 'mollie', name: 'Mollie', category: 'betalen', desc: 'Online betalingen accepteren via iDEAL, creditcard en meer.', icon: '💳' },
    { id: 'twinfield', name: 'Twinfield', category: 'boekhouding', desc: 'Koppel je boekhouding naadloos met Twinfield.', icon: '📒' },
    { id: 'gmail', name: 'Gmail', category: 'email', desc: 'Synchroniseer je Gmail inbox met FORGEdesk.', icon: '✉️' },
    { id: 'outlook', name: 'Outlook', category: 'email', desc: 'Koppel je Outlook 365 account voor e-mail en agenda.', icon: '📧' },
    { id: 'google-cal', name: 'Google Agenda', category: 'planning', desc: 'Sync je FORGEdesk planning met Google Agenda.', icon: '📅' },
    { id: 'stripe', name: 'Stripe', category: 'betalen', desc: 'Internationale betalingen en abonnementen via Stripe.', icon: '💰' },
    { id: 'zapier', name: 'Zapier', category: 'automatisering', desc: 'Verbind FORGEdesk met 5000+ apps via Zapier.', icon: '⚡' },
    { id: 'webhook', name: 'Webhooks', category: 'automatisering', desc: 'Stuur real-time notificaties naar je eigen systemen.', icon: '🔗' },
  ];

  const categories = ['alle', 'boekhouding', 'betalen', 'email', 'planning', 'automatisering'];

  const filtered = activeCategory === 'alle'
    ? integrations
    : integrations.filter(i => i.category === activeCategory);

  const toggleConnect = (id: string) => {
    setConnected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-sage/30 overflow-hidden">
      {/* Header */}
      <div className="bg-sage-light/30 px-6 py-4 border-b border-sage/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-gray-900 text-sm">Integraties</p>
            <p className="text-xs text-gray-400">{connected.length} van {integrations.length} verbonden</p>
          </div>
          <span className="pastel-pill bg-sage-light text-sage-deep border border-sage/30">
            {connected.length} actief
          </span>
        </div>
      </div>

      {/* Category filter */}
      <div className="px-6 py-3 border-b border-gray-100 flex gap-2 overflow-x-auto">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${
              activeCategory === cat
                ? 'bg-sage text-sage-deep'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Integration grid */}
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(integration => {
          const isConnected = connected.includes(integration.id);
          return (
            <div
              key={integration.id}
              className={`p-4 rounded-xl border transition-all ${
                isConnected
                  ? 'border-sage bg-sage-light/20'
                  : 'border-gray-100 hover:border-sage/30'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{integration.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{integration.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{integration.category}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-3">{integration.desc}</p>
              <button
                onClick={() => toggleConnect(integration.id)}
                className={`w-full text-xs font-semibold py-2 rounded-lg transition-all ${
                  isConnected
                    ? 'bg-sage text-sage-deep hover:bg-sage-light'
                    : 'bg-gray-100 text-gray-500 hover:bg-sage-light hover:text-sage-deep'
                }`}
              >
                {isConnected ? '✓ Verbonden' : 'Verbinden'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Connected status bar */}
      <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400">Actief:</span>
          {connected.map(id => {
            const int = integrations.find(i => i.id === id);
            return int ? (
              <span key={id} className="pastel-pill bg-sage-light text-sage-deep text-xs">
                {int.icon} {int.name}
              </span>
            ) : null;
          })}
        </div>
      </div>
    </div>
  );
};

const puzzleIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.421 48.421 0 01-4.185-.232c-.04-.003-.08-.006-.12-.01l-.206-.019a1.923 1.923 0 01-1.782-1.918V4.5A2.25 2.25 0 016.5 2.25h11.25A2.25 2.25 0 0120 4.5v2.003a1.924 1.924 0 01-1.783 1.918l-.205.02c-.04.003-.081.006-.12.01a48.493 48.493 0 01-4.185.23.64.64 0 01-.657-.642v0zm-3 0v0a.64.64 0 00-.657.643 48.39 48.39 0 01-4.185-.232c-.04-.003-.08-.006-.12-.01l-.206-.019A1.923 1.923 0 014.3 4.57V4.5A2.25 2.25 0 016.5 2.25h11.25" />
  </svg>
);

const boltIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
  </svg>
);

const shieldIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);

export default function IntegratiesFeaturePage() {
  return (
    <FeaturePageTemplate
      color="sage"
      badge="Integraties"
      title="Verbind FORGEdesk met je"
      titleHighlight="favoriete tools"
      subtitle="Koppel je boekhouding, betaalprovider, e-mail en agenda. FORGEdesk werkt naadloos samen met de tools die je al gebruikt."
      highlights={[
        {
          icon: puzzleIcon,
          title: 'Plug & Play',
          description: 'Verbind in een paar klikken. Geen technische kennis nodig. Wij regelen de synchronisatie.',
        },
        {
          icon: boltIcon,
          title: 'Real-time Sync',
          description: 'Wijzigingen worden direct gesynchroniseerd. Je boekhouding is altijd up-to-date.',
        },
        {
          icon: shieldIcon,
          title: 'Veilig & Betrouwbaar',
          description: 'Alle koppelingen verlopen via beveiligde API\'s. Jouw data blijft altijd van jou.',
        },
      ]}
      demo={<IntegrationMap />}
      demoTitle="Ontdek de integraties"
      demoSubtitle="Filter op categorie en verbind je favoriete tools. Klik op 'Verbinden' om te zien hoe het werkt."
    />
  );
}
