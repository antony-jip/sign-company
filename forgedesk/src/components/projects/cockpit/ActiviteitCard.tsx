import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import {
  PaperPlaneRight as PhSend,
  Receipt as PhReceipt,
  CreditCard as PhCreditCard,
  ClipboardText as PhClipboard,
  Camera as PhCamera,
  CheckCircle as PhCheckCircle,
  Wrench as PhWrench,
  FolderPlus as PhFolderPlus,
  Pulse as PhPulse,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react'
import type { ActivityEvent } from './ActiviteitFeed'

const STORAGE_KEY = 'doen_activiteit_collapsed'

const typeIcon: Record<ActivityEvent['type'], PhosphorIcon> = {
  project:  PhFolderPlus,
  offerte:  PhReceipt,
  montage:  PhWrench,
  werkbon:  PhClipboard,
  factuur:  PhCreditCard,
  taak:     PhCheckCircle,
  foto:     PhCamera,
  portaal:  PhSend,
}

const typeColor: Record<ActivityEvent['type'], string> = {
  project:  '#1A535C',
  offerte:  '#F15025',
  montage:  '#2D6B48',
  werkbon:  '#C44830',
  factuur:  '#2D6B48',
  taak:     '#5A5A55',
  foto:     '#9A5A48',
  portaal:  'var(--m-portaal)',
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'zojuist'
  if (diffMin < 60) return `${diffMin} min geleden`
  if (diffHour < 24) return `${diffHour} uur geleden`
  if (diffDay < 7) return `${diffDay}d geleden`

  return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
    + ' · '
    + date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

interface ActiviteitCardProps {
  events: ActivityEvent[]
}

const IDLE_LIMIT = 5
const EXPAND_LIMIT = 20

export function ActiviteitCard({ events }: ActiviteitCardProps) {
  const [showAll, setShowAll] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true' } catch { return false }
  })

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    try { localStorage.setItem(STORAGE_KEY, String(next)) } catch {}
  }

  const limit = showAll ? EXPAND_LIMIT : IDLE_LIMIT
  const visible = events.slice(0, limit)
  const hasMore = events.length > IDLE_LIMIT

  if (events.length === 0) {
    return (
      <div className="doen-slate-surface rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="doen-duo-icon" style={{ '--duo-sec': '#1A535C' } as React.CSSProperties}>
            <PhPulse size={16} weight="duotone" />
          </span>
          <h3 className="font-heading text-[15px] font-bold text-foreground">
            Activiteit<span className="text-[#F15025]">.</span>
          </h3>
        </div>
        <p
          className="text-[12px] text-muted-foreground py-3 text-center"
          style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
        >
          nog geen activiteit
        </p>
      </div>
    )
  }

  return (
    <div className="doen-slate-surface rounded-2xl p-5">
      <div
        className={`flex items-center justify-between cursor-pointer select-none group ${collapsed ? '' : 'mb-3'}`}
        onClick={toggleCollapsed}
      >
        <div className="flex items-center gap-2">
          {collapsed
            ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
            : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
          }
          <span className="doen-duo-icon" style={{ '--duo-sec': '#1A535C' } as React.CSSProperties}>
            <PhPulse size={16} weight="duotone" />
          </span>
          <h3 className="font-heading text-[15px] font-bold text-foreground">
            Activiteit<span className="text-[#F15025]">.</span>
          </h3>
          <span className="font-mono text-[10px] font-semibold bg-[rgba(26,83,92,0.08)] text-[#1A535C] rounded-full px-1.5 py-0.5 min-w-[18px] text-center tabular-nums">
            {events.length}
          </span>
        </div>
        {!collapsed && hasMore && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowAll(v => !v) }}
            className="text-[12px] font-medium text-[#1A535C] hover:text-[#0F3D44] hover:underline transition-colors"
          >
            {showAll ? 'Toon minder' : 'Alles bekijken'}
          </button>
        )}
      </div>

      {!collapsed && (
      <div className="-mx-2 relative">
        {/* Verticale timeline-lijn */}
        <span
          aria-hidden
          className="absolute left-[24px] top-3 bottom-3 w-px"
          style={{ background: 'rgba(26,83,92,0.1)' }}
        />
        {visible.map((event) => {
          const Icon = typeIcon[event.type]
          const color = typeColor[event.type]
          return (
            <div
              key={event.id}
              className="relative flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-white/60 transition-colors"
            >
              <div
                className="relative flex-shrink-0 h-[28px] w-[28px] rounded-full flex items-center justify-center mt-0.5 bg-white border z-10"
                style={{ borderColor: `${color}33` }}
              >
                <Icon size={14} weight="duotone" color={color} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-foreground/80 leading-snug">
                  {event.medewerker && event.bron === 'audit' ? (
                    <>
                      <span className="font-semibold text-foreground">{event.medewerker.split(' ')[0]}</span>
                      {' heeft '}
                      <span className="[&_*]:font-mono">{event.tekst}</span>
                    </>
                  ) : event.medewerker ? (
                    <>
                      <span className="font-semibold text-foreground">{event.medewerker.split(' ')[0]}</span>
                      {' '}{event.tekst}
                    </>
                  ) : (
                    event.tekst
                  )}
                </p>
                <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                  {formatRelativeTime(event.datum)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}
