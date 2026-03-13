'use client';

import React from 'react';
import { FeaturePageTemplate } from '@/components/features/FeaturePageTemplate';
import { IntegratiesPageDemo } from '@/components/features/IntegratiesPageDemo';

export default function IntegratiesPage() {
  return (
    <FeaturePageTemplate
      colorKey="cream"
      badge="Integraties"
      headline={
        <>
          Verbonden met je{' '}
          <span className="text-gradient-forge">tools</span>
        </>
      }
      subtext="Exact Online, Probo, Mollie, Gmail, KVK — FORGEdesk praat met de software die je al gebruikt."
      heroVisual={
        <div className="relative">
          <div className="bg-gradient-to-br from-cream-light via-cream/20 to-white rounded-3xl p-8 border border-cream/20 shadow-2xl">
            {/* Mini integration network preview */}
            <svg viewBox="0 0 300 200" className="w-full" fill="none">
              {/* Center hub */}
              <circle cx="150" cy="100" r="24" fill="url(#heroGrad)" />
              <text x="150" y="97" textAnchor="middle" fill="white" fontSize="8" fontWeight="800" fontFamily="system-ui">FORGE</text>
              <text x="150" y="107" textAnchor="middle" fill="white" fontSize="6" fontWeight="600" fontFamily="system-ui" opacity="0.85">desk</text>

              {/* Animated pulse ring */}
              <circle cx="150" cy="100" r="24" fill="none" stroke="#C4B88A" strokeWidth="1" opacity="0.4">
                <animate attributeName="r" values="24;34;24" dur="3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0;0.4" dur="3s" repeatCount="indefinite" />
              </circle>

              {/* Integration nodes */}
              {[
                { x: 70, y: 45, color: '#3B82F6', label: 'Exact' },
                { x: 230, y: 45, color: '#059669', label: 'Probo' },
                { x: 265, y: 115, color: '#EA580C', label: 'Mollie' },
                { x: 230, y: 165, color: '#DC2626', label: 'Gmail' },
                { x: 70, y: 165, color: '#7C3AED', label: 'KVK' },
                { x: 35, y: 115, color: '#4F46E5', label: 'Stripe' },
              ].map((node, i) => (
                <g key={node.label}>
                  {/* Connecting line */}
                  <line x1="150" y1="100" x2={node.x} y2={node.y} stroke="#E2DFD3" strokeWidth="1" strokeDasharray="4 3">
                    <animate attributeName="stroke-dashoffset" values="0;-14" dur="1.5s" repeatCount="indefinite" />
                  </line>
                  {/* Particle */}
                  <circle r="2" fill={node.color} opacity="0.7">
                    <animateMotion dur={`${2 + i * 0.3}s`} repeatCount="indefinite" path={`M150,100 L${node.x},${node.y}`} />
                    <animate attributeName="opacity" values="0;0.8;0.8;0" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
                  </circle>
                  {/* Node */}
                  <circle cx={node.x} cy={node.y} r="14" fill="white" stroke={node.color} strokeWidth="1.5" />
                  <text x={node.x} y={node.y + 3} textAnchor="middle" fill={node.color} fontSize="6" fontWeight="700" fontFamily="system-ui">{node.label}</text>
                </g>
              ))}

              <defs>
                <linearGradient id="heroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#C4B88A" />
                  <stop offset="100%" stopColor="#9A8E6E" />
                </linearGradient>
              </defs>
            </svg>

            {/* Status badges */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[
                { label: 'Integraties', value: '6', color: 'text-cream-deep' },
                { label: 'Syncs vandaag', value: '142', color: 'text-sage-deep' },
                { label: 'Uptime', value: '99.9%', color: 'text-mist-deep' },
              ].map((m) => (
                <div key={m.label} className="bg-white/80 rounded-lg p-2.5 text-center border border-gray-100">
                  <p className="text-[10px] text-gray-400 uppercase">{m.label}</p>
                  <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Floating badges */}
          <div className="absolute -top-3 -right-3 bg-white rounded-xl shadow-lg px-3 py-2 border border-cream/20 animate-float">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sage-vivid" />
              <span className="text-xs font-medium text-gray-700">Exact Online gesynchroniseerd</span>
            </div>
          </div>
          <div className="absolute -bottom-3 -left-3 bg-white rounded-xl shadow-lg px-3 py-2 border border-cream/20 animate-float-slow">
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-cream-vivid" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.04a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.757 8.81" />
              </svg>
              <span className="text-xs font-medium text-gray-700">6 integraties actief</span>
            </div>
          </div>
        </div>
      }
      demo={<IntegratiesPageDemo />}
      demoLabel="Alles verbonden"
      features={[
        {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.04a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.757 8.81" />
            </svg>
          ),
          title: 'Plug & Play',
          description: 'Verbind in minuten, geen technische kennis nodig',
        },
        {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
          ),
          title: 'Real-time Sync',
          description: 'Data stroomt automatisch tussen je tools',
        },
        {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          ),
          title: 'Veilig',
          description: 'OAuth 2.0 autorisatie, geen wachtwoorden delen',
        },
        {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
          ),
          title: 'Nederlands',
          description: 'Gebouwd voor Nederlandse bedrijven en wetgeving',
        },
      ]}
      useCases={[
        {
          title: 'Factuur goedgekeurd? Automatisch naar Exact Online',
          description:
            'Zodra je een factuur goedkeurt in FORGEdesk, wordt deze automatisch gesynchroniseerd met Exact Online. Grootboekrekeningen, BTW-codes en klantgegevens worden meegekoppeld. Geen dubbel werk meer.',
        },
        {
          title: 'Offerte maken met live Probo-prijzen',
          description:
            'Selecteer een product uit de Probo catalogus en de actuele prijs wordt direct in je offerte gezet. Inclusief rush-tarieven en staffelkortingen — altijd up-to-date, zonder handmatig opzoeken.',
        },
        {
          title: 'Betaallink op de factuur, betaling automatisch verwerkt',
          description:
            'Stuur een factuur met een Mollie-betaallink. Je klant betaalt via iDEAL, creditcard of Bancontact. FORGEdesk verwerkt de betaling automatisch en markeert de factuur als betaald.',
        },
      ]}
    />
  );
}
