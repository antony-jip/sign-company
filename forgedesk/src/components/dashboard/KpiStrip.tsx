import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FileText,
  CheckCircle2,
  Sparkles,
  Receipt,
  Wrench,
  Mail,
  Users,
  Cloud,
  Bot,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react'
import { useDashboardData } from '@/contexts/DashboardDataContext'
import { formatCurrency } from '@/lib/utils'

interface Kpi {
  label: string
  bedrag: number
  sub: string
  icon: typeof FileText
  accent: string
  bg: string
  subColor: string
  urgent: boolean
}

type FactCategory = 'ai' | 'finance' | 'planning' | 'sales' | 'vibe'

interface DoenFact {
  cat: FactCategory
  text: string
}

const CAT_META: Record<FactCategory, { icon: LucideIcon; color: string; bg: string; label: string }> = {
  ai:       { icon: Bot,         color: '#6A5A8A', bg: 'linear-gradient(135deg, #EDE8F4 0%, #DDD3EA 100%)', label: 'Daan AI' },
  finance:  { icon: Receipt,     color: '#3A7D52', bg: 'linear-gradient(135deg, #E8F2EC 0%, #D3E8DC 100%)', label: 'Geld' },
  planning: { icon: Wrench,      color: '#F15025', bg: 'linear-gradient(135deg, #FDE8E4 0%, #FBD7CC 100%)', label: 'Planning' },
  sales:    { icon: Mail,        color: '#1A535C', bg: 'linear-gradient(135deg, rgba(26,83,92,0.10) 0%, rgba(26,83,92,0.20) 100%)', label: 'Sales' },
  vibe:     { icon: Sparkles,    color: '#8A7A4A', bg: 'linear-gradient(135deg, #F5F2E8 0%, #EDE6CE 100%)', label: 'Vibe' },
}

const DOEN_FACTS: DoenFact[] = [
  // ── AI / Daan
  { cat: 'ai', text: 'Daan vat hele e-mail-threads samen in twee zinnen. Niet doen — dit dus.' },
  { cat: 'ai', text: 'Klant niet thuis? Daan schrijft de follow-up. Jij hoeft alleen op verzenden.' },
  { cat: 'ai', text: 'Daan kent je schrijfstijl. Mail klinkt als jij, maar dan sneller. Doen ze.' },
  { cat: 'ai', text: 'Tekst even in \'t Engels? Selecteer, vertaal, weg. Klaar.' },
  { cat: 'ai', text: 'Daan kent je klanten, offertes en projecten. Vraag maar raak.' },
  { cat: 'ai', text: 'Welkomstmail, status-update, social post — Daan tekent \'m voor.' },
  { cat: 'ai', text: 'CSV erin slepen, Daan begrijpt \'m. Doe je zo.' },
  // ── Finance / Inkoop
  { cat: 'finance', text: 'Sleep een leveranciers-PDF erin. OCR pakt regels en BTW. Klaar.' },
  { cat: 'finance', text: 'Inkoopfacturen worden vanuit je inbox automatisch opgehaald. Niet meer doen.' },
  { cat: 'finance', text: 'Goedkeurings-flow in twee klikken. Of bulk. Doe je zo.' },
  { cat: 'finance', text: 'Exact-sync regelt de boekhouding. Doen we voor je.' },
  { cat: 'finance', text: 'Mollie-betaallink op elke factuur. iDEAL? Doen.' },
  { cat: 'finance', text: 'Voorschot en eindafrekening — automatisch verrekend. Niks dubbel doen.' },
  { cat: 'finance', text: 'Creditfactuur? Eén klik, hele historie erbij. Gedaan.' },
  // ── Planning / Montage
  { cat: 'planning', text: 'Sleep een montage naar morgen — de planning schikt zich. Doen.' },
  { cat: 'planning', text: 'Twee monteurs dubbel ingepland? doen. signaleert vóór \'t fout gaat.' },
  { cat: 'planning', text: 'Weerbericht per dag in de planning. Regent \'t? Schuif door.' },
  { cat: 'planning', text: 'Montage afgerond? Werkbon met één klik — foto\'s en handtekening erbij.' },
  { cat: 'planning', text: 'Swimlanes per rol: monteurs, productie, verkoop. Overzicht doen.' },
  { cat: 'planning', text: 'Status van gepland tot afgerond in vijf stappen. Volg je zo.' },
  // ── Sales / Klant
  { cat: 'sales', text: 'Klant-portaal: bekijken, akkoord, wijziging vragen. Allemaal daar.' },
  { cat: 'sales', text: 'Akkoord op offerte? Project draait automatisch op. Niks meer doen.' },
  { cat: 'sales', text: 'Wacht-op-reactie-vlag laat geen offerte vergeten. Doen ze.' },
  { cat: 'sales', text: 'Email-threading per klant. Hele historie in één scherm.' },
  { cat: 'sales', text: 'Deals-pipeline met kanban-bord. Verschuiven en doen.' },
  { cat: 'sales', text: 'Klant uploadt tekening via portaal — direct in \'t project.' },
  { cat: 'sales', text: 'Akkoord op de telefoon, handtekening met de vinger. Gedaan.' },
  // ── Vibes
  { cat: 'vibe', text: 'Eén ding tegelijk.' },
  { cat: 'vibe', text: 'Begin gewoon. De rest komt.' },
  { cat: 'vibe', text: 'Liever klaar dan perfect.' },
  { cat: 'vibe', text: 'Niet praten, doen.' },
  { cat: 'vibe', text: 'Een dag goed begonnen is half gedaan.' },
  { cat: 'vibe', text: 'Vandaag is een doen-dag.' },
]

const AUTO_CYCLE_MS = 9000

function DoenVibeCard() {
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const tickRef = useRef<number>(0)

  // Deterministische start per dag
  useEffect(() => {
    const today = new Date()
    const start = new Date(today.getFullYear(), 0, 0).getTime()
    const dayOfYear = Math.floor((today.getTime() - start) / 86400000)
    setIdx(dayOfYear % DOEN_FACTS.length)
  }, [])

  // Auto-cycle (gepauzeerd bij hover/focus)
  useEffect(() => {
    if (paused) return
    const t = window.setInterval(() => {
      setIdx(i => (i + 1) % DOEN_FACTS.length)
    }, AUTO_CYCLE_MS)
    return () => window.clearInterval(t)
  }, [paused])

  const next = () => {
    tickRef.current += 1
    setIdx(i => (i + 1) % DOEN_FACTS.length)
  }

  const fact = DOEN_FACTS[idx]
  const meta = CAT_META[fact.cat]
  const Icon = meta.icon

  return (
    <button
      type="button"
      onClick={next}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="group relative rounded-xl p-5 flex flex-col gap-3 text-left transition-all overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F15025]/30 focus-visible:ring-offset-2"
      style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #FAF7F3 100%)',
        border: '1px solid rgba(26,83,92,0.08)',
        boxShadow: '0 1px 2px rgba(20,62,71,0.04), 0 8px 24px rgba(20,62,71,0.025)',
        minHeight: 168,
      }}
      aria-label={`${meta.label} — klik voor volgende doen-fact`}
    >
      {/* Decoratief Sparkles drift-bg, héél subtiel */}
      <span aria-hidden className="absolute -top-3 -right-3 opacity-[0.07] pointer-events-none">
        <Icon className="w-24 h-24" style={{ color: meta.color }} strokeWidth={1.2} />
      </span>

      <div className="relative flex items-start justify-between">
        <span
          key={`chip-${idx}`}
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0 doen-fact-chip"
          style={{
            background: meta.bg,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
          }}
        >
          <Icon className="w-4 h-4" style={{ color: meta.color }} />
        </span>
        <span className="text-[11px] uppercase tracking-wider text-[#9B9B95] font-semibold">
          doen<span className="text-[#F15025]">.</span>
        </span>
      </div>

      <p
        key={`text-${idx}`}
        className="relative flex-1 text-[16px] leading-[1.3] text-[#1A1A1A] doen-fact-text"
        style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
      >
        {fact.text}
      </p>

      <div className="relative flex items-end justify-between gap-3 mt-auto">
        <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#9B9B95] font-semibold">
          {meta.label}
          <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
        </span>
        <span className="text-[10px] font-mono text-[#9B9B95]">
          {String(idx + 1).padStart(2, '0')}/{String(DOEN_FACTS.length).padStart(2, '0')}
        </span>
      </div>

      {/* Auto-cycle progress bar */}
      <span
        aria-hidden
        key={`bar-${idx}-${paused ? 'p' : 'r'}`}
        className="absolute left-0 bottom-0 h-[2px] doen-fact-bar"
        style={{
          background: `linear-gradient(90deg, ${meta.color}40 0%, ${meta.color} 100%)`,
          animationDuration: `${AUTO_CYCLE_MS}ms`,
          animationPlayState: paused ? 'paused' : 'running',
        }}
      />
    </button>
  )
}

function startOfWeek(d: Date): Date {
  const dt = new Date(d)
  const day = dt.getDay()
  const diff = day === 0 ? -6 : 1 - day
  dt.setDate(dt.getDate() + diff)
  dt.setHours(0, 0, 0, 0)
  return dt
}

function endOfWeek(d: Date): Date {
  const s = startOfWeek(d)
  s.setDate(s.getDate() + 7)
  return s
}

function Sparkline({ color, urgent }: { color: string; urgent: boolean }) {
  const heights = urgent ? [3, 5, 4, 7, 8, 10, 12] : [4, 6, 5, 8, 7, 9, 11]
  return (
    <div className="flex items-end gap-[2px] h-3" aria-hidden>
      {heights.map((h, i) => (
        <span
          key={i}
          className="w-[3px] rounded-[1px]"
          style={{ height: `${h}px`, backgroundColor: color, opacity: 0.3 + (i / heights.length) * 0.7 }}
        />
      ))}
    </div>
  )
}

export function KpiStrip() {
  const { facturen, offertes, montages } = useDashboardData()

  const kpis = useMemo<Kpi[]>(() => {
    const now = new Date()
    const weekStart = startOfWeek(now)
    const weekEnd = endOfWeek(now)

    const openStatussen = new Set(['verzonden', 'bekeken', 'wijziging_gevraagd'])
    const pijplijn = offertes.filter(o => openStatussen.has(o.status) && o.verstuurd_op)
    const pijplijnBedrag = pijplijn.reduce((s, o) => s + (o.totaal || 0), 0)

    const montagesWeek = montages.filter(m => {
      const d = new Date(m.datum)
      return d >= weekStart && d < weekEnd
    })
    const facturenWeek = facturen.filter(f => {
      const d = new Date(f.factuurdatum || f.created_at)
      return d >= weekStart && d < weekEnd
    })
    const weekBedrag = facturenWeek.reduce((s, f) => s + (f.totaal || 0), 0)

    return [
      {
        label: 'In pijplijn',
        bedrag: pijplijnBedrag,
        sub: `${pijplijn.length} ${pijplijn.length === 1 ? 'offerte' : 'offertes'}`,
        icon: FileText,
        accent: '#1A535C',
        bg: 'rgba(26,83,92,0.08)',
        subColor: '#6B6B66',
        urgent: false,
      },
      {
        label: 'Deze week',
        bedrag: weekBedrag,
        sub: `${montagesWeek.length} ${montagesWeek.length === 1 ? 'montage' : 'montages'}`,
        icon: CheckCircle2,
        accent: '#3A7D52',
        bg: '#E8F2EC',
        subColor: '#6B6B66',
        urgent: false,
      },
    ]
  }, [facturen, offertes, montages])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <DoenVibeCard />
      {kpis.map(kpi => {
        const Icon = kpi.icon
        return (
          <div
            key={kpi.label}
            className="rounded-xl p-5 flex flex-col gap-3"
            style={{
              background: 'linear-gradient(180deg, #FFFFFF 0%, #F6F8F9 100%)',
              border: '1px solid rgba(26,83,92,0.08)',
              boxShadow: '0 1px 2px rgba(20,62,71,0.04), 0 8px 24px rgba(20,62,71,0.025)',
            }}
          >
            <div className="flex items-start justify-between">
              <span
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0"
                style={{ backgroundColor: kpi.bg }}
              >
                <Icon className="w-4 h-4" style={{ color: kpi.accent }} />
              </span>
              <span className="text-[11px] uppercase tracking-wider text-[#9B9B95] font-semibold">
                {kpi.label}
              </span>
            </div>

            <div>
              <p className="font-heading font-bold text-[28px] leading-[1.1] text-[#1A1A1A]">
                <span className="text-[18px] text-[#9B9B95] mr-1">€</span>
                <span className="font-mono">{formatCurrency(kpi.bedrag).replace(/^€\s*/, '')}</span>
              </p>
            </div>

            <div className="flex items-end justify-between gap-3">
              <span className="text-[12px]" style={{ color: kpi.subColor }}>
                {kpi.sub}
              </span>
              <Sparkline color={kpi.accent} urgent={kpi.urgent} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
