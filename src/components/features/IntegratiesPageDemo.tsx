'use client';

import React, { useState } from 'react';

/* ─── Integration Data ─── */
interface Integration {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  glowColor: string;
  bgColor: string;
  borderColor: string;
  description: string;
  bullets: string[];
  flowAction: string;
  flowResult: string;
}

const integrations: Integration[] = [
  {
    id: 'exact',
    name: 'Exact Online',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
    color: 'text-blue-600',
    glowColor: 'shadow-blue-200',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Facturen automatisch syncen naar je boekhouding',
    bullets: [
      'Automatische factuur sync',
      'Grootboekrekeningen koppelen',
      'BTW-aangifte voorbereid',
    ],
    flowAction: 'Factuur sync',
    flowResult: 'Boekhouding bijgewerkt',
  },
  {
    id: 'probo',
    name: 'Probo',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
    color: 'text-emerald-600',
    glowColor: 'shadow-emerald-200',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    description: 'Live productprijzen uit de Probo catalogus',
    bullets: [
      'Real-time prijzen ophalen',
      'Direct in offerte plaatsen',
      'Rush-tarieven berekend',
    ],
    flowAction: 'Prijs ophalen',
    flowResult: 'Offerte bijgewerkt',
  },
  {
    id: 'mollie',
    name: 'Mollie',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
    color: 'text-orange-600',
    glowColor: 'shadow-orange-200',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    description: 'Online betaallinks op je facturen',
    bullets: [
      'iDEAL / creditcard / Bancontact',
      'Automatische status update',
      'QR code op factuur',
    ],
    flowAction: 'Betaallink maken',
    flowResult: 'Betaling ontvangen',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
    color: 'text-red-600',
    glowColor: 'shadow-red-200',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    description: 'Email synchronisatie + verzenden',
    bullets: [
      'IMAP inbox sync',
      'Versturen vanuit FORGEdesk',
      'Bijlagen beheer',
    ],
    flowAction: 'Email sync',
    flowResult: 'Inbox bijgewerkt',
  },
  {
    id: 'kvk',
    name: 'KVK',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5M3.75 3v18m16.5-18v18M5.25 3h13.5M5.25 21h13.5M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
      </svg>
    ),
    color: 'text-purple-600',
    glowColor: 'shadow-purple-200',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    description: 'Bedrijfsgegevens automatisch ophalen',
    bullets: [
      'Zoeken op naam of nummer',
      'Auto-fill klantgegevens',
      'Altijd actuele data',
    ],
    flowAction: 'KVK opzoeken',
    flowResult: 'Klant aangemaakt',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    color: 'text-indigo-600',
    glowColor: 'shadow-indigo-200',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    description: 'Abonnementsbeheer',
    bullets: [
      'Maandelijks abonnement',
      'Credits kopen',
      'Klantportaal',
    ],
    flowAction: 'Betaling verwerken',
    flowResult: 'Abonnement actief',
  },
];

/* ─── Node positions (circle layout) ─── */
const NODE_RADIUS = 190; // Distance from center
const CENTER_X = 250;
const CENTER_Y = 220;
const NODE_SIZE = 56;

function getNodePosition(index: number, total: number) {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  return {
    x: CENTER_X + NODE_RADIUS * Math.cos(angle),
    y: CENTER_Y + NODE_RADIUS * Math.sin(angle),
  };
}

/* ─── CSS Keyframes (injected once) ─── */
const AnimationStyles = () => (
  <style>{`
    @keyframes dash-flow {
      to { stroke-dashoffset: -20; }
    }
    @keyframes particle-out {
      0% { offset-distance: 0%; opacity: 0; }
      10% { opacity: 1; }
      90% { opacity: 1; }
      100% { offset-distance: 100%; opacity: 0; }
    }
    @keyframes particle-in {
      0% { offset-distance: 100%; opacity: 0; }
      10% { opacity: 1; }
      90% { opacity: 1; }
      100% { offset-distance: 0%; opacity: 0; }
    }
    @keyframes pulse-glow {
      0%, 100% { filter: drop-shadow(0 0 4px currentColor); }
      50% { filter: drop-shadow(0 0 12px currentColor); }
    }
    @keyframes flow-arrow {
      0% { transform: translateX(-4px); opacity: 0.4; }
      50% { transform: translateX(4px); opacity: 1; }
      100% { transform: translateX(-4px); opacity: 0.4; }
    }
    @keyframes float-particle {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-3px) scale(1.2); }
    }
    .integration-node {
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    .integration-node:hover {
      transform: scale(1.12);
    }
    .dash-animated {
      animation: dash-flow 0.8s linear infinite;
    }
    .particle {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      position: absolute;
      animation: float-particle 1.5s ease-in-out infinite;
    }
  `}</style>
);

/* ─── Detail Card ─── */
const DetailCard: React.FC<{ integration: Integration }> = ({ integration }) => (
  <div className={`mt-8 bg-white rounded-2xl border ${integration.borderColor} shadow-lg p-6 max-w-2xl mx-auto animate-[fadeIn_0.3s_ease]`}>
    <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-10 h-10 rounded-xl ${integration.bgColor} flex items-center justify-center ${integration.color}`}>
        {integration.icon}
      </div>
      <div>
        <h3 className="font-bold text-gray-900">{integration.name}</h3>
        <p className="text-sm text-gray-500">{integration.description}</p>
      </div>
    </div>

    {/* Bullet points */}
    <ul className="space-y-2 mb-5">
      {integration.bullets.map((b) => (
        <li key={b} className="flex items-center gap-2 text-sm text-gray-700">
          <svg className={`w-4 h-4 flex-shrink-0 ${integration.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          {b}
        </li>
      ))}
    </ul>

    {/* Flow Diagram */}
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-3">Dataflow</p>
      <div className="flex items-center justify-center gap-3">
        <div className="bg-cream-light border border-cream/40 rounded-lg px-3 py-2 text-xs font-semibold text-cream-deep">
          FORGEdesk
        </div>
        <div className="flex items-center gap-1">
          <div className="w-8 h-px bg-gray-300" />
          <svg className="w-4 h-4 text-gray-400" style={{ animation: 'flow-arrow 1.5s ease-in-out infinite' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
          <div className="w-8 h-px bg-gray-300" />
        </div>
        <div className={`${integration.bgColor} border ${integration.borderColor} rounded-lg px-3 py-2 text-xs font-semibold ${integration.color}`}>
          {integration.flowAction}
        </div>
        <div className="flex items-center gap-1">
          <div className="w-8 h-px bg-gray-300" />
          <svg className="w-4 h-4 text-gray-400" style={{ animation: 'flow-arrow 1.5s ease-in-out infinite 0.3s' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
          <div className="w-8 h-px bg-gray-300" />
        </div>
        <div className="bg-sage-light border border-sage/30 rounded-lg px-3 py-2 text-xs font-semibold text-sage-deep">
          {integration.flowResult}
        </div>
      </div>
    </div>

    {/* Link */}
    <a
      href="#"
      className={`inline-flex items-center gap-1 text-sm font-semibold mt-4 ${integration.color} hover:underline`}
    >
      Meer info
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
      </svg>
    </a>
  </div>
);

/* ═══════════════════════════════════════
   Main Component: Integration Map
   ═══════════════════════════════════════ */
export const IntegratiesPageDemo: React.FC = () => {
  const [selected, setSelected] = useState<string | null>(null);

  const selectedIntegration = integrations.find((i) => i.id === selected);
  const viewBoxWidth = 500;
  const viewBoxHeight = 440;

  return (
    <div className="max-w-3xl mx-auto">
      <AnimationStyles />

      {/* Integration Map */}
      <div className="relative bg-white rounded-2xl shadow-xl border border-cream/30 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-cream-light to-cream/30 px-5 py-4 flex items-center gap-3 border-b border-cream/20">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cream-vivid to-cream-deep flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.04a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.757 8.81" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">Integratie Netwerk</p>
            <p className="text-xs text-cream-deep">Klik op een integratie voor details</p>
          </div>
          <div className="ml-auto">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-cream-deep bg-cream/40 px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-sage-vivid rounded-full animate-pulse" />
              6 verbonden
            </span>
          </div>
        </div>

        {/* SVG Map */}
        <div className="p-4 md:p-6">
          <svg
            viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
            className="w-full max-w-lg mx-auto"
            style={{ overflow: 'visible' }}
          >
            {/* Connecting lines */}
            {integrations.map((integ, i) => {
              const pos = getNodePosition(i, integrations.length);
              const isSelected = selected === integ.id;
              return (
                <g key={`line-${integ.id}`}>
                  {/* Dashed animated line */}
                  <line
                    x1={CENTER_X}
                    y1={CENTER_Y}
                    x2={pos.x}
                    y2={pos.y}
                    stroke={isSelected ? '#9A8E6E' : '#E2DFD3'}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    strokeDasharray="6 4"
                    className="dash-animated"
                    style={{ transition: 'stroke 0.3s, stroke-width 0.3s' }}
                  />
                  {/* Particle outgoing */}
                  <circle r="3" fill={isSelected ? '#C4B88A' : '#C4B88A'} opacity={0.8}>
                    <animateMotion
                      dur={`${2.5 + i * 0.3}s`}
                      repeatCount="indefinite"
                      path={`M${CENTER_X},${CENTER_Y} L${pos.x},${pos.y}`}
                    />
                    <animate attributeName="opacity" values="0;1;1;0" dur={`${2.5 + i * 0.3}s`} repeatCount="indefinite" />
                  </circle>
                  {/* Particle incoming (offset timing) */}
                  <circle r="2.5" fill={isSelected ? '#9A8E6E' : '#9A8E6E'} opacity={0.6}>
                    <animateMotion
                      dur={`${3 + i * 0.2}s`}
                      repeatCount="indefinite"
                      path={`M${pos.x},${pos.y} L${CENTER_X},${CENTER_Y}`}
                    />
                    <animate attributeName="opacity" values="0;0.8;0.8;0" dur={`${3 + i * 0.2}s`} repeatCount="indefinite" />
                  </circle>
                </g>
              );
            })}

            {/* Center node - FORGEdesk */}
            <g>
              <circle
                cx={CENTER_X}
                cy={CENTER_Y}
                r={38}
                fill="url(#centerGrad)"
                stroke="#9A8E6E"
                strokeWidth="2"
                style={{ filter: 'drop-shadow(0 4px 12px rgba(154, 142, 110, 0.3))' }}
              />
              <text
                x={CENTER_X}
                y={CENTER_Y - 6}
                textAnchor="middle"
                fill="white"
                fontSize="11"
                fontWeight="800"
                fontFamily="system-ui, sans-serif"
              >
                FORGE
              </text>
              <text
                x={CENTER_X}
                y={CENTER_Y + 8}
                textAnchor="middle"
                fill="white"
                fontSize="9"
                fontWeight="600"
                fontFamily="system-ui, sans-serif"
                opacity="0.85"
              >
                desk
              </text>
              {/* Pulse ring */}
              <circle
                cx={CENTER_X}
                cy={CENTER_Y}
                r={38}
                fill="none"
                stroke="#C4B88A"
                strokeWidth="1"
                opacity="0.5"
              >
                <animate attributeName="r" values="38;50;38" dur="3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0;0.5" dur="3s" repeatCount="indefinite" />
              </circle>
            </g>

            {/* Integration nodes */}
            {integrations.map((integ, i) => {
              const pos = getNodePosition(i, integrations.length);
              const isSelected = selected === integ.id;
              const nodeColors: Record<string, { fill: string; stroke: string; text: string }> = {
                exact: { fill: '#EFF6FF', stroke: '#BFDBFE', text: '#2563EB' },
                probo: { fill: '#ECFDF5', stroke: '#A7F3D0', text: '#059669' },
                mollie: { fill: '#FFF7ED', stroke: '#FED7AA', text: '#EA580C' },
                gmail: { fill: '#FEF2F2', stroke: '#FECACA', text: '#DC2626' },
                kvk: { fill: '#FAF5FF', stroke: '#DDD6FE', text: '#7C3AED' },
                stripe: { fill: '#EEF2FF', stroke: '#C7D2FE', text: '#4F46E5' },
              };
              const nc = nodeColors[integ.id];
              return (
                <g
                  key={integ.id}
                  className="cursor-pointer integration-node"
                  style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
                  onClick={() => setSelected(selected === integ.id ? null : integ.id)}
                >
                  {/* Glow when selected */}
                  {isSelected && (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={NODE_SIZE / 2 + 6}
                      fill="none"
                      stroke={nc.text}
                      strokeWidth="2"
                      opacity="0.3"
                    >
                      <animate attributeName="r" values={`${NODE_SIZE / 2 + 4};${NODE_SIZE / 2 + 10};${NODE_SIZE / 2 + 4}`} dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  {/* Node circle */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={NODE_SIZE / 2}
                    fill={nc.fill}
                    stroke={isSelected ? nc.text : nc.stroke}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    style={{
                      filter: isSelected
                        ? `drop-shadow(0 4px 12px ${nc.text}40)`
                        : 'drop-shadow(0 2px 4px rgba(0,0,0,0.06))',
                      transition: 'filter 0.3s, stroke 0.3s, stroke-width 0.3s',
                    }}
                  />
                  {/* Icon placeholder (using first letter) */}
                  <foreignObject
                    x={pos.x - 12}
                    y={pos.y - 16}
                    width={24}
                    height={24}
                    className="pointer-events-none"
                  >
                    <div className={`w-6 h-6 flex items-center justify-center`} style={{ color: nc.text }}>
                      {integ.icon}
                    </div>
                  </foreignObject>
                  {/* Label */}
                  <text
                    x={pos.x}
                    y={pos.y + 16}
                    textAnchor="middle"
                    fill={isSelected ? nc.text : '#64748B'}
                    fontSize="8.5"
                    fontWeight={isSelected ? '700' : '600'}
                    fontFamily="system-ui, sans-serif"
                    style={{ transition: 'fill 0.3s' }}
                  >
                    {integ.name}
                  </text>
                </g>
              );
            })}

            {/* Gradient definition */}
            <defs>
              <linearGradient id="centerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#C4B88A" />
                <stop offset="100%" stopColor="#9A8E6E" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Hint */}
        {!selected && (
          <p className="text-center text-xs text-gray-400 pb-4 -mt-2">
            Klik op een integratie om de details te bekijken
          </p>
        )}
      </div>

      {/* Detail Card (below the map) */}
      {selectedIntegration && <DetailCard integration={selectedIntegration} />}
    </div>
  );
};
