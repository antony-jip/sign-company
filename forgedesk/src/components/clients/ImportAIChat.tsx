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
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAllActiviteiten } from '@/services/importService'
import { getKlanten, getProjecten, getOffertes, getFacturen } from '@/services/supabaseService'
import type { Klant, Project, Offerte, Factuur, KlantActiviteit } from '@/types'

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

// ─── Helpers ─────────────────────────────────────────────────────────

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
  }
  return labels[status] || status
}

function match(input: string, keywords: string[]): boolean {
  return keywords.some(k => input.includes(k))
}

// ─── Query engine (all data) ─────────────────────────────────────────

interface AllData {
  klanten: Klant[]
  projecten: Project[]
  offertes: Offerte[]
  facturen: Factuur[]
  activiteiten: KlantActiviteit[]
}

function findKlantNaam(q: string, klanten: Klant[], activiteiten: KlantActiviteit[]): string | null {
  const lower = q.toLowerCase()
  // Check real klanten
  for (const k of klanten) {
    if (k.bedrijfsnaam && lower.includes(k.bedrijfsnaam.toLowerCase())) return k.bedrijfsnaam
  }
  // Check imported activiteiten klant_naam
  const namen = new Set(activiteiten.map(a => a.klant_naam).filter(Boolean))
  for (const naam of namen) {
    if (naam && lower.includes(naam.toLowerCase())) return naam
  }
  return null
}

function extractJaar(q: string): number | null {
  const m = q.match(/\b(20\d{2})\b/)
  return m ? parseInt(m[1]) : null
}

function processQuery(q: string, data: AllData): { text: string; data?: ResponseData } {
  const lower = q.toLowerCase().trim()
  const klantNaam = findKlantNaam(lower, data.klanten, data.activiteiten)
  const jaar = extractJaar(q)

  // ── Klant-specifieke vraag ────────────────────────────────
  if (klantNaam) {
    const klant = data.klanten.find(k => k.bedrijfsnaam?.toLowerCase() === klantNaam.toLowerCase())
    const klantId = klant?.id

    // Verzamel data voor deze klant
    let projecten = klantId ? data.projecten.filter(p => p.klant_id === klantId) : []
    let offertes = klantId ? data.offertes.filter(o => o.klant_id === klantId) : []
    let facturen = klantId ? data.facturen.filter(f => f.klant_id === klantId) : []
    let activiteiten = data.activiteiten.filter(a =>
      a.klant_naam?.toLowerCase() === klantNaam.toLowerCase() ||
      (klantId && a.klant_id === klantId)
    )

    // Filter op jaar als dat gevraagd is
    if (jaar) {
      const jaarStr = String(jaar)
      projecten = projecten.filter(p => p.start_datum?.startsWith(jaarStr) || p.eind_datum?.startsWith(jaarStr))
      offertes = offertes.filter(o => o.created_at?.startsWith(jaarStr))
      facturen = facturen.filter(f => f.factuurdatum?.startsWith(jaarStr))
      activiteiten = activiteiten.filter(a => a.datum?.startsWith(jaarStr))
    }

    const jaarLabel = jaar ? ` in ${jaar}` : ''

    // Combineer real + imported
    const alleItems: { type: string; omschrijving: string; datum: string; bedrag: number; status: string }[] = []

    projecten.forEach(p => alleItems.push({
      type: 'Project', omschrijving: p.naam, datum: p.start_datum || '', bedrag: p.budget || 0, status: statusLabel(p.status)
    }))
    offertes.forEach(o => alleItems.push({
      type: 'Offerte', omschrijving: o.titel || o.nummer, datum: o.created_at || '', bedrag: o.totaal, status: statusLabel(o.status)
    }))
    facturen.forEach(f => alleItems.push({
      type: 'Factuur', omschrijving: f.nummer, datum: f.factuurdatum || '', bedrag: f.totaal, status: statusLabel(f.status)
    }))
    activiteiten.forEach(a => alleItems.push({
      type: a.type || 'Activiteit', omschrijving: a.omschrijving || '—', datum: a.datum || '', bedrag: a.bedrag || 0, status: a.status || '—'
    }))

    alleItems.sort((a, b) => b.datum.localeCompare(a.datum))

    if (alleItems.length === 0) {
      return { text: `Geen data gevonden voor **${klantNaam}**${jaarLabel}.` }
    }

    const totaalBedrag = alleItems.reduce((s, i) => s + i.bedrag, 0)

    return {
      text: `**${alleItems.length} items** gevonden voor **${klantNaam}**${jaarLabel}. Totale waarde: **${eur(totaalBedrag)}**`,
      data: {
        type: 'table',
        headers: ['Type', 'Omschrijving', 'Datum', 'Bedrag', 'Status'],
        rows: alleItems.map(i => ({
          cells: [i.type, i.omschrijving, fmtDate(i.datum), i.bedrag ? eur(i.bedrag) : '—', i.status]
        }))
      }
    }
  }

  // ── Jaar-filter zonder specifieke klant ──────────────────
  if (jaar) {
    const jaarStr = String(jaar)
    const jaarAct = data.activiteiten.filter(a => a.datum?.startsWith(jaarStr))
    const jaarProj = data.projecten.filter(p => p.start_datum?.startsWith(jaarStr))
    const jaarOff = data.offertes.filter(o => o.created_at?.startsWith(jaarStr))
    const jaarFact = data.facturen.filter(f => f.factuurdatum?.startsWith(jaarStr))

    const totaal = jaarAct.reduce((s, a) => s + (a.bedrag || 0), 0) +
      jaarOff.reduce((s, o) => s + o.totaal, 0) +
      jaarFact.reduce((s, f) => s + f.totaal, 0)

    return {
      text: `**Overzicht ${jaar}:**\n• ${jaarProj.length} projecten\n• ${jaarOff.length} offertes\n• ${jaarFact.length} facturen\n• ${jaarAct.length} geïmporteerde activiteiten\n\nTotale waarde: **${eur(totaal)}**`,
      data: {
        type: 'metrics',
        metrics: [
          { label: 'Projecten', value: jaarProj.length, icon: <FolderKanban className="w-4 h-4" />, color: 'blue' },
          { label: 'Offertes', value: jaarOff.length, icon: <FileText className="w-4 h-4" />, color: 'teal' },
          { label: 'Facturen', value: jaarFact.length, icon: <Receipt className="w-4 h-4" />, color: 'amber' },
          { label: 'Waarde', value: eur(totaal), icon: <Euro className="w-4 h-4" />, color: 'emerald', trend: 'up' },
        ]
      }
    }
  }

  // ── Projecten overzicht ──────────────────────────────────
  if (match(lower, ['project', 'projecten', 'gedaan', 'gemaakt', 'werk'])) {
    const projActs = data.activiteiten.filter(a => a.type === 'project')
    const all = [...data.projecten]
    const totaal = all.reduce((s, p) => s + (p.budget || 0), 0) + projActs.reduce((s, a) => s + (a.bedrag || 0), 0)

    return {
      text: `**${all.length} projecten** in het systeem, **${projActs.length} geïmporteerde projecten**. Totale waarde: **${eur(totaal)}**`,
      data: all.length > 0 ? {
        type: 'table',
        headers: ['Project', 'Klant', 'Status', 'Budget'],
        rows: all.map(p => ({
          cells: [p.naam, p.klant_naam || '—', statusLabel(p.status), eur(p.budget || 0)]
        }))
      } : undefined
    }
  }

  // ── Offertes ─────────────────────────────────────────────
  if (match(lower, ['offerte', 'offertes', 'quote', 'aanbieding'])) {
    const all = data.offertes
    const totaal = all.reduce((s, o) => s + o.totaal, 0)

    return {
      text: `**${all.length} offertes** in het systeem, totale waarde: **${eur(totaal)}**`,
      data: all.length > 0 ? {
        type: 'table',
        headers: ['Nummer', 'Klant', 'Status', 'Bedrag'],
        rows: all.slice(0, 20).map(o => ({
          cells: [o.nummer, o.klant_naam || '—', statusLabel(o.status), eur(o.totaal)]
        }))
      } : undefined
    }
  }

  // ── Facturen ─────────────────────────────────────────────
  if (match(lower, ['factuur', 'facturen', 'betaling', 'openstaand'])) {
    const all = data.facturen
    const betaald = all.filter(f => f.status === 'betaald').reduce((s, f) => s + f.totaal, 0)
    const openstaand = all.filter(f => f.status === 'verzonden' || f.status === 'vervallen').reduce((s, f) => s + f.totaal - (f.betaald_bedrag || 0), 0)

    return {
      text: `**${all.length} facturen**: ${eur(betaald)} betaald, ${eur(openstaand)} openstaand.`,
      data: {
        type: 'metrics',
        metrics: [
          { label: 'Betaald', value: eur(betaald), icon: <Euro className="w-4 h-4" />, color: 'emerald', trend: 'up' },
          { label: 'Openstaand', value: eur(openstaand), icon: <Receipt className="w-4 h-4" />, color: 'amber' },
        ]
      }
    }
  }

  // ── Geïmporteerde data ───────────────────────────────────
  if (match(lower, ['import', 'geïmporteerd', 'data', 'activiteit'])) {
    const acts = data.activiteiten
    if (acts.length === 0) {
      return { text: 'Er is nog geen data geïmporteerd. Upload een CSV bestand om te beginnen.' }
    }
    const perKlant = new Map<string, number>()
    acts.forEach(a => {
      const naam = a.klant_naam || 'Onbekend'
      perKlant.set(naam, (perKlant.get(naam) || 0) + 1)
    })
    const totBedrag = acts.reduce((s, a) => s + (a.bedrag || 0), 0)

    return {
      text: `**${acts.length} geïmporteerde activiteiten** voor **${perKlant.size} klanten**. Totale waarde: **${eur(totBedrag)}**`,
      data: {
        type: 'table',
        headers: ['Klant', 'Aantal', 'Totaal bedrag'],
        rows: Array.from(perKlant.entries()).map(([naam, aantal]) => {
          const bedrag = acts.filter(a => a.klant_naam === naam).reduce((s, a) => s + (a.bedrag || 0), 0)
          return { cells: [naam, String(aantal), eur(bedrag)] }
        }).sort((a, b) => b.cells[1].localeCompare(a.cells[1]))
      }
    }
  }

  // ── Overzicht ────────────────────────────────────────────
  if (match(lower, ['overzicht', 'samenvatting', 'status', 'alles', 'totaal', 'dashboard'])) {
    const omzet = data.facturen.filter(f => f.status === 'betaald').reduce((s, f) => s + f.totaal, 0)
    const openstaand = data.facturen.filter(f => f.status === 'verzonden' || f.status === 'vervallen').reduce((s, f) => s + f.totaal - (f.betaald_bedrag || 0), 0)

    return {
      text: `**Totaal overzicht:**\n• ${data.klanten.length} klanten\n• ${data.projecten.length} projecten\n• ${data.offertes.length} offertes\n• ${data.facturen.length} facturen\n• ${data.activiteiten.length} geïmporteerde activiteiten\n\nOmzet: **${eur(omzet)}** | Openstaand: **${eur(openstaand)}**`,
      data: {
        type: 'metrics',
        metrics: [
          { label: 'Klanten', value: data.klanten.length, icon: <Search className="w-4 h-4" />, color: 'blue' },
          { label: 'Projecten', value: data.projecten.length, icon: <FolderKanban className="w-4 h-4" />, color: 'teal' },
          { label: 'Omzet', value: eur(omzet), icon: <Euro className="w-4 h-4" />, color: 'emerald', trend: 'up' },
          { label: 'Openstaand', value: eur(openstaand), icon: <Receipt className="w-4 h-4" />, color: 'amber' },
        ]
      }
    }
  }

  // ── Groet ────────────────────────────────────────────────
  if (match(lower, ['hallo', 'hey', 'hoi', 'goedemorgen', 'goedemiddag', 'hi'])) {
    return {
      text: `Hallo! Ik kan al je klantdata doorzoeken.\n\n• ${data.klanten.length} klanten\n• ${data.activiteiten.length} geïmporteerde activiteiten\n\nVraag bijvoorbeeld: "Wat hebben we voor [klantnaam] in 2023 gedaan?"`,
    }
  }

  // ── Fallback ─────────────────────────────────────────────
  return {
    text: `Ik begrijp je vraag niet helemaal. Probeer het met een klantnaam erbij, zoals:\n\n• "Wat hebben we voor Renolit in 2023 gedaan?"\n• "Laat alle projecten zien"\n• "Overzicht facturen"\n• "Geïmporteerde data"\n• "Overzicht 2024"`,
  }
}

// ─── Color helper ────────────────────────────────────────────────────

function getMetricColors(color: string) {
  const map: Record<string, { bg: string; text: string; icon: string }> = {
    blue: { bg: 'bg-primary/10 dark:bg-primary/20', text: 'text-accent dark:text-wm-light', icon: 'text-primary' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', icon: 'text-emerald-500' },
    teal: { bg: 'bg-teal-50 dark:bg-teal-950/40', text: 'text-teal-700 dark:text-teal-300', icon: 'text-teal-500' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', icon: 'text-amber-500' },
    gray: { bg: 'bg-background dark:bg-foreground/80/40', text: 'text-foreground/70 dark:text-muted-foreground/50', icon: 'text-muted-foreground' },
  }
  return map[color] || map.gray
}

// ─── Suggestions ─────────────────────────────────────────────────────

const suggestions = [
  { label: 'Totaal overzicht', icon: <BarChart3 className="w-3 h-3" /> },
  { label: 'Alle projecten', icon: <FolderKanban className="w-3 h-3" /> },
  { label: 'Geïmporteerde data', icon: <Calendar className="w-3 h-3" /> },
  { label: 'Openstaande facturen', icon: <Receipt className="w-3 h-3" /> },
]

// ═══════════════════════════════════════════════════════════════════════
// ─── Main Component ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

export function ImportAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [allData, setAllData] = useState<AllData>({
    klanten: [], projecten: [], offertes: [], facturen: [], activiteiten: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getKlanten().catch(() => []),
      getProjecten().catch(() => []),
      getOffertes().catch(() => []),
      getFacturen().catch(() => []),
    ]).then(([klanten, projecten, offertes, facturen]) => {
      if (cancelled) return
      const activiteiten = getAllActiviteiten()
      setAllData({ klanten, projecten, offertes, facturen, activiteiten })
      setIsLoading(false)
    })
    return () => { cancelled = true }
  }, [])

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

    const result = processQuery(trimmed, allData)

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
  }, [allData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSend(input)
  }

  const stats = useMemo(() => ({
    klanten: allData.klanten.length,
    projecten: allData.projecten.length,
    activiteiten: allData.activiteiten.length,
    omzet: allData.facturen.filter(f => f.status === 'betaald').reduce((s, f) => s + f.totaal, 0),
  }), [allData])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ minHeight: '400px', maxHeight: '60vh' }}>
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-gradient-to-br from-accent to-primary rounded-xl shadow-lg shadow-primary/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Data Assistent</h3>
            <p className="text-xs text-muted-foreground">
              Doorzoek al je klant- en projectdata
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <MiniStat label="Klanten" value={stats.klanten} color="blue" icon={<Search className="w-3.5 h-3.5" />} />
          <MiniStat label="Projecten" value={stats.projecten} color="teal" icon={<FolderKanban className="w-3.5 h-3.5" />} />
          <MiniStat label="Geïmporteerd" value={stats.activiteiten} color="amber" icon={<Calendar className="w-3.5 h-3.5" />} />
          <MiniStat label="Omzet" value={eur(stats.omzet)} color="emerald" icon={<Euro className="w-3.5 h-3.5" />} />
        </div>
      </div>

      {/* Chat area */}
      <ScrollArea className="flex-1 px-5">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-wm-pale/30 to-primary/10 dark:from-[#4A442D]/40 dark:to-accent/40 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Doorzoek je klantdata</p>
            <p className="text-xs text-muted-foreground mb-5 text-center max-w-xs">
              Vraag naar klanten, projecten, offertes en geïmporteerde data.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
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
            {suggestions.slice(0, 3).map(s => (
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
            placeholder="Bijv. &quot;Wat hebben we voor Renolit in 2023 gedaan?&quot;"
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
