import { motion } from 'framer-motion'
import { Calendar, Hammer, Eye, Receipt, Flag, Check } from 'lucide-react'
import type { Project } from '@/types'
import { formatAmount, cn } from '@/lib/utils'
import { CalendarBlank as PhCalendar } from '@phosphor-icons/react'

const FASES = [
  { key: 'gepland',        label: 'Gepland',        color: '#3A5A9A', Icon: Calendar },
  { key: 'actief',         label: 'Actief',         color: '#1A535C', Icon: Hammer   },
  { key: 'in-review',      label: 'Review',         color: '#9A5A48', Icon: Eye      },
  { key: 'te-factureren',  label: 'Te factureren',  color: '#F15025', Icon: Receipt  },
  { key: 'afgerond',       label: 'Afgerond',       color: '#2D6B48', Icon: Flag     },
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
      <div className="flex items-baseline justify-between mb-5">
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

      <div className="flex flex-col md:flex-row md:items-end gap-6">
        {/* Stepper — orbs + connectoren */}
        <div className="flex items-start flex-1 min-w-0">
          {FASES.map((fase, i) => {
            const isActive = i === currentIdx
            const isPast = i < currentIdx
            const isFuture = i > currentIdx
            const FaseIcon = fase.Icon
            const isLast = i === FASES.length - 1

            const orbBg = isActive
              ? fase.color
              : isPast
                ? '#2D6B48'
                : 'rgba(26,83,92,0.06)'
            const orbBorder = isActive
              ? fase.color
              : isPast
                ? '#2D6B48'
                : 'rgba(26,83,92,0.15)'
            const iconColor = isFuture ? '#9B9B95' : '#FFFFFF'

            return (
              <div key={fase.key} className="flex items-start flex-1 last:flex-initial min-w-0">
                {/* Orb-button */}
                <motion.button
                  type="button"
                  onClick={() => onStatusChange(fase.key as Project['status'])}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07, type: 'spring', stiffness: 240, damping: 22 }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.94 }}
                  className="group flex flex-col items-center gap-2 flex-shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[#1A535C]/40 rounded-xl"
                  aria-current={isActive ? 'step' : undefined}
                  title={`Naar fase: ${fase.label}`}
                >
                  <motion.div
                    className={cn(
                      'relative w-11 h-11 rounded-full flex items-center justify-center',
                      'transition-[background-color,border-color,box-shadow] duration-300',
                    )}
                    style={{
                      backgroundColor: orbBg,
                      borderWidth: 2,
                      borderStyle: 'solid',
                      borderColor: orbBorder,
                      boxShadow: isActive ? `0 0 0 4px ${fase.color}1A, 0 4px 14px ${fase.color}33` : undefined,
                    }}
                    animate={isActive ? {
                      boxShadow: [
                        `0 0 0 0 ${fase.color}55, 0 4px 14px ${fase.color}33`,
                        `0 0 0 10px ${fase.color}00, 0 4px 14px ${fase.color}33`,
                      ],
                    } : undefined}
                    transition={isActive ? { repeat: Infinity, duration: 1.8, ease: 'easeOut' } : undefined}
                    whileHover={{ scale: 1.08 }}
                  >
                    {isPast ? (
                      <motion.span
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: i * 0.07 + 0.12, type: 'spring', stiffness: 320, damping: 18 }}
                        className="flex items-center justify-center"
                      >
                        <Check className="h-5 w-5" style={{ color: iconColor }} strokeWidth={3} />
                      </motion.span>
                    ) : (
                      <FaseIcon
                        className={cn('h-[18px] w-[18px]', isFuture && 'opacity-70')}
                        style={{ color: iconColor }}
                        strokeWidth={isActive ? 2.4 : 2}
                      />
                    )}
                    {/* Index-pip rechtsboven voor toegankelijkheid */}
                    <span
                      className={cn(
                        'absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center font-mono tabular-nums',
                        isActive
                          ? 'bg-white text-[#1A1A1A] shadow-sm'
                          : isPast
                            ? 'bg-white text-[#2D6B48] shadow-sm'
                            : 'bg-[#F0EFEC] text-[#9B9B95]',
                      )}
                      aria-hidden
                    >
                      {i + 1}
                    </span>
                  </motion.div>
                  <span
                    className={cn(
                      'text-[11px] uppercase tracking-[0.08em] transition-colors duration-200 max-w-[80px] text-center leading-tight',
                      isActive
                        ? 'text-[#1A1A1A] font-bold'
                        : isPast
                          ? 'text-[#6B6B66] font-medium group-hover:text-[#1A1A1A]'
                          : 'text-[#9B9B95] font-medium group-hover:text-[#6B6B66]',
                    )}
                  >
                    {fase.label}
                  </span>
                </motion.button>

                {/* Connector tussen orbs (niet na de laatste) */}
                {!isLast && (
                  <div className="flex-1 mt-[21px] mx-2 h-[3px] rounded-full bg-[rgba(26,83,92,0.08)] relative overflow-hidden">
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: isPast ? 1 : 0 }}
                      transition={{
                        delay: i * 0.07 + 0.15,
                        duration: 0.55,
                        ease: [0.65, 0, 0.35, 1],
                      }}
                      style={{
                        transformOrigin: 'left center',
                        background: 'linear-gradient(90deg, #2D6B48 0%, #2D6B48 100%)',
                      }}
                      className="absolute inset-0 rounded-full"
                    />
                  </div>
                )}
              </div>
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
