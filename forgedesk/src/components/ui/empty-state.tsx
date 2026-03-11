import React from 'react'
import { cn } from '@/lib/utils'

type EmptyStateModule = 'projecten' | 'offertes' | 'facturen' | 'klanten' | 'werkbonnen' | 'planning' | 'taken' | 'default'

const MODULE_COLORS: Record<EmptyStateModule, string> = {
  projecten: '#7EB5A6',
  offertes: '#9B8EC4',
  facturen: '#E8866A',
  klanten: '#8BAFD4',
  werkbonnen: '#D4836A',
  planning: '#7EB5A6',
  taken: '#C4A882',
  default: '#8a8680',
}

function ProjectenIllustration({ color }: { color: string }) {
  return (
    <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Blueprint/bouwtekening */}
      <rect x="30" y="35" width="100" height="90" rx="8" stroke={color} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.3" />
      <rect x="42" y="50" width="76" height="60" rx="4" stroke={color} strokeWidth="1.5" opacity="0.5" />
      {/* Grid lijnen */}
      <line x1="42" y1="70" x2="118" y2="70" stroke={color} strokeWidth="0.75" opacity="0.2" />
      <line x1="42" y1="90" x2="118" y2="90" stroke={color} strokeWidth="0.75" opacity="0.2" />
      <line x1="70" y1="50" x2="70" y2="110" stroke={color} strokeWidth="0.75" opacity="0.2" />
      <line x1="95" y1="50" x2="95" y2="110" stroke={color} strokeWidth="0.75" opacity="0.2" />
      {/* Potlood */}
      <line x1="105" y1="42" x2="120" y2="27" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <circle cx="105" cy="42" r="2" fill={color} opacity="0.4" />
    </svg>
  )
}

function OffertesIllustration({ color }: { color: string }) {
  return (
    <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Document */}
      <rect x="40" y="28" width="70" height="95" rx="6" stroke={color} strokeWidth="1.5" opacity="0.4" />
      <rect x="48" y="28" width="62" height="95" rx="6" fill={color} fillOpacity="0.06" stroke={color} strokeWidth="1.5" opacity="0.5" />
      {/* Lijnen op document */}
      <line x1="58" y1="50" x2="100" y2="50" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      <line x1="58" y1="62" x2="95" y2="62" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.25" />
      <line x1="58" y1="74" x2="88" y2="74" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
      {/* Euro teken */}
      <circle cx="80" cy="98" r="12" stroke={color} strokeWidth="1.5" opacity="0.35" />
      <text x="75" y="103" fill={color} opacity="0.5" fontSize="14" fontWeight="700">€</text>
      {/* Pen */}
      <line x1="112" y1="70" x2="125" y2="55" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <line x1="125" y1="55" x2="128" y2="52" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  )
}

function FacturenIllustration({ color }: { color: string }) {
  return (
    <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Factuur document */}
      <rect x="42" y="30" width="68" height="92" rx="6" fill={color} fillOpacity="0.06" stroke={color} strokeWidth="1.5" opacity="0.5" />
      {/* Header */}
      <rect x="50" y="40" width="52" height="8" rx="2" fill={color} opacity="0.15" />
      {/* Lijnen */}
      <line x1="50" y1="58" x2="102" y2="58" stroke={color} strokeWidth="1" opacity="0.2" />
      <line x1="50" y1="68" x2="95" y2="68" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.2" />
      <line x1="50" y1="78" x2="90" y2="78" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.2" />
      {/* Totaal lijn */}
      <line x1="50" y1="95" x2="102" y2="95" stroke={color} strokeWidth="1.5" opacity="0.3" />
      <line x1="70" y1="103" x2="102" y2="103" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      {/* Check mark */}
      <circle cx="115" cy="110" r="14" fill={color} fillOpacity="0.12" stroke={color} strokeWidth="1.5" opacity="0.4" />
      <polyline points="108,110 113,115 122,106" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
    </svg>
  )
}

function KlantenIllustration({ color }: { color: string }) {
  return (
    <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Adreskaart */}
      <rect x="30" y="42" width="100" height="70" rx="8" fill={color} fillOpacity="0.06" stroke={color} strokeWidth="1.5" opacity="0.4" />
      {/* Avatar cirkel */}
      <circle cx="58" cy="72" r="14" stroke={color} strokeWidth="1.5" opacity="0.35" />
      <circle cx="58" cy="68" r="5" fill={color} opacity="0.2" />
      <path d="M46 84c0-6.6 5.4-12 12-12s12 5.4 12 12" stroke={color} strokeWidth="1.5" opacity="0.2" />
      {/* Tekst lijnen */}
      <line x1="82" y1="62" x2="118" y2="62" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      <line x1="82" y1="74" x2="112" y2="74" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
      <line x1="82" y1="86" x2="105" y2="86" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.15" />
    </svg>
  )
}

function WerkbonnenIllustration({ color }: { color: string }) {
  return (
    <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Klembord */}
      <rect x="42" y="35" width="68" height="90" rx="6" fill={color} fillOpacity="0.06" stroke={color} strokeWidth="1.5" opacity="0.4" />
      {/* Klembord clip */}
      <rect x="62" y="28" width="28" height="14" rx="4" stroke={color} strokeWidth="1.5" opacity="0.5" />
      <rect x="68" y="25" width="16" height="6" rx="3" fill={color} opacity="0.2" />
      {/* Checkbox items */}
      <rect x="52" y="55" width="10" height="10" rx="2" stroke={color} strokeWidth="1.2" opacity="0.3" />
      <line x1="62" y1="60" x2="98" y2="60" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
      <rect x="52" y="75" width="10" height="10" rx="2" stroke={color} strokeWidth="1.2" opacity="0.3" />
      <line x1="62" y1="80" x2="92" y2="80" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
      <rect x="52" y="95" width="10" height="10" rx="2" stroke={color} strokeWidth="1.2" opacity="0.3" />
      <line x1="62" y1="100" x2="88" y2="100" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.15" />
    </svg>
  )
}

function PlanningIllustration({ color }: { color: string }) {
  return (
    <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Kalender */}
      <rect x="32" y="38" width="96" height="84" rx="8" fill={color} fillOpacity="0.06" stroke={color} strokeWidth="1.5" opacity="0.4" />
      {/* Header bar */}
      <rect x="32" y="38" width="96" height="20" rx="8" fill={color} opacity="0.12" />
      <circle cx="52" cy="38" r="4" fill={color} opacity="0.3" />
      <circle cx="108" cy="38" r="4" fill={color} opacity="0.3" />
      {/* Grid */}
      {[0, 1, 2, 3].map(row => (
        <React.Fragment key={row}>
          {[0, 1, 2, 3, 4].map(col => (
            <rect
              key={`${row}-${col}`}
              x={40 + col * 18}
              y={66 + row * 14}
              width="12"
              height="8"
              rx="2"
              fill={color}
              opacity={row === 1 && col === 2 ? 0.25 : 0.06}
            />
          ))}
        </React.Fragment>
      ))}
    </svg>
  )
}

function DefaultIllustration({ color }: { color: string }) {
  return (
    <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="40" y="40" width="80" height="80" rx="12" stroke={color} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.3" />
      <circle cx="80" cy="80" r="20" stroke={color} strokeWidth="1.5" opacity="0.2" />
      <line x1="72" y1="80" x2="88" y2="80" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <line x1="80" y1="72" x2="80" y2="88" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
    </svg>
  )
}

const ILLUSTRATIONS: Record<EmptyStateModule, React.FC<{ color: string }>> = {
  projecten: ProjectenIllustration,
  offertes: OffertesIllustration,
  facturen: FacturenIllustration,
  klanten: KlantenIllustration,
  werkbonnen: WerkbonnenIllustration,
  planning: PlanningIllustration,
  taken: DefaultIllustration,
  default: DefaultIllustration,
}

interface EmptyStateProps {
  module?: EmptyStateModule
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ module = 'default', title, description, action, className }: EmptyStateProps) {
  const color = MODULE_COLORS[module]
  const Illustration = ILLUSTRATIONS[module]

  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-6', className)}>
      <div className="mb-4 opacity-80">
        <Illustration color={color} />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground text-center max-w-[320px] mb-5">{description}</p>
      )}
      {action}
    </div>
  )
}
