import { useMemo } from 'react'
import { AlertTriangle, FileText, CheckCircle2 } from 'lucide-react'
import { useDashboardData } from '@/contexts/DashboardDataContext'
import { formatCurrency } from '@/lib/utils'

interface Kpi {
  label: string
  bedrag: number
  sub: string
  icon: typeof AlertTriangle
  accent: string
  bg: string
  subColor: string
  urgent: boolean
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

    const verlopen = facturen.filter(
      f => (f.status === 'verzonden' || f.status === 'vervallen') && new Date(f.vervaldatum) < now,
    )
    const verlopenBedrag = verlopen.reduce((s, f) => s + (f.totaal - f.betaald_bedrag), 0)
    const verlopenDagen = verlopen.reduce((max, f) => {
      const d = Math.floor((now.getTime() - new Date(f.vervaldatum).getTime()) / (1000 * 60 * 60 * 24))
      return Math.max(max, d)
    }, 0)

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
        label: 'Verlopen',
        bedrag: verlopenBedrag,
        sub: `${verlopen.length} ${verlopen.length === 1 ? 'factuur' : 'facturen'} · ${verlopenDagen}d`,
        icon: AlertTriangle,
        accent: '#F15025',
        bg: '#FDE8E4',
        subColor: '#F15025',
        urgent: true,
      },
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
      {kpis.map(kpi => {
        const Icon = kpi.icon
        const isVerlopen = kpi.label === 'Verlopen'
        return (
          <div
            key={kpi.label}
            className="rounded-xl bg-white p-5 flex flex-col gap-3"
            style={{
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              background: isVerlopen
                ? 'linear-gradient(135deg, #FFF8F5 0%, #FDECE6 100%)'
                : '#FFFFFF',
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
