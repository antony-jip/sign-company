import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useDashboardData } from '@/contexts/DashboardDataContext'
import { cn } from '@/lib/utils'
import type { Taak, MontageAfspraak, CalendarEvent, Klant, Project } from '@/types'

type ItemType = 'montage' | 'taak' | 'event'

interface VandaagItem {
  id: string
  type: ItemType
  typeLabel: string
  tijd: string | null
  sortKey: number
  titel: string
  context: string
  href: string
}

function isToday(dateStr: string | undefined | null): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const today = new Date()
  return d.getFullYear() === today.getFullYear()
    && d.getMonth() === today.getMonth()
    && d.getDate() === today.getDate()
}

function timeFromMontage(m: MontageAfspraak): string | null {
  if (!m.start_tijd) return null
  return m.start_tijd.slice(0, 5)
}

function timeFromEvent(e: CalendarEvent): string | null {
  if (!e.start_datum) return null
  const d = new Date(e.start_datum)
  if (Number.isNaN(d.getTime())) return null
  const hours = String(d.getHours()).padStart(2, '0')
  const mins = String(d.getMinutes()).padStart(2, '0')
  if (hours === '00' && mins === '00') return null
  return `${hours}:${mins}`
}

function sortKeyFromTime(tijd: string | null): number {
  if (!tijd) return 9999
  const [h, m] = tijd.split(':').map(Number)
  return h * 60 + m
}

export function VandaagBlok() {
  const navigate = useNavigate()
  const { taken, montages, events, klanten, projecten } = useDashboardData()

  const items = useMemo<VandaagItem[]>(() => {
    const klantById = new Map<string, Klant>(klanten.map(k => [k.id, k]))
    const projectById = new Map<string, Project>(projecten.map(p => [p.id, p]))

    const montageItems: VandaagItem[] = montages
      .filter(m => isToday(m.datum) && m.status !== 'afgerond')
      .map(m => {
        const tijd = timeFromMontage(m)
        const locatie = m.locatie || m.klant_naam || ''
        return {
          id: `m-${m.id}`,
          type: 'montage' as const,
          typeLabel: 'Montage',
          tijd,
          sortKey: sortKeyFromTime(tijd),
          titel: m.titel || m.project_naam || 'Montage',
          context: locatie,
          href: '/planning',
        }
      })

    const takenItems: VandaagItem[] = taken
      .filter(t => isToday(t.deadline) && t.status !== 'klaar')
      .map(t => {
        const klant = t.klant_id ? klantById.get(t.klant_id) : null
        const project = t.project_id ? projectById.get(t.project_id) : null
        const context = klant?.bedrijfsnaam || project?.naam || ''
        return {
          id: `t-${t.id}`,
          type: 'taak' as const,
          typeLabel: 'Taak',
          tijd: null,
          sortKey: 9999,
          titel: t.titel,
          context,
          href: t.project_id ? `/projecten/${t.project_id}` : '/taken',
        }
      })

    const eventItems: VandaagItem[] = events
      .filter(e => isToday(e.start_datum))
      .map(e => {
        const tijd = timeFromEvent(e)
        return {
          id: `e-${e.id}`,
          type: 'event' as const,
          typeLabel: 'Afspraak',
          tijd,
          sortKey: sortKeyFromTime(tijd),
          titel: e.titel,
          context: e.locatie || '',
          href: '/planning',
        }
      })

    return [...montageItems, ...takenItems, ...eventItems].sort((a, b) => a.sortKey - b.sortKey)
  }, [taken, montages, events, klanten, projecten])

  return (
    <section
      className="rounded-xl bg-white p-6 sm:p-8"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
    >
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#9B9B95] mb-5">
        Vandaag
      </h2>

      {items.length === 0 ? (
        <p className="text-sm text-[#9B9B95] py-2">Niets ingepland voor vandaag.</p>
      ) : (
        <ul className="divide-y divide-[#EBEBEB]">
          {items.map(item => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => navigate(item.href)}
                className="group w-full flex items-center gap-4 py-3 px-2 -mx-2 rounded-lg hover:bg-[#F8F7F5] transition-colors text-left focus-visible:outline-none focus-visible:bg-[#F8F7F5]"
              >
                <span
                  className={cn(
                    'font-mono text-[13px] w-12 flex-shrink-0',
                    item.tijd ? 'text-[#1A1A1A]' : 'text-[#9B9B95]',
                  )}
                >
                  {item.tijd ?? '—'}
                </span>
                <span className="text-[11px] uppercase tracking-wider text-[#9B9B95] w-20 flex-shrink-0">
                  {item.typeLabel}
                </span>
                <span className="flex-1 min-w-0 truncate text-sm text-[#1A1A1A]">
                  {item.titel}
                </span>
                <span className="hidden sm:block text-sm text-[#6B6B66] truncate max-w-[40%]">
                  {item.context}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-[#9B9B95] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 text-right">
        <button
          type="button"
          onClick={() => navigate('/planning')}
          className="text-sm text-[#1A535C] hover:underline focus-visible:outline-none focus-visible:underline"
        >
          Volledige planning →
        </button>
      </div>
    </section>
  )
}
