import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Wrench, CheckSquare, CalendarDays, type LucideIcon } from 'lucide-react'
import { useDashboardData } from '@/contexts/DashboardDataContext'
import { getAvatarStyle } from '@/utils/medewerkerAvatar'
import { cn } from '@/lib/utils'
import type { Taak, MontageAfspraak, CalendarEvent, Klant, Project, Medewerker } from '@/types'

type ItemType = 'montage' | 'taak' | 'event'

interface TypeStyle {
  icon: LucideIcon
  iconColor: string
  bg: string
}

const TYPE_STYLES: Record<ItemType, TypeStyle> = {
  montage: { icon: Wrench, iconColor: '#F15025', bg: '#FDE8E4' },
  taak: { icon: CheckSquare, iconColor: '#1A535C', bg: 'rgba(26,83,92,0.08)' },
  event: { icon: CalendarDays, iconColor: '#8A7A4A', bg: '#F5F2E8' },
}

const TYPE_LABEL: Record<ItemType, string> = {
  montage: 'Montage',
  taak: 'Taak',
  event: 'Afspraak',
}

interface VandaagItem {
  id: string
  type: ItemType
  tijd: string | null
  sortKey: number
  titel: string
  context: string
  toegewezenAan: Medewerker | null
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

function findMedewerker(idOrName: string | undefined | null, medewerkers: Medewerker[]): Medewerker | null {
  if (!idOrName) return null
  return medewerkers.find(m => m.id === idOrName || m.naam === idOrName) ?? null
}

function initialen(naam: string): string {
  return naam.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0] ?? '').join('').toUpperCase()
}

function Avatar({ medewerker, medewerkers }: { medewerker: Medewerker; medewerkers: Medewerker[] }) {
  const idx = medewerkers.findIndex(m => m.id === medewerker.id)
  const style = getAvatarStyle(idx >= 0 ? idx : 0)
  return (
    <span
      className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full text-[10px] font-semibold flex-shrink-0"
      style={{ backgroundColor: style.backgroundColor, color: style.color }}
      title={medewerker.naam}
    >
      {initialen(medewerker.naam)}
    </span>
  )
}

export function VandaagBlok() {
  const navigate = useNavigate()
  const { taken, montages, events, klanten, projecten, medewerkers } = useDashboardData()

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
          tijd,
          sortKey: sortKeyFromTime(tijd),
          titel: m.titel || m.project_naam || 'Montage',
          context: locatie,
          toegewezenAan: findMedewerker(m.monteurs?.[0], medewerkers),
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
          tijd: null,
          sortKey: 9999,
          titel: t.titel,
          context,
          toegewezenAan: findMedewerker(t.toegewezen_aan, medewerkers),
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
          tijd,
          sortKey: sortKeyFromTime(tijd),
          titel: e.titel,
          context: e.locatie || '',
          toegewezenAan: findMedewerker(e.deelnemers?.[0], medewerkers),
          href: '/planning',
        }
      })

    return [...montageItems, ...takenItems, ...eventItems].sort((a, b) => a.sortKey - b.sortKey)
  }, [taken, montages, events, klanten, projecten, medewerkers])

  const counts = useMemo(() => {
    const m = items.filter(i => i.type === 'montage').length
    const t = items.filter(i => i.type === 'taak').length
    const e = items.filter(i => i.type === 'event').length
    const parts: string[] = []
    if (m) parts.push(`${m} ${m === 1 ? 'montage' : 'montages'}`)
    if (t) parts.push(`${t} ${t === 1 ? 'taak' : 'taken'}`)
    if (e) parts.push(`${e} ${e === 1 ? 'afspraak' : 'afspraken'}`)
    return parts.join(' · ')
  }, [items])

  return (
    <section
      className="rounded-xl bg-white p-6 sm:p-8"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
    >
      <header className="flex items-baseline justify-between gap-4 mb-5">
        <div className="flex items-baseline gap-3 min-w-0">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#5A5A55]">
            Vandaag
          </h2>
          <span
            className="text-[14px] text-[#9B9B95] truncate"
            style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
          >
            — wat staat er klaar
          </span>
        </div>
        {counts && (
          <span className="font-mono text-[12px] text-[#9B9B95] flex-shrink-0">
            {counts}
          </span>
        )}
      </header>

      {items.length === 0 ? (
        <p className="text-sm text-[#9B9B95] py-2">Niets ingepland voor vandaag.</p>
      ) : (
        <ul className="divide-y divide-[#EBEBEB]">
          {items.map(item => {
            const typeStyle = TYPE_STYLES[item.type]
            const TypeIcon = typeStyle.icon
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => navigate(item.href)}
                  className="group w-full flex items-center gap-3 sm:gap-4 py-3 px-2 -mx-2 rounded-lg hover:bg-[#F8F7F5] transition-colors text-left focus-visible:outline-none focus-visible:bg-[#F8F7F5]"
                >
                  <span
                    className="inline-flex items-center justify-center w-[30px] h-[30px] flex-shrink-0"
                    style={{ backgroundColor: typeStyle.bg, borderRadius: 9 }}
                    aria-hidden
                  >
                    <TypeIcon className="h-4 w-4" style={{ color: typeStyle.iconColor }} />
                  </span>
                  <span
                    className={cn(
                      'font-mono text-[13px] w-12 flex-shrink-0',
                      item.tijd ? 'text-[#1A1A1A]' : 'text-[#9B9B95]',
                    )}
                  >
                    {item.tijd ?? '—'}
                  </span>
                  <span className="hidden md:inline text-[11px] uppercase tracking-wider text-[#9B9B95] w-20 flex-shrink-0">
                    {TYPE_LABEL[item.type]}
                  </span>
                  <span className="flex-1 min-w-0 truncate text-sm text-[#1A1A1A]">
                    {item.titel}
                  </span>
                  <span className="hidden sm:block text-sm text-[#6B6B66] truncate max-w-[30%]">
                    {item.context}
                  </span>
                  <span className="w-[22px] flex-shrink-0 flex justify-center">
                    {item.toegewezenAan && (
                      <Avatar medewerker={item.toegewezenAan} medewerkers={medewerkers} />
                    )}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-[#9B9B95] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </button>
              </li>
            )
          })}
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
