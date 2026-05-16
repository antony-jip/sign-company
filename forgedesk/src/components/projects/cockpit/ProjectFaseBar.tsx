import type { Project } from '@/types'
import { formatAmount } from '@/lib/utils'
import { CalendarBlank as PhCalendar } from '@phosphor-icons/react'

const FASES = [
  { key: 'gepland',        label: 'Gepland',        color: '#3A5A9A' },
  { key: 'actief',         label: 'Actief',         color: '#1A535C' },
  { key: 'in-review',      label: 'Review',         color: '#9A5A48' },
  { key: 'te-factureren',  label: 'Te factureren',  color: '#F15025' },
  { key: 'afgerond',       label: 'Afgerond',       color: '#2D6B48' },
] as const

function faseIndex(status: string): number {
  const idx = FASES.findIndex(f => f.key === status)
  if (idx >= 0) return idx
  if (status === 'te-plannen') return 0
  if (status === 'on-hold') return 1
  if (status === 'gefactureerd') return 4
  return 1
}

function formatDeadline(deadline: string): { label: string; daysLeft: number | null; overdue: boolean } {
  const d = new Date(deadline)
  if (isNaN(d.getTime())) return { label: '—', daysLeft: null, overdue: false }
  const label = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' }).format(d)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  const daysLeft = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return { label, daysLeft, overdue: daysLeft < 0 }
}

interface ProjectFaseBarProps {
  status: Project['status']
  onStatusChange: (status: Project['status']) => void
  totaalBedrag?: number
  deadline?: string | null
}

export function ProjectFaseBar({ status, onStatusChange, totaalBedrag, deadline }: ProjectFaseBarProps) {
  const currentIdx = faseIndex(status)
  const hasMeta = (totaalBedrag !== undefined && totaalBedrag > 0) || !!deadline
  const deadlineInfo = deadline ? formatDeadline(deadline) : null
  const currentFase = FASES[currentIdx] ?? FASES[0]

  return (
    <div className="doen-slate-surface rounded-2xl p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-heading text-[15px] font-bold text-[#1A1A1A]">
          Voortgang<span className="text-[#F15025]">.</span>
        </h3>
        <span
          className="text-[12px] text-[#9B9B95]"
          style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
        >
          fase {currentIdx + 1} van {FASES.length} · {currentFase.label.toLowerCase()}
        </span>
      </div>

      <div className="flex flex-col md:flex-row md:items-end gap-5 md:gap-6">
        {/* Fase-strip — segmented stappenbalk */}
        <div className="grid grid-cols-5 gap-2 flex-1 min-w-0">
          {FASES.map((fase, i) => {
            const isActive = i === currentIdx
            const isPast = i < currentIdx

            const barColor = isActive
              ? fase.color
              : isPast
                ? '#2D6B48'
                : 'rgba(26,83,92,0.12)'
            const barOpacity = isPast ? 0.55 : 1

            const labelColor = isActive
              ? '#1A1A1A'
              : isPast
                ? '#6B6B66'
                : '#9B9B95'
            const labelWeight = isActive ? 700 : isPast ? 500 : 500

            return (
              <button
                key={fase.key}
                onClick={() => onStatusChange(fase.key as Project['status'])}
                className={
                  'group relative text-left px-3 py-2 rounded-lg border transition-all duration-150 ' +
                  'hover:-translate-y-[1px] hover:shadow-[0_2px_8px_rgba(20,62,71,0.08)] ' +
                  (isActive
                    ? 'bg-white border-[rgba(26,83,92,0.22)] shadow-[0_1px_3px_rgba(20,62,71,0.06)]'
                    : isPast
                      ? 'bg-[#2D6B48]/[0.03] border-[rgba(45,107,72,0.18)] hover:border-[rgba(45,107,72,0.32)] hover:bg-[#2D6B48]/[0.06]'
                      : 'bg-white/60 border-[rgba(26,83,92,0.10)] hover:border-[rgba(26,83,92,0.22)] hover:bg-white')
                }
                aria-current={isActive ? 'step' : undefined}
                title={`Naar fase: ${fase.label}`}
              >
                <div
                  className="h-[4px] rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: barColor,
                    opacity: barOpacity,
                    boxShadow: isActive ? `0 0 8px ${fase.color}55` : undefined,
                  }}
                />
                <div className="mt-2 flex items-center gap-1.5">
                  {isActive && (
                    <span
                      aria-hidden
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0 doen-pulse"
                      style={{ backgroundColor: fase.color }}
                    />
                  )}
                  <p
                    className="text-[11px] uppercase tracking-[0.08em] truncate transition-colors"
                    style={{ color: labelColor, fontWeight: labelWeight }}
                  >
                    {fase.label}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Rechter-meta: bedrag + deadline */}
        {hasMeta && (
          <div className="flex items-center gap-4 md:flex-shrink-0 md:border-l md:border-[rgba(26,83,92,0.1)] md:pl-6 pt-3 md:pt-0 border-t md:border-t-0 border-[rgba(26,83,92,0.08)]">
            {totaalBedrag !== undefined && totaalBedrag > 0 && (
              <div className="flex flex-col gap-0.5">
                <span
                  className="text-[10px] uppercase tracking-widest text-[#9B9B95] font-semibold"
                >
                  Bedrag
                </span>
                <span className="font-mono text-[15px] tabular-nums font-bold text-[#1A1A1A]">
                  €{formatAmount(totaalBedrag)}
                </span>
              </div>
            )}
            {deadlineInfo && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase tracking-widest text-[#9B9B95] font-semibold">
                  Deadline
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[13px] font-semibold">
                  <span className="doen-duo-icon" style={{ '--duo-sec': deadlineInfo.overdue ? '#C03A18' : '#1A535C' } as React.CSSProperties}>
                    <PhCalendar size={13} weight="duotone" />
                  </span>
                  <span className="text-[#1A1A1A]">{deadlineInfo.label}</span>
                  {deadlineInfo.daysLeft !== null && (
                    <span
                      className={deadlineInfo.overdue ? 'text-[#C03A18] font-bold' : 'text-[#9B9B95] font-normal'}
                    >
                      {deadlineInfo.overdue ? `${Math.abs(deadlineInfo.daysLeft)}d over` : `${deadlineInfo.daysLeft}d`}
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
