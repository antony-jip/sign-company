import React from 'react'
import {
  Clock,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'

// ============ STATUS ============

export const statusOpties = [
  { value: 'alle', label: 'Alle statussen' },
  { value: 'gepland', label: 'Gepland' },
  { value: 'actief', label: 'Actief' },
  { value: 'in-review', label: 'In review' },
  { value: 'afgerond', label: 'Afgerond' },
  { value: 'on-hold', label: 'On-hold' },
] as const

export const statusLabels: Record<string, string> = {
  gepland: 'Gepland',
  actief: 'Actief',
  'in-review': 'In review',
  afgerond: 'Afgerond',
  'on-hold': 'On-hold',
}

export const statusIcons: Record<string, React.ReactNode> = {
  gepland: React.createElement(Clock, { className: 'h-3 w-3' }),
  actief: React.createElement(TrendingUp, { className: 'h-3 w-3' }),
  'in-review': React.createElement(BarChart3, { className: 'h-3 w-3' }),
  afgerond: React.createElement(CheckCircle2, { className: 'h-3 w-3' }),
  'on-hold': React.createElement(AlertTriangle, { className: 'h-3 w-3' }),
}

// ============ PRIORITEIT ============

export const prioriteitOpties = [
  { value: 'alle', label: 'Alle prioriteiten' },
  { value: 'laag', label: 'Laag' },
  { value: 'medium', label: 'Medium' },
  { value: 'hoog', label: 'Hoog' },
  { value: 'kritiek', label: 'Kritiek' },
] as const

// ============ STATUS KLEUREN ============

export function getStatusBorderColor(status: string): string {
  switch (status) {
    case 'actief': return 'border-l-green-500'
    case 'gepland': return 'border-l-primary'
    case 'in-review': return 'border-l-amber-500'
    case 'afgerond': return 'border-l-emerald-500'
    case 'on-hold': return 'border-l-red-500'
    default: return 'border-l-gray-400'
  }
}

export function getStatusCellBg(status: string): string {
  switch (status) {
    case 'actief': return 'bg-green-50 dark:bg-green-950/30'
    case 'gepland': return 'bg-blue-50 dark:bg-blue-950/30'
    case 'in-review': return 'bg-amber-50 dark:bg-amber-950/30'
    case 'afgerond': return 'bg-emerald-50 dark:bg-emerald-950/30'
    case 'on-hold': return 'bg-red-50 dark:bg-red-950/30'
    default: return 'bg-gray-50 dark:bg-gray-800/30'
  }
}

export function getStatusDotColor(status: string): string {
  switch (status) {
    case 'actief': return 'bg-green-500'
    case 'gepland': return 'bg-primary'
    case 'in-review': return 'bg-amber-500'
    case 'afgerond': return 'bg-emerald-500'
    case 'on-hold': return 'bg-red-500'
    default: return 'bg-gray-400'
  }
}

// ============ TAAK STATUS ============

export const taakStatusKolommen = [
  { key: 'todo', label: 'Todo', kleur: 'border-t-gray-400', bgKleur: 'from-gray-400 to-gray-500' },
  { key: 'bezig', label: 'Bezig', kleur: 'border-t-blue-500', bgKleur: 'from-blue-400 to-blue-600' },
  { key: 'review', label: 'Review', kleur: 'border-t-yellow-500', bgKleur: 'from-yellow-400 to-orange-500' },
  { key: 'klaar', label: 'Klaar', kleur: 'border-t-green-500', bgKleur: 'from-emerald-400 to-green-600' },
] as const

export const taakStatusLabels: Record<string, string> = {
  todo: 'Todo',
  bezig: 'Bezig',
  review: 'Review',
  klaar: 'Klaar',
}

export const taakPrioriteitWaarde: Record<string, number> = {
  kritiek: 4,
  hoog: 3,
  medium: 2,
  laag: 1,
}

export const taakStatusWaarde: Record<string, number> = {
  todo: 1,
  bezig: 2,
  review: 3,
  klaar: 4,
}

// ============ GOEDKEURING STATUS ============

export const goedkeuringStatusLabels: Record<string, string> = {
  verzonden: 'Verzonden',
  bekeken: 'Bekeken',
  goedgekeurd: 'Goedgekeurd',
  revisie: 'Revisie gevraagd',
}

// ============ GANTT / TIJDLIJN KLEUREN ============

export const ganttStatusKleuren: Record<string, string> = {
  gepland: 'bg-blue-400 dark:bg-blue-500',
  actief: 'bg-emerald-500 dark:bg-emerald-400',
  'in-review': 'bg-amber-400 dark:bg-amber-500',
  afgerond: 'bg-green-600 dark:bg-green-500',
  'on-hold': 'bg-orange-400 dark:bg-orange-500',
}

// ============ SIGN-INDUSTRIE TYPES ============

export const projectTypeOpties = [
  { value: 'lichtreclame', label: 'Lichtreclame' },
  { value: 'gevelbelettering', label: 'Gevelbelettering' },
  { value: 'voertuigbelettering', label: 'Voertuigbelettering' },
  { value: 'raamsigning', label: 'Raamsigning' },
  { value: 'interieur', label: 'Interieur signing' },
  { value: 'wayfinding', label: 'Wayfinding' },
  { value: 'overig', label: 'Overig' },
] as const

export type ProjectType = typeof projectTypeOpties[number]['value']

// ============ PRODUCTIEFASEN ============

export const productieFasen = [
  { key: 'ontwerp', label: 'Ontwerp', kleur: 'bg-blue-500' },
  { key: 'goedkeuring', label: 'Goedkeuring', kleur: 'bg-amber-500' },
  { key: 'productie', label: 'Productie', kleur: 'bg-primary' },
  { key: 'montage', label: 'Montage', kleur: 'bg-purple-500' },
  { key: 'oplevering', label: 'Oplevering', kleur: 'bg-emerald-500' },
] as const

export type ProductieFase = typeof productieFasen[number]['key']
