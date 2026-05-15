import { useMemo } from 'react'
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import { useDashboardData } from '@/contexts/DashboardDataContext'

const DAG_LABELS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']

const SERIES = [
  { key: 'montages', label: 'Montages', color: '#F15025' },
  { key: 'offertes', label: 'Offertes', color: '#1A535C' },
  { key: 'taken', label: 'Taken', color: '#C4A463' },
] as const

function startOfWeek(d: Date): Date {
  const dt = new Date(d)
  const day = dt.getDay()
  const diff = day === 0 ? -6 : 1 - day
  dt.setDate(dt.getDate() + diff)
  dt.setHours(0, 0, 0, 0)
  return dt
}

function isoWeekNumber(d: Date): number {
  const target = new Date(d.valueOf())
  const dayNr = (d.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNr + 3)
  const firstThursday = target.valueOf()
  target.setMonth(0, 1)
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7)
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000)
}

function dayIndex(d: Date, weekStart: Date): number {
  const ms = d.getTime() - weekStart.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

export function ActiviteitChart() {
  const { montages, offertes, taken } = useDashboardData()

  const { data, totals, weekNr } = useMemo(() => {
    const now = new Date()
    const weekStart = startOfWeek(now)
    const days = Array.from({ length: 7 }, () => ({ montages: 0, offertes: 0, taken: 0 }))

    montages.forEach(m => {
      const d = new Date(m.datum)
      const idx = dayIndex(d, weekStart)
      if (idx >= 0 && idx < 7) days[idx].montages += 1
    })
    offertes.forEach(o => {
      if (!o.verstuurd_op) return
      const idx = dayIndex(new Date(o.verstuurd_op), weekStart)
      if (idx >= 0 && idx < 7) days[idx].offertes += 1
    })
    taken.forEach(t => {
      if (t.status !== 'klaar') return
      const idx = dayIndex(new Date(t.updated_at), weekStart)
      if (idx >= 0 && idx < 7) days[idx].taken += 1
    })

    const chartData = days.map((d, i) => ({ dag: DAG_LABELS[i], ...d }))
    const totalsObj = days.reduce(
      (acc, d) => ({
        montages: acc.montages + d.montages,
        offertes: acc.offertes + d.offertes,
        taken: acc.taken + d.taken,
      }),
      { montages: 0, offertes: 0, taken: 0 },
    )
    return { data: chartData, totals: totalsObj, weekNr: isoWeekNumber(now) }
  }, [montages, offertes, taken])

  return (
    <section
      className="rounded-xl bg-white p-6 sm:p-7"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
    >
      <header className="flex items-baseline justify-between gap-4 mb-5">
        <div className="flex items-baseline gap-3 min-w-0">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#5A5A55]">
            Activiteit
          </h2>
          <span
            className="text-[14px] text-[#9B9B95]"
            style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
          >
            — deze week
          </span>
        </div>
        <span className="text-[11px] font-mono uppercase tracking-wider text-[#9B9B95] bg-[#F8F7F5] rounded-md px-2 py-1">
          Week {weekNr}
        </span>
      </header>

      <div className="flex items-center gap-6">
        <div className="flex-1 min-w-0 h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
              <defs>
                {SERIES.map(s => (
                  <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.color} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <XAxis
                dataKey="dag"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9B9B95', fontSize: 11 }}
                dy={6}
              />
              <YAxis hide />
              <Tooltip
                cursor={{ stroke: '#EBEBEB', strokeWidth: 1 }}
                contentStyle={{
                  background: '#FFFFFF',
                  border: '1px solid #EBEBEB',
                  borderRadius: 8,
                  fontSize: 12,
                  padding: '6px 10px',
                }}
                labelStyle={{ color: '#6B6B66', fontWeight: 600, marginBottom: 4 }}
              />
              {SERIES.map(s => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={s.color}
                  strokeWidth={2}
                  fill={`url(#grad-${s.key})`}
                  dot={{ r: 0 }}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col gap-2 w-[120px] flex-shrink-0">
          {SERIES.map(s => (
            <div key={s.key} className="flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-2 text-[#6B6B66]">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label}
              </span>
              <span className="font-mono text-[#1A1A1A] font-semibold">
                {totals[s.key]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
