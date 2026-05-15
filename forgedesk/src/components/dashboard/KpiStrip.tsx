import { useEffect, useMemo, useState } from 'react'
import { FileText, CheckCircle2, Sparkles } from 'lucide-react'
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

const DOEN_VIBES = [
  'Eén ding tegelijk.',
  'Begin gewoon. De rest komt.',
  'Niet praten, doen.',
  'Een dag goed begonnen is half gedaan.',
  'Wie wat doet, doet wat.',
  'Klein beginnen, groot eindigen.',
  'Liever klaar dan perfect.',
  'Plannen is makkelijk, doen telt.',
  'Geen klus te klein om af te maken.',
  'Vandaag iets afronden is morgen ruimte.',
  'Werk met aandacht, dan klopt het.',
  'Niet wachten op morgen.',
  'Klanten merken het verschil.',
  'Eén goeie offerte is drie warme leads.',
  'Vakwerk laat zich zien.',
  'Geen dag zonder iets gedaan.',
  'Helder werk, blije klant.',
  'Vandaag is een doen-dag.',
  'Doe wat het verschil maakt.',
  'Eerst de hamer, dan de bel.',
  'Mooi werk maakt zichzelf zichtbaar.',
  'Stap voor stap komt het verst.',
  'Klein gebaar, groot effect.',
  'Beter eerlijk, dan handig.',
  'Vakwerk is voelbaar.',
]

function DoenVibeCard() {
  const [idx, setIdx] = useState(0)
  const [bumping, setBumping] = useState(false)

  useEffect(() => {
    const today = new Date()
    const start = new Date(today.getFullYear(), 0, 0).getTime()
    const dayOfYear = Math.floor((today.getTime() - start) / 86400000)
    setIdx(dayOfYear % DOEN_VIBES.length)
  }, [])

  const next = () => {
    setBumping(true)
    setIdx(i => (i + 1) % DOEN_VIBES.length)
    setTimeout(() => setBumping(false), 220)
  }

  return (
    <button
      type="button"
      onClick={next}
      className="group rounded-xl p-5 flex flex-col gap-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F15025]/30 focus-visible:ring-offset-2"
      style={{
        background: 'linear-gradient(135deg, #FCFAF5 0%, #F5EFE3 100%)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}
      aria-label="Volgende doen-vibe"
    >
      <div className="flex items-start justify-between">
        <span
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #FDE8E4 0%, #FBD7CC 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
          }}
        >
          <Sparkles className="w-4 h-4" style={{ color: '#F15025' }} />
        </span>
        <span className="text-[11px] uppercase tracking-wider text-[#9B9B95] font-semibold">
          doen<span className="text-[#F15025]">.</span>
        </span>
      </div>

      <p
        className={`flex-1 text-[18px] leading-[1.25] text-[#1A1A1A] transition-all duration-200 ${bumping ? 'opacity-0 translate-y-0.5' : 'opacity-100 translate-y-0'}`}
        style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
      >
        {DOEN_VIBES[idx]}
      </p>

      <div className="flex items-end justify-between gap-3 mt-auto">
        <span className="text-[11px] text-[#9B9B95] opacity-0 group-hover:opacity-100 transition-opacity">
          Klik voor de volgende
        </span>
        <span className="text-[10px] font-mono text-[#9B9B95]">
          {String(idx + 1).padStart(2, '0')}/{String(DOEN_VIBES.length).padStart(2, '0')}
        </span>
      </div>
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
            className="rounded-xl bg-white p-5 flex flex-col gap-3"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
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
