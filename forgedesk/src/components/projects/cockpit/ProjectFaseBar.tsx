import type { Project } from '@/types'
import { formatAmount } from '@/lib/utils'

const FASES = [
  { key: 'gepland', label: 'Gepland' },
  { key: 'actief', label: 'Actief' },
  { key: 'in-review', label: 'Review' },
  { key: 'te-factureren', label: 'Factureren' },
  { key: 'afgerond', label: 'Afgerond' },
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

  return (
    <div className="rounded-xl bg-[#FFFFFF] shadow-[0_1px_3px_rgba(130,100,60,0.04)] p-6">
      <div className="flex flex-col md:flex-row md:items-center gap-5 md:gap-6">
        {/* Fase-strip */}
        <div className="grid grid-cols-5 gap-2 flex-1 min-w-0">
          {FASES.map((fase, i) => {
            const isActive = i === currentIdx
            const isPast = i < currentIdx

            const barColor = isActive
              ? 'var(--amber)'
              : isPast
                ? 'var(--sage-text)'
                : 'var(--cream-border)'
            const barOpacity = isPast ? 0.45 : 1

            const labelColor = isActive
              ? '#1A1A1A'
              : isPast
                ? 'var(--sage-text)'
                : '#9B9B95'
            const labelOpacity = isPast ? 0.55 : 1

            return (
              <button
                key={fase.key}
                onClick={() => onStatusChange(fase.key as Project['status'])}
                className="group text-left"
                aria-current={isActive ? 'step' : undefined}
              >
                <div
                  className="h-[3px] rounded-full transition-all"
                  style={{ backgroundColor: barColor, opacity: barOpacity }}
                />
                <p
                  className="mt-2 text-[11px] uppercase tracking-[0.06em] truncate transition-colors"
                  style={{ color: labelColor, opacity: labelOpacity, fontWeight: isActive ? 700 : 500 }}
                >
                  {fase.label}
                </p>
              </button>
            )
          })}
        </div>

        {/* Rechter-meta: bedrag + deadline */}
        {hasMeta && (
          <div className="flex items-center gap-4 md:flex-shrink-0 md:border-l md:border-[#EBEBEB] md:pl-6">
            {totaalBedrag !== undefined && totaalBedrag > 0 && (
              <span className="font-mono text-[14px] tabular-nums">
                <span className="text-[#9B9B95]">€</span>
                <span className="text-[#1A1A1A] font-semibold ml-0.5">{formatAmount(totaalBedrag)}</span>
              </span>
            )}
            {totaalBedrag !== undefined && totaalBedrag > 0 && deadlineInfo && (
              <span className="text-[#D4D2CE]">·</span>
            )}
            {deadlineInfo && (
              <span className="flex items-center gap-2 font-mono text-[13px]">
                <span className="text-[#1A1A1A]">{deadlineInfo.label}</span>
                {deadlineInfo.daysLeft !== null && (
                  <span
                    className={deadlineInfo.overdue ? 'text-[var(--coral-text)] font-semibold' : 'text-[#9B9B95]'}
                  >
                    {deadlineInfo.overdue ? `${Math.abs(deadlineInfo.daysLeft)}d over` : `${deadlineInfo.daysLeft}d`}
                  </span>
                )}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
