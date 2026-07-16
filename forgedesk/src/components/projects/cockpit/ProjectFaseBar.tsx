import { motion } from 'framer-motion'
import { Calendar, Hammer, Eye, Receipt, CalendarCheck, CheckCircle2 } from 'lucide-react'
import type { Project } from '@/types'
import { formatAmount, cn } from '@/lib/utils'

const FASES = [
  { key: 'gepland',        label: 'Gepland',        caption: 'klaar om te starten',    Icon: Calendar     },
  { key: 'in-review',      label: 'In review',      caption: 'offerte gestuurd',       Icon: Eye          },
  { key: 'akkoord-klant',  label: 'Akkoord klant',  caption: 'klant akkoord, te plannen', Icon: CheckCircle2 },
  { key: 'actief',         label: 'Actief',         caption: 'aan het werk',           Icon: Hammer       },
  { key: 'ingepland',      label: 'Ingepland',      caption: 'montage ingepland',      Icon: CalendarCheck },
  { key: 'te-factureren',  label: 'Te factureren',  caption: 'klaar voor de factuur',  Icon: Receipt       },
] as const

function faseIndex(status: string): number {
  const idx = FASES.findIndex(f => f.key === status)
  if (idx >= 0) return idx
  if (status === 'te-plannen') return 0
  if (status === 'on-hold') return 3
  // 'afgerond' en 'gefactureerd' vallen samen op de laatste (Te factureren-)stap
  if (status === 'afgerond') return FASES.length - 1
  if (status === 'gefactureerd') return FASES.length - 1
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

const PETROL = '#1A535C'
const FLAME = '#F15025'

export function ProjectFaseBar({ status, onStatusChange, totaalBedrag, deadline }: ProjectFaseBarProps) {
  const currentIdx = faseIndex(status)
  const hasMeta = (totaalBedrag !== undefined && totaalBedrag > 0) || !!deadline
  const deadlineInfo = deadline ? formatDeadline(deadline) : null
  const currentFase = FASES[currentIdx] ?? FASES[0]
  const isCompleted = currentIdx === FASES.length - 1

  return (
    <div className="doen-slate-surface rounded-2xl p-5">
      <div className="flex items-baseline justify-between mb-6">
        <h3 className="font-heading text-[15px] font-bold text-foreground">
          Voortgang<span className="text-flame">.</span>
        </h3>
        <span
          className="text-[12px] text-muted-foreground"
          style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
        >
          fase {currentIdx + 1} van {FASES.length} · {currentFase.caption}
        </span>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-end gap-8">
        {/* Stepper in doen.team-stijl: outlined cirkels + connector-lijnen + Flame-dot labels */}
        <div className="flex items-start flex-1 min-w-0 pt-1 pb-2">
          {FASES.map((fase, i) => {
            const isActive = i === currentIdx
            const isPast = i < currentIdx
            const isFuture = i > currentIdx
            const FaseIcon = fase.Icon
            const isLast = i === FASES.length - 1
            // Connector tussen i en i+1: solid wanneer beide gepasseerd; dashed
            // vanaf actief-segment naar future
            const connectorSolid = i < currentIdx
            const connectorActive = i === currentIdx - 1 || (isActive && !isLast)

            // Speciale staat: laatste cirkel is een gevulde "celebrate"-orb zodra
            // hij bereikt is · past bij doen.team's "Gedaan."-marker.
            const isFinalCompleted = isLast && (isPast || isActive)

            // Stijl-vars per cirkel
            const circleBg = isFinalCompleted
              ? '#0F3C44'                 // donker Petrol "celebrate"
              : isPast
                ? PETROL                  // solid Petrol
                : 'hsl(var(--card))'      // outline-only · blend met surface in beide themes
            const circleBorder = isFinalCompleted
              ? '#0F3C44'
              : isActive
                ? PETROL
                : isPast
                  ? PETROL
                  : 'var(--fase-ring)'
            const iconColor = isFinalCompleted
              ? '#FFFFFF'
              : isPast
                ? '#FFFFFF'
                : isActive
                  ? PETROL
                  : 'var(--fase-icon)'

            return (
              <div key={fase.key} className="flex items-start flex-1 last:flex-initial min-w-0">
                {/* Fase-blok: cirkel + label + caption */}
                <motion.button
                  type="button"
                  onClick={() => onStatusChange(fase.key as Project['status'])}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
                  className="group relative flex flex-col items-center gap-2.5 flex-shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-petrol/30 rounded-xl"
                  aria-current={isActive ? 'step' : undefined}
                  title={`Naar fase: ${fase.label}`}
                >
                  {/* Sparkles rondom de eindfase wanneer voltooid */}
                  {isFinalCompleted && (
                    <>
                      <Sparkle delay={0.2} top="-6px" left="-10px" />
                      <Sparkle delay={0.35} top="4px" left="58px" />
                      <Sparkle delay={0.5} top="42px" left="-8px" small />
                    </>
                  )}

                  <motion.div
                    className="relative w-12 h-12 rounded-full flex items-center justify-center transition-[background,border-color,box-shadow] duration-300"
                    style={{
                      backgroundColor: circleBg,
                      borderWidth: 2,
                      borderStyle: 'solid',
                      borderColor: circleBorder,
                      boxShadow: isActive
                        ? `0 0 0 4px ${FLAME}1A`
                        : isFinalCompleted
                          ? '0 4px 14px rgba(15,60,68,0.22)'
                          : undefined,
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    <FaseIcon
                      className="h-5 w-5"
                      style={{ color: iconColor }}
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />
                    {/* Flame-dot rechtsonder voor de huidige fase */}
                    {isActive && (
                      <motion.span
                        aria-hidden
                        className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white"
                        style={{ background: FLAME }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.25, type: 'spring', stiffness: 360, damping: 20 }}
                      />
                    )}
                  </motion.div>

                  {/* Label · heading-style met Flame-dot. De beschrijvende caption
                      staat nu één keer in de header (actieve fase), zodat de rij
                      rustig en strak blijft: enkel cirkel + label. */}
                  <div className="flex flex-col items-center leading-none">
                    <span
                      className={cn(
                        'font-heading font-bold text-[13px] tracking-[-0.01em] transition-colors duration-200',
                        isActive ? 'text-foreground' : isPast || isFinalCompleted ? 'text-petrol dark:text-[#5FA8B5]' : 'text-[var(--fase-label)] group-hover:text-foreground',
                      )}
                    >
                      {fase.label}<span className="text-flame">.</span>
                    </span>
                  </div>
                </motion.button>

                {/* Connector · solid past, dashed future, Flame-overgang bij actief */}
                {!isLast && (
                  <div className="flex-1 mt-[23px] mx-3 relative">
                    {/* Achtergrondlijn · dashed pattern voor "nog niet bereikt" */}
                    <div
                      className="absolute inset-x-0 top-0 h-px"
                      style={{
                        backgroundImage: `linear-gradient(90deg, var(--fase-line) 50%, transparent 50%)`,
                        backgroundSize: '8px 1px',
                        backgroundRepeat: 'repeat-x',
                      }}
                    />
                    {/* Solid vulling die meegroeit voor bereikte segmenten */}
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: connectorSolid ? 1 : 0 }}
                      transition={{ delay: i * 0.06 + 0.18, duration: 0.55, ease: [0.65, 0, 0.35, 1] }}
                      className="absolute inset-x-0 top-0 h-px"
                      style={{
                        transformOrigin: 'left center',
                        background: PETROL,
                      }}
                    />
                    {/* Flame-puntje aan het einde van het bereikte stuk (= voor de huidige fase) */}
                    {connectorActive && (
                      <motion.span
                        aria-hidden
                        className="absolute -top-[2px] right-0 w-1 h-[5px] rounded-full"
                        style={{ background: FLAME }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.06 + 0.5 }}
                      />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Rechter-meta: bedrag + deadline */}
        {hasMeta && (
          <div className="flex items-center gap-4 lg:flex-shrink-0 lg:border-l lg:border-[rgba(26,83,92,0.1)] lg:pl-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-[rgba(26,83,92,0.08)]">
            {totaalBedrag !== undefined && totaalBedrag > 0 && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                  Bedrag
                </span>
                <span className="font-mono text-[15px] tabular-nums font-bold text-foreground">
                  €{formatAmount(totaalBedrag)}
                </span>
              </div>
            )}
            {deadlineInfo && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                  Deadline
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[13px] font-semibold">
                  <Calendar
                    className="h-3.5 w-3.5"
                    strokeWidth={1.75}
                    style={{ color: deadlineInfo.overdue ? '#C03A18' : '#1A535C' }}
                  />
                  <span className="text-foreground">{deadlineInfo.label}</span>
                  {deadlineInfo.daysLeft !== null && (
                    <span
                      className={deadlineInfo.overdue ? 'text-[#C03A18] font-bold' : 'text-muted-foreground font-normal'}
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

// Kleine Flame-sparkle die rondom de eind-orb verschijnt zodra die bereikt is
function Sparkle({ delay, top, left, small }: { delay: number; top: string; left: string; small?: boolean }) {
  const size = small ? 6 : 9
  return (
    <motion.svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 12 12"
      className="absolute pointer-events-none"
      style={{ top, left }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
    >
      <path
        d="M6 0L7.2 4.8L12 6L7.2 7.2L6 12L4.8 7.2L0 6L4.8 4.8L6 0Z"
        fill="#F15025"
      />
    </motion.svg>
  )
}
