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
  FileText,
  FolderKanban,
  Receipt,
  Euro,
  Clock,
  Calendar,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getActiviteiten } from '@/services/importService'
import type { Project, Offerte, Factuur, Deal, Tijdregistratie, KlantActiviteit } from '@/types'

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

interface TableRow {
  cells: string[]
}

interface ResponseData {
  type: 'metrics' | 'table'
  metrics?: MetricCard[]
  headers?: string[]
  rows?: TableRow[]
}

// ─── Currency & date formatters ──────────────────────────────────────

function eur(n: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}

function fmtDate(d?: string): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    concept: 'Concept', verzonden: 'Verzonden', bekeken: 'Bekeken',
    goedgekeurd: 'Goedgekeurd', afgewezen: 'Afgewezen',
    actief: 'Actief', gepland: 'Gepland', 'in-review': 'In review',
    afgerond: 'Afgerond', 'on-hold': 'On hold',
    betaald: 'Betaald', vervallen: 'Vervallen',
    won: 'Gewonnen', lost: 'Verloren', open: 'Open',
  }
  return labels[status] || status
}

// ─── Query engine (client-scoped) ────────────────────────────────────

interface KlantData {
  klantNaam: string
  projecten: Project[]
  offertes: Offerte[]
  facturen: Factuur[]
  deals: Deal[]
  tijdregistraties: Tijdregistratie[]
  activiteiten: KlantActiviteit[]
}

function match(input: string, keywords: string[]): boolean {
  return keywords.some(k => input.includes(k))
}

function processKlantQuery(q: string, data: KlantData): { text: string; data?: ResponseData } {
  const lower = q.toLowerCase().trim()

  // ── Projecten ───────────────────────────────────────────
  if (match(lower, ['project', 'projecten', 'gedaan', 'gemaakt', 'werk', 'opdracht'])) {
    const all = data.projecten
    const actief = all.filter(p => p.status === 'actief')
    const afgerond = all.filter(p => p.status === 'afgerond')
    const totaalBudget = all.reduce((s, p) => s + (p.budget || 0), 0)
    const totaalBesteed = all.reduce((s, p) => s + (p.besteed || 0), 0)

    if (all.length === 0 && data.activiteiten.length > 0) {
      const projAct = data.activiteiten.filter(a => a.type === 'project')
      if (projAct.length > 0) {
        return {
          text: `Uit geïmporteerde data: **${projAct.length} project${projAct.length !== 1 ? 'en' : ''}** voor ${data.klantNaam}.`,
          data: {
            type: 'table',
            headers: ['Omschrijving', 'Datum', 'Bedrag'],
            rows: projAct.map(a => ({
              cells: [a.omschrijving || '—', fmtDate(a.datum), a.bedrag ? eur(a.bedrag) : '—']
            }))
          }
        }
      }
    }

    if (match(lower, ['wanneer', 'datum', 'tijdlijn', 'chronolog', 'historisch'])) {
      const sorted = [...all].sort((a, b) => (a.start_datum || '').localeCompare(b.start_datum || ''))
      return {
        text: `**Tijdlijn van projecten voor ${data.klantNaam}:**`,
        data: {
          type: 'table',
          headers: ['Project', 'Start', 'Eind', 'Status'],
          rows: sorted.map(p => ({
            cells: [p.naam, fmtDate(p.start_datum), fmtDate(p.eind_datum), statusLabel(p.status)]
          }))
        }
      }
    }

    if (match(lower, ['actie', 'actief', 'lopend', 'bezig'])) {
      return {
        text: actief.length > 0
          ? `**${actief.length} actie${actief.length !== 1 ? 've' : 'f'} project${actief.length !== 1 ? 'en' : ''}** voor ${data.klantNaam}:`
          : `Er zijn geen actieve projecten voor ${data.klantNaam}.`,
        data: actief.length > 0 ? {
          type: 'table',
          headers: ['Project', 'Voortgang', 'Budget', 'Besteed'],
          rows: actief.map(p => ({
            cells: [p.naam, `${p.voortgang}%`, eur(p.budget), eur(p.besteed)]
          }))
        } : undefined
      }
    }

    return {
      text: `**Projecten voor ${data.klantNaam}:**\n• ${actief.length} actief\n• ${afgerond.length} afgerond\n• ${all.length} totaal\n\nTotaal budget: ${eur(totaalBudget)} | Besteed: ${eur(totaalBesteed)}`,
      data: {
        type: all.length > 0 ? 'table' : 'metrics',
        ...(all.length > 0 ? {
          headers: ['Project', 'Status', 'Budget', 'Voortgang'],
          rows: all.map(p => ({
            cells: [p.naam, statusLabel(p.status), eur(p.budget), `${p.voortgang}%`]
          }))
        } : {
          metrics: [
            { label: 'Totaal', value: all.length, icon: <FolderKanban className="w-4 h-4" />, color: 'blue' },
            { label: 'Actief', value: actief.length, icon: <FolderKanban className="w-4 h-4" />, color: 'emerald' },
            { label: 'Budget', value: eur(totaalBudget), icon: <Euro className="w-4 h-4" />, color: 'teal' },
          ]
        })
      }
    }
  }

  // ── Offertes ────────────────────────────────────────────
  if (match(lower, ['offerte', 'offertes', 'quote', 'quotes', 'aanbieding'])) {
    const all = data.offertes
    const open = all.filter(o => o.status === 'verzonden' || o.status === 'bekeken')
    const goedgekeurd = all.filter(o => o.status === 'goedgekeurd')
    const afgewezen = all.filter(o => o.status === 'afgewezen')
    const totaal = all.reduce((s, o) => s + o.totaal, 0)

    if (all.length === 0 && data.activiteiten.length > 0) {
      const offAct = data.activiteiten.filter(a => a.type === 'offerte')
      if (offAct.length > 0) {
        return {
          text: `Uit geïmporteerde data: **${offAct.length} offerte${offAct.length !== 1 ? 's' : ''}** voor ${data.klantNaam}.`,
          data: {
            type: 'table',
            headers: ['Omschrijving', 'Datum', 'Bedrag', 'Status'],
            rows: offAct.map(a => ({
              cells: [a.omschrijving || '—', fmtDate(a.datum), a.bedrag ? eur(a.bedrag) : '—', a.status || '—']
            }))
          }
        }
      }
    }

    return {
      text: `**Offertes voor ${data.klantNaam}:**\n• ${open.length} open (${eur(open.reduce((s, o) => s + o.totaal, 0))})\n• ${goedgekeurd.length} goedgekeurd (${eur(goedgekeurd.reduce((s, o) => s + o.totaal, 0))})\n• ${afgewezen.length} afgewezen\n\nTotale waarde: **${eur(totaal)}**`,
      data: all.length > 0 ? {
        type: 'table',
        headers: ['Nummer', 'Titel', 'Status', 'Bedrag'],
        rows: all.map(o => ({
          cells: [o.nummer, o.titel || '—', statusLabel(o.status), eur(o.totaal)]
        }))
      } : undefined
    }
  }

  // ── Facturen ────────────────────────────────────────────
  if (match(lower, ['factuur', 'facturen', 'invoice', 'betaling', 'betaald', 'onbetaald', 'openstaand'])) {
    const all = data.facturen
    const openFact = all.filter(f => f.status === 'verzonden')
    const vervallen = all.filter(f => f.status === 'vervallen')
    const betaald = all.filter(f => f.status === 'betaald')
    const openBedrag = [...openFact, ...vervallen].reduce((s, f) => s + f.totaal - (f.betaald_bedrag || 0), 0)
    const betaaldBedrag = betaald.reduce((s, f) => s + f.betaald_bedrag, 0)

    return {
      text: `**Facturen voor ${data.klantNaam}:**\n• ${openFact.length} openstaand\n• ${vervallen.length} vervallen\n• ${betaald.length} betaald (${eur(betaaldBedrag)})\n\nOpenstaand bedrag: **${eur(openBedrag)}**`,
      data: all.length > 0 ? {
        type: 'table',
        headers: ['Nummer', 'Status', 'Totaal', 'Betaald', 'Vervaldatum'],
        rows: all.map(f => ({
          cells: [f.nummer, statusLabel(f.status), eur(f.totaal), eur(f.betaald_bedrag), fmtDate(f.vervaldatum)]
        }))
      } : {
        type: 'metrics',
        metrics: [
          { label: 'Openstaand', value: eur(openBedrag), icon: <Receipt className="w-4 h-4" />, color: 'amber' },
          { label: 'Betaald', value: eur(betaaldBedrag), icon: <Receipt className="w-4 h-4" />, color: 'emerald', trend: 'up' },
        ]
      }
    }
  }

  // ── Deals ───────────────────────────────────────────────
  if (match(lower, ['deal', 'deals', 'sales', 'pipeline', 'verkoop'])) {
    const all = data.deals
    if (all.length === 0) {
      return { text: `Er zijn geen deals geregistreerd voor ${data.klantNaam}.` }
    }
    const totaal = all.reduce((s, d) => s + (d.verwachte_waarde || 0), 0)
    return {
      text: `**${all.length} deal${all.length !== 1 ? 's' : ''}** voor ${data.klantNaam}, totale waarde: **${eur(totaal)}**`,
      data: {
        type: 'table',
        headers: ['Deal', 'Fase', 'Waarde', 'Status'],
        rows: all.map(d => ({
          cells: [d.titel, d.fase || '—', eur(d.verwachte_waarde || 0), statusLabel(d.status)]
        }))
      }
    }
  }

  // ── Uren / Tijdregistratie ──────────────────────────────
  if (match(lower, ['uur', 'uren', 'tijd', 'tijdregistratie', 'gewerkt'])) {
    const all = data.tijdregistraties
    if (all.length === 0) {
      return { text: `Er zijn geen uren geregistreerd voor projecten van ${data.klantNaam}.` }
    }
    const totaalMinuten = all.reduce((s, t) => s + (t.duur_minuten || 0), 0)
    const totaalUren = totaalMinuten / 60
    return {
      text: `**${totaalUren.toFixed(1)} uur** geregistreerd voor ${data.klantNaam} over **${all.length} registratie${all.length !== 1 ? 's' : ''}**.`,
      data: {
        type: 'metrics',
        metrics: [
          { label: 'Totaal uren', value: totaalUren.toFixed(1), icon: <Clock className="w-4 h-4" />, color: 'blue' },
          { label: 'Registraties', value: all.length, icon: <Calendar className="w-4 h-4" />, color: 'teal' },
        ]
      }
    }
  }

  // ── Omzet / Revenue ─────────────────────────────────────
  if (match(lower, ['omzet', 'revenue', 'inkomsten', 'verdien', 'winst', 'geld', 'financieel', 'financiën'])) {
    const betaaldeFacturen = data.facturen.filter(f => f.status === 'betaald')
    const omzet = betaaldeFacturen.reduce((s, f) => s + f.totaal, 0)
    const openstaand = data.facturen
      .filter(f => f.status === 'verzonden' || f.status === 'vervallen')
      .reduce((s, f) => s + f.totaal - (f.betaald_bedrag || 0), 0)
    const goedgekeurdeOffertes = data.offertes.filter(o => o.status === 'goedgekeurd')
    const pipeline = data.offertes
      .filter(o => o.status === 'verzonden' || o.status === 'bekeken')
      .reduce((s, o) => s + o.totaal, 0)

    return {
      text: `**Financieel overzicht voor ${data.klantNaam}:**\n• Omzet (betaald): **${eur(omzet)}**\n• Goedgekeurd: **${eur(goedgekeurdeOffertes.reduce((s, o) => s + o.totaal, 0))}**\n• Openstaand: **${eur(openstaand)}**\n• Pipeline: **${eur(pipeline)}**`,
      data: {
        type: 'metrics',
        metrics: [
          { label: 'Omzet', value: eur(omzet), icon: <Euro className="w-4 h-4" />, color: 'emerald', trend: 'up' },
          { label: 'Openstaand', value: eur(openstaand), icon: <Receipt className="w-4 h-4" />, color: 'amber' },
          { label: 'Pipeline', value: eur(pipeline), icon: <BarChart3 className="w-4 h-4" />, color: 'blue' },
        ]
      }
    }
  }

  // ── Geïmporteerde data / activiteiten ───────────────────
  if (match(lower, ['import', 'geïmporteerd', 'historie', 'activiteit', 'geschiedenis', 'data'])) {
    const acts = data.activiteiten
    if (acts.length === 0) {
      return { text: `Er is geen geïmporteerde data voor ${data.klantNaam}. Je kunt data importeren via Instellingen > Import.` }
    }
    const projActs = acts.filter(a => a.type === 'project')
    const offActs = acts.filter(a => a.type === 'offerte')
    const totBedrag = acts.reduce((s, a) => s + (a.bedrag || 0), 0)

    return {
      text: `**Geïmporteerde data voor ${data.klantNaam}:**\n• ${projActs.length} projecten\n• ${offActs.length} offertes\n• Totale waarde: ${eur(totBedrag)}`,
      data: {
        type: 'table',
        headers: ['Type', 'Omschrijving', 'Datum', 'Bedrag', 'Status'],
        rows: acts.map(a => ({
          cells: [a.type, a.omschrijving || '—', fmtDate(a.datum), a.bedrag ? eur(a.bedrag) : '—', a.status || '—']
        }))
      }
    }
  }

  // ── Overzicht / samenvatting ────────────────────────────
  if (match(lower, ['overzicht', 'samenvatting', 'status', 'alles', 'totaal', 'dashboard', 'hoe'])) {
    const totaalOmzet = data.facturen
      .filter(f => f.status === 'betaald')
      .reduce((s, f) => s + f.totaal, 0)
    const openstaand = data.facturen
      .filter(f => f.status === 'verzonden' || f.status === 'vervallen')
      .reduce((s, f) => s + f.totaal - (f.betaald_bedrag || 0), 0)

    return {
      text: `**Overzicht ${data.klantNaam}:**\n• ${data.projecten.length} project${data.projecten.length !== 1 ? 'en' : ''} (${data.projecten.filter(p => p.status === 'actief').length} actief)\n• ${data.offertes.length} offerte${data.offertes.length !== 1 ? 's' : ''}\n• ${data.facturen.length} factu${data.facturen.length !== 1 ? 'ren' : 'ur'}\n• ${data.deals.length} deal${data.deals.length !== 1 ? 's' : ''}\n• Omzet: ${eur(totaalOmzet)} | Openstaand: ${eur(openstaand)}`,
      data: {
        type: 'metrics',
        metrics: [
          { label: 'Projecten', value: data.projecten.length, sub: `${data.projecten.filter(p => p.status === 'actief').length} actief`, icon: <FolderKanban className="w-4 h-4" />, color: 'blue' },
          { label: 'Offertes', value: data.offertes.length, sub: eur(data.offertes.reduce((s, o) => s + o.totaal, 0)), icon: <FileText className="w-4 h-4" />, color: 'teal' },
          { label: 'Omzet', value: eur(totaalOmzet), icon: <Euro className="w-4 h-4" />, color: 'emerald', trend: 'up' },
          { label: 'Openstaand', value: eur(openstaand), icon: <Receipt className="w-4 h-4" />, color: 'amber' },
        ]
      }
    }
  }

  // ── Groet ───────────────────────────────────────────────
  if (match(lower, ['hallo', 'hey', 'hoi', 'goedemorgen', 'goedemiddag', 'goedeavond', 'hi'])) {
    return {
      text: `Hallo! Ik kan je alles vertellen over **${data.klantNaam}**.\n\n• ${data.projecten.length} projecten\n• ${data.offertes.length} offertes\n• ${data.facturen.length} facturen\n${data.activiteiten.length > 0 ? `• ${data.activiteiten.length} geïmporteerde activiteiten\n` : ''}\nWat wil je weten?`,
    }
  }

  // ── Default fallback ────────────────────────────────────
  return {
    text: `Ik begrijp je vraag niet helemaal. Je kunt vragen stellen over **${data.klantNaam}**, zoals:\n\n• "Welke projecten hebben we gedaan?"\n• "Laat de offertes zien"\n• "Zijn er openstaande facturen?"\n• "Geef een financieel overzicht"\n• "Welke deals lopen er?"\n• "Hoeveel uur hebben we gewerkt?"\n• "Toon geïmporteerde data"`,
  }
}

// ─── Color helper ────────────────────────────────────────────────────

function getMetricColors(color: string) {
  const map: Record<string, { bg: string; text: string; icon: string }> = {
    blue: { bg: 'bg-primary/10 dark:bg-primary/20', text: 'text-accent dark:text-wm-light', icon: 'text-primary' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', icon: 'text-emerald-500' },
    teal: { bg: 'bg-teal-50 dark:bg-teal-950/40', text: 'text-teal-700 dark:text-teal-300', icon: 'text-teal-500' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', icon: 'text-amber-500' },
    red: { bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-300', icon: 'text-red-500' },
    gray: { bg: 'bg-background dark:bg-foreground/80/40', text: 'text-foreground/70 dark:text-muted-foreground/50', icon: 'text-muted-foreground' },
  }
  return map[color] || map.gray
}

// ─── Suggestions ─────────────────────────────────────────────────────

const klantSuggestions = [
  { label: 'Overzicht', icon: <BarChart3 className="w-3 h-3" /> },
  { label: 'Welke projecten hebben we gedaan?', icon: <FolderKanban className="w-3 h-3" /> },
  { label: 'Laat de offertes zien', icon: <FileText className="w-3 h-3" /> },
  { label: 'Openstaande facturen', icon: <Receipt className="w-3 h-3" /> },
  { label: 'Financieel overzicht', icon: <Euro className="w-3 h-3" /> },
  { label: 'Geïmporteerde data', icon: <Calendar className="w-3 h-3" /> },
]

// ═══════════════════════════════════════════════════════════════════════
// ─── Main Component ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

interface KlantAIChatProps {
  klantId: string
  klantNaam: string
  projecten: Project[]
  offertes: Offerte[]
  facturen: Factuur[]
  deals: Deal[]
  tijdregistraties: Tijdregistratie[]
}

export function KlantAIChat({ klantId, klantNaam, projecten, offertes, facturen, deals, tijdregistraties }: KlantAIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const activiteiten = useMemo(() => getActiviteiten(klantId), [klantId])

  const klantData = useMemo<KlantData>(() => ({
    klantNaam,
    projecten,
    offertes,
    facturen,
    deals,
    tijdregistraties,
    activiteiten,
  }), [klantNaam, projecten, offertes, facturen, deals, tijdregistraties, activiteiten])

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

    const result = processKlantQuery(trimmed, klantData)

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
  }, [klantData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSend(input)
  }

  // Quick stats
  const stats = useMemo(() => {
    const omzet = facturen.filter(f => f.status === 'betaald').reduce((s, f) => s + f.totaal, 0)
    const openstaand = facturen
      .filter(f => f.status === 'verzonden' || f.status === 'vervallen')
      .reduce((s, f) => s + f.totaal - (f.betaald_bedrag || 0), 0)
    return { projecten: projecten.length, offertes: offertes.length, omzet, openstaand }
  }, [projecten, offertes, facturen])

  return (
    <div className="flex flex-col" style={{ minHeight: '500px', maxHeight: '70vh' }}>
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-gradient-to-br from-accent to-primary rounded-xl shadow-lg shadow-primary/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">AI Assistent</h3>
            <p className="text-xs text-muted-foreground">
              Stel vragen over {klantNaam}
            </p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-2">
          <MiniStat label="Projecten" value={stats.projecten} color="blue" icon={<FolderKanban className="w-3.5 h-3.5" />} />
          <MiniStat label="Offertes" value={stats.offertes} color="teal" icon={<FileText className="w-3.5 h-3.5" />} />
          <MiniStat label="Omzet" value={eur(stats.omzet)} color="emerald" icon={<Euro className="w-3.5 h-3.5" />} />
          <MiniStat label="Open" value={eur(stats.openstaand)} color="amber" icon={<Receipt className="w-3.5 h-3.5" />} />
        </div>
      </div>

      {/* Chat area */}
      <ScrollArea className="flex-1 px-5">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-wm-pale/30 to-primary/10 dark:from-[#4A442D]/40 dark:to-accent/40 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Vraag iets over {klantNaam}</p>
            <p className="text-xs text-muted-foreground mb-5 text-center max-w-xs">
              Projecten, offertes, facturen, uren en geïmporteerde data.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {klantSuggestions.map(s => (
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
          <div className="space-y-4 py-3">
            {messages.map(msg => (
              <div key={msg.id}>
                {msg.rol === 'user' ? (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] bg-accent text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm">
                      {msg.bericht}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="w-3 h-3 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground leading-relaxed">
                          <FormattedText text={msg.bericht} />
                        </div>
                      </div>
                    </div>

                    {msg.data && (
                      <div className="ml-8">
                        {msg.data.type === 'metrics' && msg.data.metrics && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {msg.data.metrics.map((m, i) => {
                              const c = getMetricColors(m.color)
                              return (
                                <div key={i} className={cn('rounded-lg px-3 py-2', c.bg)}>
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className="text-[10px] font-medium text-muted-foreground">{m.label}</span>
                                    {m.trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-500" />}
                                    {m.trend === 'down' && <TrendingDown className="w-3 h-3 text-red-500" />}
                                  </div>
                                  <p className={cn('text-sm font-bold', c.text)}>{m.value}</p>
                                  {m.sub && <p className="text-[10px] text-muted-foreground">{m.sub}</p>}
                                </div>
                              )
                            })}
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

      {/* Input */}
      <div className="flex-shrink-0 px-5 py-3 border-t">
        {messages.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {klantSuggestions.slice(0, 3).map(s => (
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
            placeholder={`Vraag iets over ${klantNaam}...`}
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

function MiniStat({ label, value, color, icon }: {
  label: string; value: string | number; color: string; icon: React.ReactNode
}) {
  const c = getMetricColors(color)
  return (
    <div className={cn('rounded-lg px-2.5 py-2', c.bg)}>
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className={c.icon}>{icon}</span>
        <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <p className={cn('text-sm font-bold', c.text)}>{value}</p>
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
