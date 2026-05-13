import { useState } from 'react'
import {
  Send, Receipt, CreditCard, ClipboardCheck, Camera,
  CheckCircle2, Wrench, FolderPlus, ChevronDown, ChevronRight,
} from 'lucide-react'
import type { ActivityEvent } from './ActiviteitFeed'

const STORAGE_KEY = 'doen_activiteit_collapsed'

type Icon = typeof Send

const typeIcon: Record<ActivityEvent['type'], Icon> = {
  project:  FolderPlus,
  offerte:  Receipt,
  montage:  Wrench,
  werkbon:  ClipboardCheck,
  factuur:  CreditCard,
  taak:     CheckCircle2,
  foto:     Camera,
  portaal:  Send,
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
      <div className="rounded-xl bg-[#FFFFFF] shadow-[0_1px_3px_rgba(130,100,60,0.04)] p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-semibold text-[#6B6B66] uppercase tracking-[0.08em]">Activiteit</h3>
        </div>
        <p className="text-[12px] text-[#9B9B95] py-4 text-center">Nog geen activiteit</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-[#FFFFFF] shadow-[0_1px_3px_rgba(130,100,60,0.04)] p-6">
      <div
        className={`flex items-center justify-between cursor-pointer select-none group ${collapsed ? '' : 'mb-3'}`}
        onClick={toggleCollapsed}
      >
        <div className="flex items-center gap-2">
          {collapsed
            ? <ChevronRight className="h-3.5 w-3.5 text-[#9B9B95] group-hover:text-[#1A1A1A] transition-colors" />
            : <ChevronDown className="h-3.5 w-3.5 text-[#9B9B95] group-hover:text-[#1A1A1A] transition-colors" />
          }
          <h3 className="text-[11px] font-semibold text-[#6B6B66] uppercase tracking-[0.08em]">Activiteit</h3>
          <span className="font-mono text-[10px] font-medium bg-[var(--cream-bg)] text-[var(--cream-text)] rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
            {events.length}
          </span>
        </div>
        {!collapsed && hasMore && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowAll(v => !v) }}
            className="text-[12px] text-[#6B6B66] hover:text-[#1A1A1A] transition-colors"
          >
            {showAll ? 'Toon minder' : 'Alles bekijken'}
          </button>
        )}
      </div>

      {!collapsed && (
      <div className="-mx-2">
        {visible.map((event) => {
          const Icon = typeIcon[event.type]
          const color = typeColor[event.type]
          return (
            <div
              key={event.id}
              className="flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-[var(--cream-bg)] transition-colors"
            >
              <div
                className="flex-shrink-0 h-[26px] w-[26px] rounded-full flex items-center justify-center mt-0.5"
                style={{ background: 'var(--cream-bg)' }}
              >
                <Icon className="h-3 w-3" style={{ color }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-[#4A4A46] leading-snug">
                  {event.medewerker && event.bron === 'audit' ? (
                    <>
                      <span className="font-semibold text-[#1A1A1A]">{event.medewerker.split(' ')[0]}</span>
                      {' heeft '}
                      <span className="[&_*]:font-mono">{event.tekst}</span>
                    </>
                  ) : event.medewerker ? (
                    <>
                      <span className="font-semibold text-[#1A1A1A]">{event.medewerker.split(' ')[0]}</span>
                      {' '}{event.tekst}
                    </>
                  ) : (
                    event.tekst
                  )}
                </p>
                <p className="font-mono text-[11px] text-[#9B9B95] mt-0.5">
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
