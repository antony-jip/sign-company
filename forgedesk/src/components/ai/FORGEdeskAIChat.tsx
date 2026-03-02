import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Bot,
  Send,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  FileText,
  Users,
  FolderKanban,
  Receipt,
  CheckSquare,
  Euro,
  Clock,
  Calendar,
  BarChart3,
} from 'lucide-react'
import { useKlanten, useProjecten, useTaken, useOffertes } from '@/hooks/useData'
import * as db from '@/services/supabaseService'
import { cn } from '@/lib/utils'
import type { Klant, Project, Taak, Offerte, Factuur } from '@/types'

// ─── Types ───────────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  rol: 'user' | 'assistant'
  bericht: string
  timestamp: Date
  data?: ResponseData | null
}

interface MetricCard {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  color: string
  trend?: 'up' | 'down' | 'neutral'
}

interface AlertItem {
  type: 'warning' | 'danger' | 'info'
  icon: React.ReactNode
  message: string
}

interface TableRow {
  cells: string[]
}

interface ResponseData {
  type: 'metrics' | 'table' | 'list' | 'alert'
  metrics?: MetricCard[]
  headers?: string[]
  rows?: TableRow[]
  items?: string[]
  alerts?: AlertItem[]
}

// ─── Currency formatter ──────────────────────────────────────────────

function eur(n: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}

// ─── Smart query engine ──────────────────────────────────────────────

interface BusinessData {
  klanten: Klant[]
  projecten: Project[]
  taken: Taak[]
  offertes: Offerte[]
  facturen: Factuur[]
}

function processQuery(q: string, data: BusinessData): { text: string; data?: ResponseData } {
  const lower = q.toLowerCase().trim()

  // ── Offertes ──────────────────────────────────────────────
  if (match(lower, ['offerte', 'offertes', 'quote', 'quotes'])) {
    const all = data.offertes
    const open = all.filter(o => o.status === 'verzonden' || o.status === 'bekeken')
    const concept = all.filter(o => o.status === 'concept')
    const goedgekeurd = all.filter(o => o.status === 'goedgekeurd')
    const afgewezen = all.filter(o => o.status === 'afgewezen')
    const openWaarde = open.reduce((s, o) => s + o.totaal, 0)
    const totalWaarde = all.reduce((s, o) => s + o.totaal, 0)

    // "open offertes" or "hoeveel offertes staan er open"
    if (match(lower, ['open', 'uitstaand', 'verzonden', 'bekeken', 'lopend'])) {
      return {
        text: `Er ${open.length === 1 ? 'staat' : 'staan'} **${open.length} open offerte${open.length !== 1 ? 's' : ''}** met een totale waarde van **${eur(openWaarde)}**.`,
        data: open.length > 0 ? {
          type: 'table',
          headers: ['Nummer', 'Klant', 'Status', 'Bedrag'],
          rows: open.map(o => ({
            cells: [o.nummer, o.klant_naam || '—', statusLabel(o.status), eur(o.totaal)]
          }))
        } : undefined
      }
    }

    // "offerte overzicht" or just "offertes"
    return {
      text: `**Offerte overzicht:**\n• ${open.length} open (${eur(openWaarde)})\n• ${concept.length} concept\n• ${goedgekeurd.length} goedgekeurd\n• ${afgewezen.length} afgewezen\n\nTotale offerte waarde: **${eur(totalWaarde)}**`,
      data: {
        type: 'metrics',
        metrics: [
          { label: 'Open', value: open.length, sub: eur(openWaarde), icon: <FileText className="w-4 h-4" />, color: 'blue' },
          { label: 'Concept', value: concept.length, icon: <FileText className="w-4 h-4" />, color: 'gray' },
          { label: 'Goedgekeurd', value: goedgekeurd.length, icon: <FileText className="w-4 h-4" />, color: 'emerald', trend: 'up' },
          { label: 'Afgewezen', value: afgewezen.length, icon: <FileText className="w-4 h-4" />, color: 'red', trend: 'down' },
        ]
      }
    }
  }

  // ── Facturen ──────────────────────────────────────────────
  if (match(lower, ['factuur', 'facturen', 'invoice', 'betaling', 'onbetaald', 'vervallen'])) {
    const all = data.facturen
    const openFact = all.filter(f => f.status === 'verzonden')
    const vervallen = all.filter(f => f.status === 'vervallen')
    const betaald = all.filter(f => f.status === 'betaald')
    const openBedrag = openFact.reduce((s, f) => s + f.totaal - (f.betaald_bedrag || 0), 0)
    const vervallenBedrag = vervallen.reduce((s, f) => s + f.totaal - (f.betaald_bedrag || 0), 0)

    if (match(lower, ['vervallen', 'overdue', 'achterstallig', 'te laat'])) {
      return {
        text: vervallen.length > 0
          ? `Er ${vervallen.length === 1 ? 'is' : 'zijn'} **${vervallen.length} vervallen factuur${vervallen.length !== 1 ? 'en' : ''}** met een openstaand bedrag van **${eur(vervallenBedrag)}**.`
          : 'Goed nieuws! Er zijn geen vervallen facturen.',
        data: vervallen.length > 0 ? {
          type: 'table',
          headers: ['Nummer', 'Klant', 'Vervaldatum', 'Open bedrag'],
          rows: vervallen.map(f => ({
            cells: [f.nummer, f.klant_naam || '—', formatDate(f.vervaldatum), eur(f.totaal - (f.betaald_bedrag || 0))]
          }))
        } : undefined
      }
    }

    return {
      text: `**Factuur overzicht:**\n• ${openFact.length} openstaand (${eur(openBedrag)})\n• ${vervallen.length} vervallen (${eur(vervallenBedrag)})\n• ${betaald.length} betaald`,
      data: {
        type: 'metrics',
        metrics: [
          { label: 'Openstaand', value: openFact.length, sub: eur(openBedrag), icon: <Receipt className="w-4 h-4" />, color: 'blue' },
          { label: 'Vervallen', value: vervallen.length, sub: eur(vervallenBedrag), icon: <AlertTriangle className="w-4 h-4" />, color: 'red', trend: 'down' },
          { label: 'Betaald', value: betaald.length, icon: <Receipt className="w-4 h-4" />, color: 'emerald', trend: 'up' },
        ]
      }
    }
  }

  // ── Projecten ─────────────────────────────────────────────
  if (match(lower, ['project', 'projecten', 'projects'])) {
    const all = data.projecten
    const actief = all.filter(p => p.status === 'actief')
    const gepland = all.filter(p => p.status === 'gepland')
    const review = all.filter(p => p.status === 'in-review')
    const afgerond = all.filter(p => p.status === 'afgerond')
    const totaalBudget = all.reduce((s, p) => s + (p.budget || 0), 0)
    const totaalBesteed = all.reduce((s, p) => s + (p.besteed || 0), 0)

    // "over budget" projects
    if (match(lower, ['budget', 'over budget', 'overschrijd', 'duur', 'kosten'])) {
      const overBudget = all.filter(p => p.besteed > p.budget && p.budget > 0)
      return {
        text: overBudget.length > 0
          ? `**${overBudget.length} project${overBudget.length !== 1 ? 'en' : ''} ${overBudget.length === 1 ? 'overschrijdt' : 'overschrijden'} het budget:**`
          : `Alle projecten zitten binnen budget. Totaal besteed: ${eur(totaalBesteed)} van ${eur(totaalBudget)}.`,
        data: overBudget.length > 0 ? {
          type: 'table',
          headers: ['Project', 'Budget', 'Besteed', 'Over'],
          rows: overBudget.map(p => ({
            cells: [p.naam, eur(p.budget), eur(p.besteed), eur(p.besteed - p.budget)]
          }))
        } : undefined
      }
    }

    // "actieve projecten"
    if (match(lower, ['actie', 'actief', 'lopend', 'bezig', 'active'])) {
      return {
        text: `Er ${actief.length === 1 ? 'is' : 'zijn'} **${actief.length} actieve project${actief.length !== 1 ? 'en' : ''}**:`,
        data: {
          type: 'table',
          headers: ['Project', 'Klant', 'Voortgang', 'Budget'],
          rows: actief.map(p => ({
            cells: [p.naam, p.klant_naam || '—', `${p.voortgang}%`, eur(p.budget)]
          }))
        }
      }
    }

    return {
      text: `**Project overzicht:**\n• ${actief.length} actief\n• ${gepland.length} gepland\n• ${review.length} in review\n• ${afgerond.length} afgerond\n\nTotaal budget: ${eur(totaalBudget)} | Besteed: ${eur(totaalBesteed)}`,
      data: {
        type: 'metrics',
        metrics: [
          { label: 'Actief', value: actief.length, icon: <FolderKanban className="w-4 h-4" />, color: 'blue' },
          { label: 'Gepland', value: gepland.length, icon: <Calendar className="w-4 h-4" />, color: 'teal' },
          { label: 'Budget', value: eur(totaalBudget), sub: `${eur(totaalBesteed)} besteed`, icon: <Euro className="w-4 h-4" />, color: 'emerald' },
          { label: 'Afgerond', value: afgerond.length, icon: <CheckSquare className="w-4 h-4" />, color: 'gray' },
        ]
      }
    }
  }

  // ── Taken ─────────────────────────────────────────────────
  if (match(lower, ['taak', 'taken', 'task', 'tasks', 'todo', 'to-do'])) {
    const all = data.taken
    const todo = all.filter(t => t.status === 'todo')
    const bezig = all.filter(t => t.status === 'bezig')
    const review = all.filter(t => t.status === 'review')
    const klaar = all.filter(t => t.status === 'klaar')

    // "openstaande taken" / "onafgeronde taken"
    const openTaken = [...todo, ...bezig, ...review]

    // Overdue tasks
    if (match(lower, ['verlopen', 'deadline', 'overdue', 'te laat', 'achterstallig'])) {
      const now = new Date()
      const overdue = openTaken.filter(t => t.deadline && new Date(t.deadline) < now)
      return {
        text: overdue.length > 0
          ? `**${overdue.length} ${overdue.length === 1 ? 'taak is' : 'taken zijn'} over de deadline:**`
          : 'Alle taken zijn binnen de deadline.',
        data: overdue.length > 0 ? {
          type: 'table',
          headers: ['Taak', 'Toegewezen', 'Deadline', 'Status'],
          rows: overdue.map(t => ({
            cells: [t.titel, t.toegewezen_aan || '—', formatDate(t.deadline), statusLabel(t.status)]
          }))
        } : undefined
      }
    }

    return {
      text: `**Taken overzicht:**\n• ${todo.length} to-do\n• ${bezig.length} in uitvoering\n• ${review.length} in review\n• ${klaar.length} afgerond`,
      data: {
        type: 'metrics',
        metrics: [
          { label: 'To-do', value: todo.length, icon: <CheckSquare className="w-4 h-4" />, color: 'gray' },
          { label: 'Bezig', value: bezig.length, icon: <Clock className="w-4 h-4" />, color: 'blue' },
          { label: 'Review', value: review.length, icon: <CheckSquare className="w-4 h-4" />, color: 'amber' },
          { label: 'Klaar', value: klaar.length, icon: <CheckSquare className="w-4 h-4" />, color: 'emerald', trend: 'up' },
        ]
      }
    }
  }

  // ── Klanten ───────────────────────────────────────────────
  if (match(lower, ['klant', 'klanten', 'customer', 'customers', 'client'])) {
    const all = data.klanten
    const actief = all.filter(k => k.status === 'actief')
    const prospect = all.filter(k => k.status === 'prospect')
    const inactief = all.filter(k => k.status === 'inactief')

    if (match(lower, ['prospect', 'prospects', 'potentieel', 'nieuwe'])) {
      return {
        text: `Er ${prospect.length === 1 ? 'is' : 'zijn'} **${prospect.length} prospect${prospect.length !== 1 ? 's' : ''}**:`,
        data: prospect.length > 0 ? {
          type: 'table',
          headers: ['Bedrijf', 'Contact', 'Email'],
          rows: prospect.map(k => ({
            cells: [k.bedrijfsnaam, k.contactpersoon, k.email]
          }))
        } : undefined
      }
    }

    return {
      text: `**Klanten overzicht:**\n• ${actief.length} actieve klanten\n• ${prospect.length} prospects\n• ${inactief.length} inactief\n\nTotaal: ${all.length} contacten`,
      data: {
        type: 'metrics',
        metrics: [
          { label: 'Actief', value: actief.length, icon: <Users className="w-4 h-4" />, color: 'emerald' },
          { label: 'Prospects', value: prospect.length, icon: <Users className="w-4 h-4" />, color: 'blue' },
          { label: 'Inactief', value: inactief.length, icon: <Users className="w-4 h-4" />, color: 'gray' },
          { label: 'Totaal', value: all.length, icon: <Users className="w-4 h-4" />, color: 'teal' },
        ]
      }
    }
  }

  // ── Omzet / Revenue ───────────────────────────────────────
  if (match(lower, ['omzet', 'revenue', 'inkomsten', 'verdien', 'winst', 'geld'])) {
    const betaaldeFacturen = data.facturen.filter(f => f.status === 'betaald')
    const omzet = betaaldeFacturen.reduce((s, f) => s + f.totaal, 0)
    const goedgekeurdeOffertes = data.offertes.filter(o => o.status === 'goedgekeurd')
    const pipeline = data.offertes
      .filter(o => o.status === 'verzonden' || o.status === 'bekeken')
      .reduce((s, o) => s + o.totaal, 0)

    return {
      text: `**Financieel overzicht:**\n• Omzet (betaald): **${eur(omzet)}**\n• Goedgekeurde offertes: **${eur(goedgekeurdeOffertes.reduce((s, o) => s + o.totaal, 0))}**\n• Pipeline (open offertes): **${eur(pipeline)}**`,
      data: {
        type: 'metrics',
        metrics: [
          { label: 'Omzet', value: eur(omzet), icon: <Euro className="w-4 h-4" />, color: 'emerald', trend: 'up' },
          { label: 'Goedgekeurd', value: eur(goedgekeurdeOffertes.reduce((s, o) => s + o.totaal, 0)), icon: <TrendingUp className="w-4 h-4" />, color: 'blue' },
          { label: 'Pipeline', value: eur(pipeline), icon: <BarChart3 className="w-4 h-4" />, color: 'teal' },
        ]
      }
    }
  }

  // ── Dashboard / overzicht / samenvatting ──────────────────
  if (match(lower, ['dashboard', 'overzicht', 'samenvatting', 'status', 'hoe gaat het', 'hoe staat', 'rapport'])) {
    const openOffertes = data.offertes.filter(o => o.status === 'verzonden' || o.status === 'bekeken')
    const actieveProjecten = data.projecten.filter(p => p.status === 'actief')
    const openTaken = data.taken.filter(t => t.status !== 'klaar')
    const vervallenFacturen = data.facturen.filter(f => f.status === 'vervallen')
    const pipeline = openOffertes.reduce((s, o) => s + o.totaal, 0)

    const alerts: AlertItem[] = []
    if (vervallenFacturen.length > 0) {
      alerts.push({
        type: 'danger',
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
        message: `${vervallenFacturen.length} vervallen factuur${vervallenFacturen.length !== 1 ? 'en' : ''} - actie vereist`
      })
    }
    const overBudget = data.projecten.filter(p => p.besteed > p.budget && p.budget > 0)
    if (overBudget.length > 0) {
      alerts.push({
        type: 'warning',
        icon: <TrendingDown className="w-3.5 h-3.5" />,
        message: `${overBudget.length} project${overBudget.length !== 1 ? 'en' : ''} over budget`
      })
    }
    const now = new Date()
    const overdueTaken = data.taken.filter(t => t.status !== 'klaar' && t.deadline && new Date(t.deadline) < now)
    if (overdueTaken.length > 0) {
      alerts.push({
        type: 'warning',
        icon: <Clock className="w-3.5 h-3.5" />,
        message: `${overdueTaken.length} ${overdueTaken.length === 1 ? 'taak' : 'taken'} over deadline`
      })
    }

    return {
      text: alerts.length > 0
        ? `Hier is je bedrijfsoverzicht. Let op: er ${alerts.length === 1 ? 'is' : 'zijn'} **${alerts.length} ${alerts.length === 1 ? 'aandachtspunt' : 'aandachtspunten'}**.`
        : 'Hier is je bedrijfsoverzicht. Alles ziet er goed uit!',
      data: {
        type: 'metrics',
        metrics: [
          { label: 'Open Offertes', value: openOffertes.length, sub: eur(pipeline), icon: <FileText className="w-4 h-4" />, color: 'blue' },
          { label: 'Actieve Projecten', value: actieveProjecten.length, icon: <FolderKanban className="w-4 h-4" />, color: 'teal' },
          { label: 'Open Taken', value: openTaken.length, icon: <CheckSquare className="w-4 h-4" />, color: 'amber' },
          { label: 'Klanten', value: data.klanten.filter(k => k.status === 'actief').length, icon: <Users className="w-4 h-4" />, color: 'emerald' },
        ],
        alerts: alerts.length > 0 ? alerts : undefined,
      }
    }
  }

  // ── Groet / hallo ─────────────────────────────────────────
  if (match(lower, ['hallo', 'hey', 'hoi', 'goedemorgen', 'goedemiddag', 'goedeavond', 'hi'])) {
    const openOffertes = data.offertes.filter(o => o.status === 'verzonden' || o.status === 'bekeken')
    const actieveProjecten = data.projecten.filter(p => p.status === 'actief')
    const openTaken = data.taken.filter(t => t.status !== 'klaar')

    return {
      text: `Hallo! Hier een snelle update:\n\n• **${openOffertes.length}** open offertes (${eur(openOffertes.reduce((s, o) => s + o.totaal, 0))})\n• **${actieveProjecten.length}** actieve projecten\n• **${openTaken.length}** openstaande taken\n\nWaar kan ik je mee helpen?`,
    }
  }

  // ── Default fallback ──────────────────────────────────────
  return {
    text: `Ik begrijp je vraag niet helemaal. Probeer iets als:\n\n• "Hoeveel offertes staan er open?"\n• "Geef me een overzicht"\n• "Welke facturen zijn vervallen?"\n• "Hoeveel actieve projecten zijn er?"\n• "Zijn er taken over de deadline?"\n• "Laat mijn klanten zien"\n• "Hoe is de omzet?"`,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────

function match(input: string, keywords: string[]): boolean {
  return keywords.some(k => input.includes(k))
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    concept: 'Concept', verzonden: 'Verzonden', bekeken: 'Bekeken',
    goedgekeurd: 'Goedgekeurd', afgewezen: 'Afgewezen',
    actief: 'Actief', gepland: 'Gepland', 'in-review': 'In review',
    afgerond: 'Afgerond', 'on-hold': 'On hold',
    todo: 'To-do', bezig: 'Bezig', review: 'Review', klaar: 'Klaar',
    betaald: 'Betaald', vervallen: 'Vervallen',
  }
  return labels[status] || status
}

function formatDate(d?: string): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Color helpers for metric cards ──────────────────────────────────

function getMetricColors(color: string) {
  const map: Record<string, { bg: string; text: string; icon: string }> = {
    blue: { bg: 'bg-primary/10 dark:bg-primary/20', text: 'text-accent dark:text-wm-light', icon: 'text-primary' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', icon: 'text-emerald-500' },
    violet: { bg: 'bg-[#4A442D]/10 dark:bg-[#4A442D]/30', text: 'text-[#4A442D] dark:text-wm-pale', icon: 'text-primary' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', icon: 'text-amber-500' },
    red: { bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-300', icon: 'text-red-500' },
    gray: { bg: 'bg-gray-50 dark:bg-gray-800/40', text: 'text-gray-700 dark:text-gray-300', icon: 'text-gray-500' },
  }
  return map[color] || map.gray
}

// ─── Suggestion chips ────────────────────────────────────────────────

const suggestions = [
  { label: 'Geef me een overzicht', icon: <BarChart3 className="w-3 h-3" /> },
  { label: 'Open offertes', icon: <FileText className="w-3 h-3" /> },
  { label: 'Actieve projecten', icon: <FolderKanban className="w-3 h-3" /> },
  { label: 'Vervallen facturen', icon: <AlertTriangle className="w-3 h-3" /> },
  { label: 'Taken over deadline', icon: <Clock className="w-3 h-3" /> },
  { label: 'Mijn klanten', icon: <Users className="w-3 h-3" /> },
  { label: 'Omzet overzicht', icon: <Euro className="w-3 h-3" /> },
]

// ═══════════════════════════════════════════════════════════════════════
// ─── Main Component ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

export function FORGEdeskAIChat() {
  const { data: klanten } = useKlanten()
  const { data: projecten } = useProjecten()
  const { data: taken } = useTaken()
  const { data: offertes } = useOffertes()
  const [facturen, setFacturen] = useState<Factuur[]>([])

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load facturen on mount
  useEffect(() => {
    db.getFacturen().then(setFacturen).catch(() => setFacturen([]))
  }, [])

  const businessData = useMemo<BusinessData>(() => ({
    klanten, projecten, taken, offertes, facturen
  }), [klanten, projecten, taken, offertes, facturen])

  // Proactive alerts
  const alerts = useMemo<AlertItem[]>(() => {
    const items: AlertItem[] = []
    const now = new Date()

    // Vervallen facturen
    const vervallenFacturen = facturen.filter(f => f.status === 'vervallen')
    if (vervallenFacturen.length > 0) {
      const bedrag = vervallenFacturen.reduce((s, f) => s + f.totaal - (f.betaald_bedrag || 0), 0)
      items.push({
        type: 'danger',
        icon: <Receipt className="w-3.5 h-3.5" />,
        message: `${vervallenFacturen.length} vervallen factuur${vervallenFacturen.length !== 1 ? 'en' : ''} (${eur(bedrag)})`
      })
    }

    // Over-budget projecten
    const overBudget = projecten.filter(p => p.besteed > p.budget && p.budget > 0)
    if (overBudget.length > 0) {
      items.push({
        type: 'warning',
        icon: <TrendingDown className="w-3.5 h-3.5" />,
        message: `${overBudget.length} project${overBudget.length !== 1 ? 'en' : ''} over budget`
      })
    }

    // Overdue taken
    const overdue = taken.filter(t => t.status !== 'klaar' && t.deadline && new Date(t.deadline) < now)
    if (overdue.length > 0) {
      items.push({
        type: 'warning',
        icon: <Clock className="w-3.5 h-3.5" />,
        message: `${overdue.length} ${overdue.length === 1 ? 'taak' : 'taken'} over deadline`
      })
    }

    // Bijna verlopen offertes (within 7 days)
    const bijna = offertes.filter(o => {
      if (o.status !== 'verzonden' && o.status !== 'bekeken') return false
      if (!o.geldig_tot) return false
      const exp = new Date(o.geldig_tot)
      const diff = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      return diff >= 0 && diff <= 7
    })
    if (bijna.length > 0) {
      items.push({
        type: 'info',
        icon: <FileText className="w-3.5 h-3.5" />,
        message: `${bijna.length} offerte${bijna.length !== 1 ? 's' : ''} ${bijna.length === 1 ? 'verloopt' : 'verlopen'} binnen 7 dagen`
      })
    }

    return items
  }, [facturen, projecten, taken, offertes])

  // Quick stats for the header
  const stats = useMemo(() => ({
    openOffertes: offertes.filter(o => o.status === 'verzonden' || o.status === 'bekeken').length,
    actieveProjecten: projecten.filter(p => p.status === 'actief').length,
    openTaken: taken.filter(t => t.status !== 'klaar').length,
    actieveKlanten: klanten.filter(k => k.status === 'actief').length,
    pipeline: offertes.filter(o => o.status === 'verzonden' || o.status === 'bekeken').reduce((s, o) => s + o.totaal, 0),
  }), [offertes, projecten, taken, klanten])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSend = useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      rol: 'user',
      bericht: trimmed,
      timestamp: new Date(),
    }

    const result = processQuery(trimmed, businessData)

    const botMsg: ChatMessage = {
      id: `msg-${Date.now()}-r`,
      rol: 'assistant',
      bericht: result.text,
      timestamp: new Date(),
      data: result.data || null,
    }

    setMessages(prev => [...prev, userMsg, botMsg])
    setInput('')
    inputRef.current?.focus()
  }, [businessData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSend(input)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))]">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 pt-5 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-gradient-to-br from-accent to-primary rounded-xl shadow-lg shadow-primary/30 dark:shadow-accent/30">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground font-display">AI Assistent</h1>
            <p className="text-sm text-muted-foreground">
              Stel vragen over je bedrijfsdata
            </p>
          </div>
        </div>

        {/* ── Quick stats ──────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <QuickStat label="Open Offertes" value={stats.openOffertes} sub={eur(stats.pipeline)} color="blue" icon={<FileText className="w-4 h-4" />} />
          <QuickStat label="Actieve Projecten" value={stats.actieveProjecten} color="violet" icon={<FolderKanban className="w-4 h-4" />} />
          <QuickStat label="Open Taken" value={stats.openTaken} color="amber" icon={<CheckSquare className="w-4 h-4" />} />
          <QuickStat label="Klanten" value={stats.actieveKlanten} color="emerald" icon={<Users className="w-4 h-4" />} />
        </div>

        {/* ── Alerts ───────────────────────────────────────── */}
        {alerts.length > 0 && (
          <div className="space-y-1.5 mb-1">
            {alerts.map((alert, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium',
                  alert.type === 'danger' && 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400',
                  alert.type === 'warning' && 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
                  alert.type === 'info' && 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
                )}
              >
                {alert.icon}
                {alert.message}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Chat area ──────────────────────────────────────── */}
      <ScrollArea className="flex-1 px-6">
        {messages.length === 0 ? (
          /* Empty state with suggestions */
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-wm-pale/30 to-primary/10 dark:from-[#4A442D]/40 dark:to-accent/40 flex items-center justify-center mb-4">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Stel een vraag</p>
            <p className="text-xs text-muted-foreground mb-6 text-center max-w-xs">
              Ik kan je alles vertellen over je offertes, projecten, facturen, taken en klanten.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {suggestions.map(s => (
                <button
                  key={s.label}
                  onClick={() => handleSend(s.label)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-background hover:bg-muted/60 text-xs text-foreground transition-colors"
                >
                  {s.icon}
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages */
          <div className="space-y-5 py-4">
            {messages.map(msg => (
              <div key={msg.id}>
                {msg.rol === 'user' ? (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] bg-accent text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm">
                      {msg.bericht}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground leading-relaxed">
                          <FormattedText text={msg.bericht} />
                        </div>
                      </div>
                    </div>

                    {/* Rich data rendering */}
                    {msg.data && (
                      <div className="ml-[38px]">
                        {msg.data.type === 'metrics' && msg.data.metrics && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {msg.data.metrics.map((m: MetricCard, i: number) => (
                                <MetricCardSmall key={i} metric={m} />
                              ))}
                            </div>
                            {msg.data.alerts && msg.data.alerts.length > 0 && (
                              <div className="space-y-1.5">
                                {msg.data.alerts.map((a, i) => (
                                  <div
                                    key={i}
                                    className={cn(
                                      'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium',
                                      a.type === 'danger' && 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400',
                                      a.type === 'warning' && 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
                                      a.type === 'info' && 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
                                    )}
                                  >
                                    {a.icon}
                                    {a.message}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        {msg.data.type === 'table' && msg.data.headers && msg.data.rows && (
                          <div className="rounded-lg border overflow-hidden">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-muted/50">
                                  {msg.data.headers.map((h, i) => (
                                    <th key={i} className="text-left px-3 py-2 font-semibold text-muted-foreground">
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {msg.data.rows.map((row, i) => (
                                  <tr key={i} className="border-t">
                                    {row.cells.map((cell, j) => (
                                      <td key={j} className="px-3 py-2 text-foreground">
                                        {cell}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* ── Input ──────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 py-4 border-t">
        {messages.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {suggestions.slice(0, 4).map(s => (
              <button
                key={s.label}
                onClick={() => handleSend(s.label)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full border bg-background hover:bg-muted/60 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Stel een vraag over je bedrijfsdata..."
            className="flex-1"
            autoComplete="off"
          />
          <Button type="submit" size="icon" disabled={!input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────

function QuickStat({ label, value, sub, color, icon }: {
  label: string; value: string | number; sub?: string; color: string; icon: React.ReactNode
}) {
  const c = getMetricColors(color)
  return (
    <div className={cn('rounded-xl px-3 py-2.5', c.bg)}>
      <div className="flex items-center gap-2 mb-1">
        <span className={c.icon}>{icon}</span>
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <p className={cn('text-lg font-bold', c.text)}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

function MetricCardSmall({ metric }: { key?: React.Key; metric: MetricCard }) {
  const c = getMetricColors(metric.color)
  return (
    <div className={cn('rounded-lg px-3 py-2', c.bg)}>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] font-medium text-muted-foreground">{metric.label}</span>
        {metric.trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-500" />}
        {metric.trend === 'down' && <TrendingDown className="w-3 h-3 text-red-500" />}
      </div>
      <p className={cn('text-sm font-bold', c.text)}>{metric.value}</p>
      {metric.sub && <p className="text-[10px] text-muted-foreground">{metric.sub}</p>}
    </div>
  )
}

function FormattedText({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i) => (
        <React.Fragment key={i}>
          {line.startsWith('•') ? (
            <div className="flex items-start gap-1.5 ml-1 my-0.5">
              <span className="mt-[7px] w-1 h-1 rounded-full bg-current flex-shrink-0 opacity-40" />
              <span dangerouslySetInnerHTML={{
                __html: line.slice(1).trim().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              }} />
            </div>
          ) : (
            <span dangerouslySetInnerHTML={{
              __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            }} />
          )}
          {i < text.split('\n').length - 1 && <br />}
        </React.Fragment>
      ))}
    </>
  )
}
